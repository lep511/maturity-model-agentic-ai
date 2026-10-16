#!/usr/bin/env python3
"""Build the assessment content from the AWS Well-Architected Agentic AI Lens docs.

Fetches the markdown rendering of every Lens page (same URL as the HTML page,
with a ``.md`` suffix), parses it, and emits:

* ``data/<pillar-slug>/<bp-id>.json``  one compact item per best practice (150)
* ``data/lens/focus_areas.json``       the 41 focus areas with their maturity tables
* ``data/lens/lens.json``              lens-level metadata (principles, roadmap, definitions)
* ``data/manifest.json``               index consumed by ``js/app.js``
* ``guidance/<pillar-slug>/<bp-id>.md`` condensed implementation guidance per practice

Standard library only (Python 3.9+). Raw pages are cached under ``.cache/lens-docs``.

Usage:
    python3 -I tools/build_lens_content.py [--sleep 0.5] [--refresh] [--full]
                                           [--clean] [--allow-count-drift]
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DOC_ROOT = "https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens"
CUSTOM_LENS_JSON_URL = (
    "https://github.com/aws-samples/sample-well-architected-custom-lens/"
    "blob/main/agentic-ai-lens/agentic-ai-lens.json"
)
LENS_TITLE = "AWS Well-Architected Framework - Agentic AI Lens"
USER_AGENT = "agentic-ai-lens-self-assessment/1.0 (content build script; stdlib urllib)"

REPO_ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = REPO_ROOT / ".cache" / "lens-docs"
DATA_DIR = REPO_ROOT / "data"          # default output locations; main() honours --out
LENS_DIR = DATA_DIR / "lens"
GUIDANCE_DIR = REPO_ROOT / "guidance"

# Canonical pillar list in Lens order. ``name`` matches the Appendix A headings.
PILLARS = [
    {"name": "Operational excellence", "slug": "operational-excellence", "prefix": "AGENTOPS", "short": "OpEx", "abbr": "OPS"},
    {"name": "Security", "slug": "security", "prefix": "AGENTSEC", "short": "Security", "abbr": "SEC"},
    {"name": "Reliability", "slug": "reliability", "prefix": "AGENTREL", "short": "Reliability", "abbr": "REL"},
    {"name": "Performance efficiency", "slug": "performance-efficiency", "prefix": "AGENTPERF", "short": "Performance", "abbr": "PERF"},
    {"name": "Cost optimization", "slug": "cost-optimization", "prefix": "AGENTCOST", "short": "Cost", "abbr": "COST"},
    {"name": "Sustainability", "slug": "sustainability", "prefix": "AGENTSUS", "short": "Sustainability", "abbr": "SUS"},
]
PILLAR_BY_NAME = {p["name"].lower(): p for p in PILLARS}

ROADMAP_IDS = {
    "Building your first agent": "first-agent",
    "Moving to production": "production",
    "Scaling to multi-agent systems": "multi-agent",
    "Hardening an existing deployment": "hardening",
}

EXPECTED = {"pillars": 6, "questions": 41, "best_practices": 150, "High": 90, "Medium": 59, "Low": 1}

ITEM_BUDGET_BYTES = 2400       # CI fails above 2500 characters; keep headroom
GUIDANCE_SUMMARY_LIMIT = 600   # characters for the item ``guidance`` field

ANCHOR_RE = re.compile(r"^<a name=\"[^\"]*\"></a>$")
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
BULLET_RE = re.compile(r"^\+\s+(.*)$")
NUMBERED_RE = re.compile(r"^\d+\.\s+(.*)$")

WARNINGS: list[str] = []


def warn(msg: str) -> None:
    WARNINGS.append(msg)
    print(f"  [warn] {msg}", file=sys.stderr)


# ──────────────────────────────────────────────────────────────────────────────
# Fetching
# ──────────────────────────────────────────────────────────────────────────────
class Fetcher:
    def __init__(self, sleep: float, refresh: bool):
        self.sleep = sleep
        self.refresh = refresh
        self.requests = 0
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

    def get(self, slug: str) -> str:
        cached = CACHE_DIR / f"{slug}.md"
        if cached.exists() and not self.refresh:
            return cached.read_text(encoding="utf-8")
        url = f"{DOC_ROOT}/{slug}.md"
        last_err: Exception | None = None
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/markdown"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    text = resp.read().decode("utf-8")
                self.requests += 1
                cached.write_text(text, encoding="utf-8")
                time.sleep(self.sleep)
                return text
            except urllib.error.HTTPError as e:  # pragma: no cover - network
                last_err = e
                if e.code in (429, 500, 502, 503, 504):
                    time.sleep(2 * (attempt + 1))
                    continue
                raise
            except urllib.error.URLError as e:  # pragma: no cover - network
                last_err = e
                time.sleep(2 * (attempt + 1))
        raise RuntimeError(f"Failed to fetch {url}: {last_err}")


# ──────────────────────────────────────────────────────────────────────────────
# Markdown helpers
# ──────────────────────────────────────────────────────────────────────────────
def clean_lines(md: str) -> list[str]:
    """Strip whitespace and drop the ``<a name>`` anchor lines the docs interleave."""
    out = []
    for raw in md.splitlines():
        line = raw.strip()
        if ANCHOR_RE.match(line):
            continue
        out.append(line)
    return out


def find_line(lines: list[str], pattern: str, start: int = 0, end: int | None = None) -> int:
    rx = re.compile(pattern)
    end = len(lines) if end is None else end
    for i in range(start, end):
        if rx.match(lines[i]):
            return i
    return -1


def collect_bullets(lines: list[str], start: int, end: int) -> list[str]:
    """Return ``+`` bullets in ``lines[start:end]``; continuation lines are appended."""
    items: list[str] = []
    current: str | None = None
    for line in lines[start:end]:
        if not line:
            if current is not None:
                items.append(current)
                current = None
            continue
        m = BULLET_RE.match(line)
        if m:
            if current is not None:
                items.append(current)
            current = m.group(1).strip()
        elif current is not None and not line.startswith(("#", "|", "```", "**")):
            current += " " + line
    if current is not None:
        items.append(current)
    return [i for i in (s.strip() for s in items) if i]


def collect_paragraphs(lines: list[str], start: int, end: int, skip_code: bool = True) -> list[str]:
    """Join consecutive prose lines into paragraphs; skips bullets, tables, headings."""
    paras: list[str] = []
    buf: list[str] = []
    in_code = False
    for line in lines[start:end]:
        if line.startswith("```"):
            in_code = not in_code
            if buf:
                paras.append(" ".join(buf))
                buf = []
            continue
        if in_code and skip_code:
            continue
        if not line or line.startswith(("+ ", "|", "#", "**Topics**")) or NUMBERED_RE.match(line):
            if buf:
                paras.append(" ".join(buf))
                buf = []
            continue
        buf.append(line)
    if buf:
        paras.append(" ".join(buf))
    return [p.strip() for p in paras if p.strip()]


def collect_numbered(lines: list[str], start: int, end: int) -> list[str]:
    items: list[str] = []
    current: str | None = None
    for line in lines[start:end]:
        if not line:
            continue
        if line.startswith("#"):
            break
        m = NUMBERED_RE.match(line)
        if m:
            if current is not None:
                items.append(current)
            current = m.group(1).strip()
        elif current is not None and not line.startswith(("+ ", "|", "```")):
            current += " " + line
    if current is not None:
        items.append(current)
    return items


def absolutize_links(text: str, page_url: str) -> str:
    def repl(m: re.Match) -> str:
        label, target = m.group(1), m.group(2)
        if target.startswith(("http://", "https://", "mailto:")):
            return m.group(0)
        if target.startswith("#"):
            return f"[{label}]({page_url}{target})"
        slug, _, anchor = target.partition("#")
        slug = re.sub(r"\.(md|html)$", "", slug)
        url = f"{DOC_ROOT}/{slug}.html" + (f"#{anchor}" if anchor else "")
        return f"[{label}]({url})"
    return MD_LINK_RE.sub(repl, text)


def md_to_plain(text: str) -> str:
    """Markdown -> plain text suitable for an innerHTML field (links/emphasis removed)."""
    text = MD_LINK_RE.sub(lambda m: m.group(1), text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"(?<!\w)\*([^*]+)\*(?!\w)", r"\1", text)
    text = text.replace("`", "")
    text = re.sub(r"\s+", " ", text).strip()
    return html.escape(text, quote=False)


def truncate_at_sentence(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit]
    for sep in (". ", "? ", "! "):
        idx = cut.rfind(sep)
        if idx > limit * 0.4:
            return cut[: idx + 1]
    idx = cut.rfind(" ")
    return (cut[:idx] if idx > 0 else cut).rstrip(",;:") + "…"


def link_text(md_link: str) -> str:
    m = MD_LINK_RE.search(md_link)
    return m.group(1).strip() if m else md_link.strip()


# ──────────────────────────────────────────────────────────────────────────────
# Parsers
# ──────────────────────────────────────────────────────────────────────────────
def parse_appendix(md: str) -> list[dict]:
    """Return pillars -> questions -> best practices (with risk) from Appendix A."""
    pillars: list[dict] = []
    current_pillar: dict | None = None
    current_q: dict | None = None
    bp_rx = re.compile(r"^\|\s*\[(AGENT[A-Z]+\d{2}-BP\d{2})\]\(([a-z0-9-]+)\.html\)\s*\|\s*(.+?)\s*\|\s*(High|Medium|Low)\s*\|")
    q_rx = re.compile(r"^###\s+(AGENT[A-Z]+\d{2}):\s*(.+?)\s*$")
    for line in clean_lines(md):
        if line.startswith("## "):
            name = line[3:].strip()
            if name.lower() == "summary":
                current_pillar = None
                continue
            meta = PILLAR_BY_NAME.get(name.lower())
            if not meta:
                raise SystemExit(f"Unknown pillar heading in Appendix A: {name!r}")
            current_pillar = {**meta, "questions": []}
            pillars.append(current_pillar)
            continue
        m = q_rx.match(line)
        if m and current_pillar is not None:
            current_q = {"id": m.group(1), "question": m.group(2), "best_practices": []}
            current_pillar["questions"].append(current_q)
            continue
        m = bp_rx.match(line)
        if m and current_q is not None:
            current_q["best_practices"].append({"id": m.group(1), "slug": m.group(2), "title": m.group(3), "risk": m.group(4)})
    return pillars


def parse_focus_area(md: str, qid: str) -> dict:
    lines = clean_lines(md)
    url = f"{DOC_ROOT}/{qid.lower()}.html"
    h1 = find_line(lines, r"^# ")
    name = lines[h1][2:].strip() if h1 >= 0 else qid
    q_idx = find_line(lines, r"^\|\s*AGENT[A-Z]+\d{2}:")
    question = ""
    if q_idx >= 0:
        m = re.match(r"^\|\s*(AGENT[A-Z]+\d{2}):\s*(.+?)\s*\|\s*$", lines[q_idx])
        question = m.group(2) if m else ""
    else:
        warn(f"{qid}: question table not found")
    intro = collect_paragraphs(lines, h1 + 1, q_idx if q_idx >= 0 else len(lines))
    intent_idx = find_line(lines, r"^## Capability intent")
    mat_idx = find_line(lines, r"^## Maturity levels")
    issues_idx = find_line(lines, r"^## Common issues to watch for")
    topics_idx = find_line(lines, r"^\*\*Topics\*\*")
    end = topics_idx if topics_idx >= 0 else len(lines)
    intent = collect_bullets(lines, intent_idx + 1, mat_idx if mat_idx >= 0 else end) if intent_idx >= 0 else []
    issues = collect_bullets(lines, issues_idx + 1, end) if issues_idx >= 0 else []
    levels = []
    if mat_idx >= 0:
        row_rx = re.compile(r"^\|\s*(\d)\s*\|\s*([A-Za-z]+)\s*\|\s*(.+?)\s*\|\s*$")
        for line in lines[mat_idx + 1: issues_idx if issues_idx >= 0 else end]:
            m = row_rx.match(line)
            if m:
                levels.append({"level": int(m.group(1)), "name": m.group(2), "description": absolutize_links(m.group(3), url)})
    for label, ok in (("capability intent", intent), ("maturity levels", len(levels) == 5), ("common issues", issues)):
        if not ok:
            warn(f"{qid}: {label} missing or incomplete")
    return {
        "id": qid, "slug": qid.lower(), "name": name, "question": question,
        "intro": absolutize_links(" ".join(intro), url),
        "capability_intent": [absolutize_links(b, url) for b in intent],
        "maturity_levels": levels,
        "common_issues": [absolutize_links(b, url) for b in issues],
        "doc_url": url,
    }


def parse_bp(md: str, bp: dict) -> dict:
    lines = clean_lines(md)
    url = f"{DOC_ROOT}/{bp['slug']}.html"
    h1 = find_line(lines, r"^# ")
    if h1 >= 0:
        m = re.match(r"^# (AGENT\S+)\s+(.*)$", lines[h1])
        if not m or m.group(1) != bp["id"]:
            warn(f"{bp['id']}: H1 mismatch: {lines[h1]!r}")
    outcome_idx = find_line(lines, r"^\*\*Desired outcome:\*\*")
    anti_idx = find_line(lines, r"^\*\*Common anti-patterns:\*\*")
    benefits_idx = find_line(lines, r"^\*\*Benefits of establishing this best practice:\*\*")
    risk_idx = find_line(lines, r"^\*\*Level of risk exposed if this best practice is not established:\*\*")
    impl_idx = find_line(lines, r"^## Implementation guidance")
    steps_idx = find_line(lines, r"^### Implementation steps")
    res_idx = find_line(lines, r"^## Resources")
    n = len(lines)

    def nxt(*idxs: int) -> int:
        cands = [i for i in idxs if i >= 0]
        return min(cands) if cands else n

    intro_end = nxt(outcome_idx, anti_idx, benefits_idx, risk_idx, impl_idx)
    intro = collect_paragraphs(lines, h1 + 1, intro_end)

    def block(start_idx: int, *stops: int) -> list[str]:
        if start_idx < 0:
            return []
        end = nxt(*stops)
        items: list[str] = []
        # text on the marker line itself (e.g. "**Desired outcome:** When implemented ...")
        rest = re.sub(r"^\*\*[^*]+\*\*\s*", "", lines[start_idx]).strip()
        if rest:
            items.append(rest)
        items += collect_bullets(lines, start_idx + 1, end)
        if not items:
            items += collect_paragraphs(lines, start_idx + 1, end)
        return items

    outcome = block(outcome_idx, anti_idx, benefits_idx, risk_idx, impl_idx)
    anti = block(anti_idx, benefits_idx, risk_idx, impl_idx)
    benefits = block(benefits_idx, risk_idx, impl_idx)
    risk = bp["risk"]
    if risk_idx >= 0:
        m = re.search(r"(High|Medium|Low)", lines[risk_idx])
        if m and m.group(1) != bp["risk"]:
            warn(f"{bp['id']}: risk on page ({m.group(1)}) differs from Appendix A ({bp['risk']}); using page")
            risk = m.group(1)
    else:
        warn(f"{bp['id']}: risk line not found")
    impl_end = nxt(steps_idx, res_idx)
    impl_paras = collect_paragraphs(lines, impl_idx + 1, impl_end) if impl_idx >= 0 else []
    impl_raw = "\n".join(lines[impl_idx + 1: impl_end]).strip() if impl_idx >= 0 else ""
    steps = collect_numbered(lines, steps_idx + 1, res_idx if res_idx >= 0 else n) if steps_idx >= 0 else []
    resources: dict[str, list[str]] = {}
    if res_idx >= 0:
        label_rx = re.compile(r"^\*\*Related ([^*:]+):\*\*")
        current: str | None = None
        for line in lines[res_idx + 1:]:
            m = label_rx.match(line)
            if m:
                current = m.group(1).strip().lower()
                resources.setdefault(current, [])
                continue
            mb = BULLET_RE.match(line)
            if mb and current:
                resources[current].append(mb.group(1).strip())
    for label, ok in (("intro", intro), ("desired outcome", outcome), ("anti-patterns", anti), ("benefits", benefits),
                      ("implementation guidance", impl_paras), ("implementation steps", steps), ("resources", resources)):
        if not ok:
            warn(f"{bp['id']}: {label} section missing")
    return {
        "id": bp["id"], "slug": bp["slug"], "title": bp["title"], "risk": risk, "doc_url": url,
        "intro": [absolutize_links(p, url) for p in intro],
        "desired_outcome": [absolutize_links(b, url) for b in outcome],
        "anti_patterns": [absolutize_links(b, url) for b in anti],
        "benefits": [absolutize_links(b, url) for b in benefits],
        "implementation_guidance": [absolutize_links(p, url) for p in impl_paras],
        "implementation_guidance_raw": absolutize_links(impl_raw, url),
        "implementation_steps": [absolutize_links(s, url) for s in steps],
        "resources": {k: [absolutize_links(v, url) for v in vals] for k, vals in resources.items()},
    }


def parse_principles(md: str) -> list[dict]:
    out = []
    lines = clean_lines(md)
    for b in collect_bullets(lines, 0, len(lines)):
        m = re.match(r"^\*\*(.+?):?\*\*:?\s*(.*)$", b)
        if m:
            out.append({"title": m.group(1).rstrip(":"), "text": m.group(2).strip()})
        else:
            out.append({"title": "", "text": b})
    return out


def parse_pillar_page(md: str, slug: str) -> dict:
    lines = clean_lines(md)
    h1 = find_line(lines, r"^# ")
    cap_idx = find_line(lines, r"^\*\*Capabilities\*\*")
    intro = collect_paragraphs(lines, h1 + 1, cap_idx if cap_idx >= 0 else len(lines))
    url = f"{DOC_ROOT}/{slug}.html"
    return {"intro": absolutize_links(" ".join(intro), url), "doc_url": url}


def parse_definitions(md: str) -> list[dict]:
    lines = clean_lines(md)
    defs: list[dict] = []
    term: str | None = None
    buf: list[str] = []

    def flush() -> None:
        if term and buf:
            defs.append({"term": term, "definition": " ".join(buf).strip()})

    for line in lines:
        m = re.match(r"^\*\*([^*]+)\*\*$", line)
        if m:
            flush()
            term, buf = m.group(1).strip(), []
            continue
        if term is None or line.startswith("#"):
            continue
        if not line:
            continue
        mb = BULLET_RE.match(line)
        buf.append(("• " + mb.group(1)) if mb else line)
    flush()
    return defs


def parse_lens_index(md: str) -> dict:
    lines = clean_lines(md)
    url = f"{DOC_ROOT}/agentic-ai-lens.html"
    pub = ""
    for line in lines:
        m = re.search(r"Publication date:\s*\*\*(.+?)\*\*", line)
        if m:
            pub = m.group(1)
            break
    pub_idx = find_line(lines, r"^Publication date:")
    first_h2 = find_line(lines, r"^## ", pub_idx + 1 if pub_idx >= 0 else 0)
    abstract = collect_paragraphs(lines, pub_idx + 1, first_h2 if first_h2 >= 0 else len(lines))
    rm_idx = find_line(lines, r"^## Lens roadmap")
    rm_end = find_line(lines, r"^## ", rm_idx + 1) if rm_idx >= 0 else -1
    roadmap: list[dict] = []
    if rm_idx >= 0:
        current: dict | None = None
        for line in lines[rm_idx + 1: rm_end if rm_end >= 0 else len(lines)]:
            m = re.match(r"^\*\*(.+?)\*\*$", line)
            if m:
                label = m.group(1).strip()
                current = {"id": ROADMAP_IDS.get(label, re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")),
                           "label": label, "intro": "", "focus_areas": []}
                roadmap.append(current)
                continue
            if current is None or not line:
                continue
            mb = BULLET_RE.match(line)
            if mb:
                ml = re.match(r"^\[(AGENT[A-Z]+\d{2}):\s*(.+?)\]\(", mb.group(1))
                if ml:
                    current["focus_areas"].append({"id": ml.group(1), "summary": ml.group(2).strip()})
            elif not current["intro"] and not line.startswith("#"):
                current["intro"] = line.rstrip(":")
    if len(roadmap) != 4:
        warn(f"roadmap: expected 4 reading paths, found {len(roadmap)}")
    return {"published": pub, "abstract": [absolutize_links(p, url) for p in abstract], "roadmap": roadmap}


def parse_revision_date(md: str) -> str:
    for line in clean_lines(md):
        m = re.match(r"^\|\s*\[?Initial release.*\|\s*(.+?)\s*\|\s*$", line)
        if m:
            return m.group(1).strip()
    return ""


# ──────────────────────────────────────────────────────────────────────────────
# Emitters
# ──────────────────────────────────────────────────────────────────────────────
def dump_json(obj: object) -> str:
    return json.dumps(obj, indent=2, ensure_ascii=False) + "\n"


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return
    path.write_text(text, encoding="utf-8")


def build_item(bp: dict, pillar: dict, fa: dict) -> dict:
    services = [link_text(s) for s in bp["resources"].get("services", [])]
    aws_service = " / ".join(dict.fromkeys(services)) if services else "N/A"
    link_sentence = (f"\n\nFor more information, see the <a href='{bp['doc_url']}'>"
                     f"{bp['id']} documentation</a>.")
    summary_src = md_to_plain(" ".join(bp["intro"]))
    outcomes = [md_to_plain(o) for o in bp["desired_outcome"]]

    def assemble(limit: int, n_out: int) -> dict:
        kept = outcomes[:n_out]
        check = "\n".join("• " + o for o in kept) + link_sentence if kept else link_sentence.strip()
        return {
            "id": bp["id"],
            "pillar": pillar["name"],
            "focus_area_id": fa["id"],
            "focus_area": fa["name"],
            "recommendation": bp["title"],
            "risk": bp["risk"],
            "aws_service": aws_service,
            "guidance": truncate_at_sentence(summary_src, limit),
            "how_to_check": check,
            "doc_url": bp["doc_url"],
        }

    n_out = len(outcomes)
    limit = GUIDANCE_SUMMARY_LIMIT
    item = assemble(limit, n_out)
    while len(dump_json(item).encode("utf-8")) > ITEM_BUDGET_BYTES:
        if limit > 300:
            limit -= 100
        elif n_out > 1:
            n_out -= 1
        else:
            warn(f"{bp['id']}: item still over budget after shrinking")
            break
        item = assemble(limit, n_out)
    if n_out < len(outcomes):
        warn(f"{bp['id']}: dropped {len(outcomes) - n_out} desired-outcome bullet(s) to fit the size budget")
    return item


def build_guidance_md(bp: dict, pillar: dict, fa: dict, published: str, full: bool) -> str:
    out: list[str] = []
    out.append(f"# {bp['id']} {bp['title']}")
    out.append("")
    out.append(f"**Pillar:** {pillar['name']} · **Focus area:** {fa['id']} — {fa['name']} · "
               f"**Risk if not established:** {bp['risk']}")
    out.append("")
    out.append(f"> **Source:** [{LENS_TITLE}: {bp['id']}]({bp['doc_url']}) (AWS documentation, {published}).")
    out.append("> Condensed for this self-assessment aid. Refer to the source for the authoritative, complete text.")
    out.append("")
    for p in bp["intro"]:
        out.append(p)
        out.append("")

    def section(title: str, bullets: list[str]) -> None:
        if not bullets:
            return
        out.append(f"## {title}")
        out.append("")
        out.extend(f"- {b}" for b in bullets)
        out.append("")

    section("Desired outcome", bp["desired_outcome"])
    section("Common anti-patterns", bp["anti_patterns"])
    section("Benefits of establishing this best practice", bp["benefits"])
    out.append("## Level of risk exposed if this best practice is not established")
    out.append("")
    out.append(f"**{bp['risk']}**")
    out.append("")
    if bp["implementation_guidance"] or bp["implementation_guidance_raw"]:
        out.append("## Implementation guidance")
        out.append("")
        if full and bp["implementation_guidance_raw"]:
            out.append(bp["implementation_guidance_raw"])
            out.append("")
        else:
            for p in bp["implementation_guidance"][:2]:
                out.append(p)
                out.append("")
            if len(bp["implementation_guidance"]) > 2:
                out.append(f"[Read the full implementation guidance]({bp['doc_url']}#implementation-guidance)")
                out.append("")
    if bp["implementation_steps"]:
        out.append("### Implementation steps")
        out.append("")
        for i, s in enumerate(bp["implementation_steps"], 1):
            out.append(f"{i}. {s}")
        out.append("")
    res = bp["resources"]
    groups = [("best practices", "Related best practices"), ("services", "Related services")]
    if full:
        groups += [("documents", "Related documents"), ("videos", "Related videos"),
                   ("examples", "Related examples"), ("workshops", "Related workshops")]
    if any(res.get(k) for k, _ in groups):
        out.append("## Resources")
        out.append("")
        for key, label in groups:
            if res.get(key):
                out.append(f"**{label}:**")
                out.append("")
                out.extend(f"- {r}" for r in res[key])
                out.append("")
    return "\n".join(out).rstrip() + "\n"


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sleep", type=float, default=0.5, help="seconds between HTTP requests (default 0.5)")
    ap.add_argument("--refresh", action="store_true", help="ignore the on-disk cache and refetch every page")
    ap.add_argument("--full", action="store_true", help="emit full implementation guidance and all resource groups")
    ap.add_argument("--clean", action="store_true", help="delete generated files that are no longer produced")
    ap.add_argument("--allow-count-drift", action="store_true", help="do not fail when pillar/question/BP counts differ from the known lens release")
    ap.add_argument("--out", metavar="DIR", default=None, help="write data/ and guidance/ under DIR instead of the repository root (used by tools/check_lens_updates.py)")
    args = ap.parse_args()

    out_root = Path(args.out).resolve() if args.out else REPO_ROOT
    data_dir, lens_dir, guidance_dir = out_root / "data", out_root / "data" / "lens", out_root / "guidance"

    fetcher = Fetcher(args.sleep, args.refresh)
    print("Fetching Appendix A ...")
    pillars = parse_appendix(fetcher.get("appendix-a"))
    n_q = sum(len(p["questions"]) for p in pillars)
    all_bps = [bp for p in pillars for q in p["questions"] for bp in q["best_practices"]]
    tally = {r: sum(1 for b in all_bps if b["risk"] == r) for r in ("High", "Medium", "Low")}
    print(f"  pillars={len(pillars)} questions={n_q} best_practices={len(all_bps)} risk={tally}")
    counts_ok = (len(pillars) == EXPECTED["pillars"] and n_q == EXPECTED["questions"]
                 and len(all_bps) == EXPECTED["best_practices"] and all(tally[k] == EXPECTED[k] for k in tally))
    if not counts_ok:
        msg = f"Counts differ from the known release {EXPECTED}"
        if not args.allow_count_drift:
            raise SystemExit(msg + " (use --allow-count-drift to continue)")
        warn(msg)

    print("Fetching lens-level pages ...")
    index = parse_lens_index(fetcher.get("agentic-ai-lens"))
    published = index["published"] or parse_revision_date(fetcher.get("document-revisions")) or "2026"
    design_principles = parse_principles(fetcher.get("design-principles"))
    definitions = parse_definitions(fetcher.get("definitions"))
    roadmap_by_fa: dict[str, list[str]] = {}
    for path in index["roadmap"]:
        for fa_ref in path["focus_areas"]:
            roadmap_by_fa.setdefault(fa_ref["id"], []).append(path["id"])

    lens_pillars = []
    focus_areas: list[dict] = []
    items: list[tuple[Path, dict]] = []
    guidance_files: list[tuple[Path, str]] = []
    manifest_items: list[str] = []

    for pillar in pillars:
        print(f"Pillar: {pillar['name']} ({len(pillar['questions'])} focus areas)")
        page = parse_pillar_page(fetcher.get(pillar["slug"]), pillar["slug"])
        p_principles = parse_principles(fetcher.get(f"{pillar['slug']}-design-principles"))
        lens_pillars.append({
            "name": pillar["name"], "slug": pillar["slug"], "prefix": pillar["prefix"],
            "short": pillar["short"], "abbr": pillar["abbr"], "intro": page["intro"],
            "design_principles": p_principles, "doc_url": page["doc_url"],
            "focus_areas": [q["id"] for q in pillar["questions"]],
        })
        for q in pillar["questions"]:
            fa = parse_focus_area(fetcher.get(q["id"].lower()), q["id"])
            if not fa["question"]:
                fa["question"] = q["question"]
            fa_record = {
                "id": fa["id"], "pillar": pillar["name"], "slug": fa["slug"], "name": fa["name"],
                "question": fa["question"], "appendix_question": q["question"],
                "intro": fa["intro"], "capability_intent": fa["capability_intent"],
                "maturity_levels": fa["maturity_levels"], "common_issues": fa["common_issues"],
                "best_practices": [b["id"] for b in q["best_practices"]],
                "roadmap": roadmap_by_fa.get(fa["id"], []), "doc_url": fa["doc_url"],
            }
            focus_areas.append(fa_record)
            for bp_ref in q["best_practices"]:
                bp = parse_bp(fetcher.get(bp_ref["slug"]), bp_ref)
                rel_json = f"data/{pillar['slug']}/{bp['slug']}.json"
                items.append((out_root / rel_json, build_item(bp, pillar, fa_record)))
                manifest_items.append(rel_json)
                guidance_files.append((guidance_dir / pillar["slug"] / f"{bp['slug']}.md",
                                       build_guidance_md(bp, pillar, fa_record, published, args.full)))
            print(f"  {q['id']}: {len(q['best_practices'])} best practices")

    lens = {
        "title": LENS_TITLE,
        "doc_root": DOC_ROOT,
        "doc_url": f"{DOC_ROOT}/agentic-ai-lens.html",
        "published": published,
        "custom_lens_json_url": CUSTOM_LENS_JSON_URL,
        "abstract": index["abstract"],
        "design_principles": design_principles,
        "pillars": lens_pillars,
        "roadmap": index["roadmap"],
        "definitions": definitions,
        "counts": {"pillars": len(pillars), "focus_areas": n_q, "best_practices": len(all_bps), "risk": tally},
    }

    print("Writing files ...")
    generated: set[Path] = set()
    for path, item in items:
        write_text(path, dump_json(item))
        generated.add(path)
    for path, text in guidance_files:
        write_text(path, text)
        generated.add(path)
    write_text(lens_dir / "focus_areas.json", dump_json(focus_areas))
    write_text(lens_dir / "lens.json", dump_json(lens))
    manifest = {"lens": "data/lens/lens.json", "focus_areas": "data/lens/focus_areas.json",
                "items": manifest_items, "total": len(manifest_items)}
    write_text(data_dir / "manifest.json", dump_json(manifest))

    if args.clean:
        removed = 0
        for base in [data_dir / p["slug"] for p in PILLARS] + [guidance_dir / p["slug"] for p in PILLARS]:
            if not base.exists():
                continue
            for f in base.iterdir():
                if f.is_file() and f not in generated:
                    f.unlink()
                    removed += 1
        print(f"  removed {removed} stale file(s)")

    print(f"Done: {len(items)} items, {len(focus_areas)} focus areas, {len(guidance_files)} guidance files, "
          f"{fetcher.requests} HTTP request(s), {len(WARNINGS)} warning(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
