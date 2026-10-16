#!/usr/bin/env python3
"""Validate the generated Lens content (offline). Exit code 1 on any error.

Checks:
* data/manifest.json parses, ``total`` == len(items), every path exists
* every item JSON parses, has the required fields, a unique id matching its filename,
  a known pillar, a known focus area, a valid risk level, and is <= MAX_CHARS characters
* data/lens/focus_areas.json has 41 focus areas with 5 maturity levels each
* data/lens/lens.json has 6 pillars
* every item has a matching guidance markdown file under guidance/

Usage: python3 -I tools/validate_content.py [--max-chars 2500]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
REQUIRED_FIELDS = ("id", "pillar", "focus_area_id", "focus_area", "recommendation", "risk",
                   "aws_service", "guidance", "how_to_check", "doc_url")
RISKS = {"High", "Medium", "Low"}
EXPECTED = {"pillars": 6, "focus_areas": 41, "items": 150}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--max-chars", type=int, default=2500)
    args = ap.parse_args()
    errors: list[str] = []

    def err(msg: str) -> None:
        errors.append(msg)

    def load(rel: str):
        path = REPO_ROOT / rel
        if not path.exists():
            err(f"missing file: {rel}")
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            err(f"invalid JSON in {rel}: {e}")
            return None

    manifest = load("data/manifest.json")
    if manifest is None:
        return report(errors)
    items = manifest.get("items", [])
    if manifest.get("total") != len(items):
        err(f"manifest total {manifest.get('total')} != {len(items)} items")
    if len(items) != EXPECTED["items"]:
        err(f"expected {EXPECTED['items']} items, manifest lists {len(items)}")

    lens = load(manifest.get("lens", "data/lens/lens.json")) or {}
    fas = load(manifest.get("focus_areas", "data/lens/focus_areas.json")) or []
    pillar_names = {p["name"] for p in lens.get("pillars", [])}
    if len(pillar_names) != EXPECTED["pillars"]:
        err(f"expected {EXPECTED['pillars']} pillars in lens.json, found {len(pillar_names)}")
    fa_by_id = {fa["id"]: fa for fa in fas}
    if len(fa_by_id) != EXPECTED["focus_areas"]:
        err(f"expected {EXPECTED['focus_areas']} focus areas, found {len(fa_by_id)}")
    for fa in fas:
        if len(fa.get("maturity_levels", [])) != 5:
            err(f"{fa['id']}: expected 5 maturity levels, found {len(fa.get('maturity_levels', []))}")
        if fa.get("pillar") not in pillar_names:
            err(f"{fa['id']}: unknown pillar {fa.get('pillar')!r}")
        if not fa.get("question"):
            err(f"{fa['id']}: missing question")

    seen_ids: set[str] = set()
    for rel in items:
        path = REPO_ROOT / rel
        item = load(rel)
        if item is None:
            continue
        size = len(path.read_text(encoding="utf-8"))
        if size > args.max_chars:
            err(f"{rel}: {size} chars exceeds {args.max_chars}")
        for f in REQUIRED_FIELDS:
            if not item.get(f):
                err(f"{rel}: missing or empty field {f!r}")
        iid = item.get("id", "")
        if iid in seen_ids:
            err(f"{rel}: duplicate id {iid}")
        seen_ids.add(iid)
        if iid.lower() != path.stem:
            err(f"{rel}: id {iid} does not match filename")
        if item.get("pillar") not in pillar_names:
            err(f"{rel}: unknown pillar {item.get('pillar')!r}")
        if item.get("risk") not in RISKS:
            err(f"{rel}: invalid risk {item.get('risk')!r}")
        fa = fa_by_id.get(item.get("focus_area_id"))
        if fa is None:
            err(f"{rel}: unknown focus_area_id {item.get('focus_area_id')!r}")
        elif fa["pillar"] != item.get("pillar"):
            err(f"{rel}: pillar {item.get('pillar')!r} differs from focus area pillar {fa['pillar']!r}")
        guidance = REPO_ROOT / rel.replace("data/", "guidance/", 1).replace(".json", ".md")
        if not guidance.exists():
            err(f"{rel}: missing guidance file {guidance.relative_to(REPO_ROOT)}")
        if "<a href=" not in item.get("how_to_check", ""):
            err(f"{rel}: how_to_check has no documentation link")

    listed_bps = {bp for fa in fas for bp in fa.get("best_practices", [])}
    missing = listed_bps - seen_ids
    if missing:
        err(f"focus areas reference best practices without items: {sorted(missing)[:5]} ...")
    return report(errors, len(items), len(fa_by_id), len(pillar_names))


def report(errors: list[str], n_items: int = 0, n_fa: int = 0, n_pillars: int = 0) -> int:
    for e in errors:
        print(f"ERROR: {e}")
    if errors:
        print(f"\n{len(errors)} error(s)")
        return 1
    print(f"OK: {n_pillars} pillars, {n_fa} focus areas, {n_items} items, all guidance files present")
    return 0


if __name__ == "__main__":
    sys.exit(main())
