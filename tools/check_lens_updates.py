#!/usr/bin/env python3
"""Check whether AWS has published new or changed entries in the Agentic AI Lens
that are not yet reflected in this repository.

Default (light) mode fetches three small pages from the official documentation,
bypassing the local cache, and compares them with the generated content:

* ``appendix-a.md``          -> pillars, focus-area questions, best practices and risk levels
* ``agentic-ai-lens.md``     -> publication date
* ``document-revisions.md``  -> latest documented revision

``--deep`` additionally regenerates the whole content into a temporary directory
(``build_lens_content.py --out``) and diffs it file by file against ``data/`` and
``guidance/``, which also catches wording changes inside existing pages.

Exit codes: 0 = no updates, 1 = updates detected, 2 = could not check (network,
parse error). Standard library only (Python 3.9+).

Usage:
    python3 -I tools/check_lens_updates.py [--deep] [--refresh] [--json] [--root DIR] [--sleep 0.5]
"""
from __future__ import annotations

import argparse
import filecmp
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS_DIR))  # `python3 -I` does not add the script directory
from build_lens_content import Fetcher, parse_appendix, parse_lens_index, parse_revision_date  # noqa: E402

REPO_ROOT = TOOLS_DIR.parent


# ──────────────────────────────────────────────────────────────────────────────
# Local state
# ──────────────────────────────────────────────────────────────────────────────
def load_local(root: Path) -> dict:
    manifest = json.loads((root / "data" / "manifest.json").read_text(encoding="utf-8"))
    lens = json.loads((root / manifest.get("lens", "data/lens/lens.json")).read_text(encoding="utf-8"))
    focus_areas = json.loads((root / manifest.get("focus_areas", "data/lens/focus_areas.json")).read_text(encoding="utf-8"))
    items = {}
    for rel in manifest["items"]:
        it = json.loads((root / rel).read_text(encoding="utf-8"))
        items[it["id"]] = it
    return {
        "published": lens.get("published", ""),
        "pillars": {p["name"] for p in lens.get("pillars", [])},
        "focus_areas": {fa["id"]: fa for fa in focus_areas},
        "items": items,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Upstream state (fresh fetch)
# ──────────────────────────────────────────────────────────────────────────────
def load_upstream(fetcher: Fetcher) -> dict:
    pillars = parse_appendix(fetcher.get("appendix-a"))
    index = parse_lens_index(fetcher.get("agentic-ai-lens"))
    revision = parse_revision_date(fetcher.get("document-revisions"))
    focus_areas, items = {}, {}
    for p in pillars:
        for q in p["questions"]:
            focus_areas[q["id"]] = {"pillar": p["name"], "question": q["question"], "best_practices": [b["id"] for b in q["best_practices"]]}
            for b in q["best_practices"]:
                items[b["id"]] = {"pillar": p["name"], "focus_area_id": q["id"], "title": b["title"], "risk": b["risk"]}
    return {
        "published": index.get("published", ""),
        "revision": revision,
        "pillars": {p["name"] for p in pillars},
        "focus_areas": focus_areas,
        "items": items,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Comparison
# ──────────────────────────────────────────────────────────────────────────────
def compare(local: dict, upstream: dict) -> dict:
    changes: dict[str, list] = {
        "new_pillars": sorted(upstream["pillars"] - local["pillars"]),
        "removed_pillars": sorted(local["pillars"] - upstream["pillars"]),
        "new_focus_areas": [], "removed_focus_areas": [], "changed_focus_areas": [],
        "new_best_practices": [], "removed_best_practices": [], "changed_best_practices": [],
        "publication": [],
    }
    for fid in sorted(set(upstream["focus_areas"]) - set(local["focus_areas"])):
        u = upstream["focus_areas"][fid]
        changes["new_focus_areas"].append({"id": fid, "pillar": u["pillar"], "question": u["question"], "best_practices": u["best_practices"]})
    for fid in sorted(set(local["focus_areas"]) - set(upstream["focus_areas"])):
        changes["removed_focus_areas"].append({"id": fid, "question": local["focus_areas"][fid].get("question", "")})
    for fid in sorted(set(local["focus_areas"]) & set(upstream["focus_areas"])):
        l, u = local["focus_areas"][fid], upstream["focus_areas"][fid]
        diffs = {}
        # Appendix A sometimes words a question differently from the focus-area page itself,
        # so compare against the appendix wording recorded at generation time when available.
        local_q = (l.get("appendix_question") or l.get("question") or "").strip()
        if local_q != u["question"].strip():
            diffs["question"] = {"local": local_q, "upstream": u["question"]}
        if l.get("pillar") != u["pillar"]:
            diffs["pillar"] = {"local": l.get("pillar"), "upstream": u["pillar"]}
        if list(l.get("best_practices", [])) != u["best_practices"]:
            diffs["best_practices"] = {"local": l.get("best_practices", []), "upstream": u["best_practices"]}
        if diffs:
            changes["changed_focus_areas"].append({"id": fid, **diffs})
    for bid in sorted(set(upstream["items"]) - set(local["items"])):
        changes["new_best_practices"].append({"id": bid, **upstream["items"][bid]})
    for bid in sorted(set(local["items"]) - set(upstream["items"])):
        changes["removed_best_practices"].append({"id": bid, "title": local["items"][bid].get("recommendation", "")})
    for bid in sorted(set(local["items"]) & set(upstream["items"])):
        l, u = local["items"][bid], upstream["items"][bid]
        diffs = {}
        if (l.get("recommendation") or "").strip() != u["title"].strip():
            diffs["title"] = {"local": l.get("recommendation"), "upstream": u["title"]}
        if l.get("risk") != u["risk"]:
            diffs["risk"] = {"local": l.get("risk"), "upstream": u["risk"]}
        if l.get("focus_area_id") != u["focus_area_id"]:
            diffs["focus_area_id"] = {"local": l.get("focus_area_id"), "upstream": u["focus_area_id"]}
        if diffs:
            changes["changed_best_practices"].append({"id": bid, **diffs})
    if upstream["published"] and upstream["published"] != local["published"]:
        changes["publication"].append({"field": "publication_date", "local": local["published"], "upstream": upstream["published"]})
    if upstream["revision"] and upstream["revision"] != upstream["published"]:
        changes["publication"].append({"field": "latest_revision", "local": local["published"], "upstream": upstream["revision"]})
    return changes


def deep_diff(root: Path, refresh: bool, sleep: float) -> dict:
    """Regenerate into a temp dir and diff data/ + guidance/ against the repository."""
    with tempfile.TemporaryDirectory(prefix="lens-check-") as tmp:
        cmd = [sys.executable, "-I", str(TOOLS_DIR / "build_lens_content.py"), "--out", tmp,
               "--allow-count-drift", "--sleep", str(sleep)] + (["--refresh"] if refresh else [])
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            raise RuntimeError(f"regeneration failed (exit {proc.returncode}):\n{proc.stderr[-2000:]}")
        added, removed, changed = [], [], []
        for sub in ("data", "guidance"):
            local_dir, new_dir = root / sub, Path(tmp) / sub
            local_files = {str(p.relative_to(root)) for p in local_dir.rglob("*") if p.is_file()}
            new_files = {str(p.relative_to(tmp)) for p in new_dir.rglob("*") if p.is_file()} if new_dir.exists() else set()
            added += sorted(new_files - local_files)
            removed += sorted(f for f in local_files - new_files if not f.endswith((".sh", ".md")) or f.startswith("guidance/"))
            for rel in sorted(local_files & new_files):
                if not filecmp.cmp(root / rel, Path(tmp) / rel, shallow=False):
                    changed.append(rel)
        # data/ also holds hand-written scripts and docs that the generator never produces
        removed = [f for f in removed if not f.startswith("data/") or f.endswith(".json")]
        return {"added_files": added, "removed_files": removed, "changed_files": changed}


def has_changes(changes: dict) -> bool:
    return any(v for v in changes.values())


def print_report(changes: dict, deep: dict | None, upstream: dict) -> None:
    print(f"Upstream publication date: {upstream['published'] or 'unknown'}"
          + (f" (latest revision: {upstream['revision']})" if upstream.get("revision") else ""))
    print(f"Upstream: {len(upstream['pillars'])} pillars, {len(upstream['focus_areas'])} focus areas, {len(upstream['items'])} best practices")
    labels = [
        ("new_pillars", "New pillars"), ("removed_pillars", "Removed pillars"),
        ("new_focus_areas", "New focus areas"), ("removed_focus_areas", "Removed focus areas"), ("changed_focus_areas", "Changed focus areas"),
        ("new_best_practices", "New best practices"), ("removed_best_practices", "Removed best practices"), ("changed_best_practices", "Changed best practices"),
        ("publication", "Publication / revision changes"),
    ]
    any_change = False
    for key, label in labels:
        entries = changes.get(key) or []
        if not entries:
            continue
        any_change = True
        print(f"\n{label} ({len(entries)}):")
        for e in entries:
            if isinstance(e, dict):
                head = e.get("id") or e.get("field") or ""
                rest = {k: v for k, v in e.items() if k not in ("id", "field")}
                print(f"  - {head}: {json.dumps(rest, ensure_ascii=False)}")
            else:
                print(f"  - {e}")
    if deep is not None:
        total = sum(len(v) for v in deep.values())
        if total:
            any_change = True
            print(f"\nDeep check: {len(deep['added_files'])} added, {len(deep['removed_files'])} removed, {len(deep['changed_files'])} changed file(s)")
            for k in ("added_files", "removed_files", "changed_files"):
                for f in deep[k][:25]:
                    print(f"  {k.split('_')[0]:>7}: {f}")
                if len(deep[k]) > 25:
                    print(f"          ... and {len(deep[k]) - 25} more")
        else:
            print("\nDeep check: regenerated content is identical to the repository")
    if not any_change:
        print("\nNo new entries: the repository matches the published Lens.")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--deep", action="store_true", help="also regenerate everything into a temp dir and diff file by file")
    ap.add_argument("--refresh", action="store_true", help="with --deep, refetch every page instead of using the cache")
    ap.add_argument("--json", action="store_true", help="print a machine-readable JSON report instead of text")
    ap.add_argument("--root", default=str(REPO_ROOT), help="repository root to compare against (default: this repository)")
    ap.add_argument("--sleep", type=float, default=0.5, help="seconds between HTTP requests")
    args = ap.parse_args()
    root = Path(args.root).resolve()

    try:
        local = load_local(root)
    except (OSError, json.JSONDecodeError, KeyError) as e:
        print(f"error: cannot read local content under {root}: {e}", file=sys.stderr)
        return 2
    try:
        upstream = load_upstream(Fetcher(args.sleep, refresh=True))
    except Exception as e:  # network or parse failure: do not claim "no changes"
        print(f"error: cannot fetch or parse the upstream documentation: {e}", file=sys.stderr)
        return 2

    changes = compare(local, upstream)
    deep = None
    if args.deep:
        try:
            deep = deep_diff(root, args.refresh, args.sleep)
        except Exception as e:
            print(f"error: deep check failed: {e}", file=sys.stderr)
            return 2

    updates = has_changes(changes) or bool(deep and any(deep.values()))
    if args.json:
        print(json.dumps({
            "updates_detected": updates,
            "upstream": {"published": upstream["published"], "revision": upstream["revision"],
                         "counts": {"pillars": len(upstream["pillars"]), "focus_areas": len(upstream["focus_areas"]), "best_practices": len(upstream["items"])}},
            "local": {"published": local["published"],
                      "counts": {"pillars": len(local["pillars"]), "focus_areas": len(local["focus_areas"]), "best_practices": len(local["items"])}},
            "changes": changes,
            "deep": deep,
        }, indent=2, ensure_ascii=False))
    else:
        print_report(changes, deep, upstream)
    return 1 if updates else 0


if __name__ == "__main__":
    sys.exit(main())
