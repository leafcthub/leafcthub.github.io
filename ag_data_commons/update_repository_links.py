#!/usr/bin/env python3
"""
Update data/datasets.json with Ag Data Commons links once items are published.

Reads ag_data_commons/submission_tracker.csv and, for every row where
ads_download_url is filled in, writes that single URL into both the
repository_url and download_url fields of the matching record in
data/datasets.json. Ag Data Commons is used purely as storage here --
there's no separate landing page distinct from the file's direct
download link, so one tracker column covers both site fields. Also
sets repository to "USDA Ag Data Commons" if it isn't already set.

Writes are done as surgical, per-record text edits rather than a full
json.dump() of the file -- re-serializing the whole 100+-record file
re-escapes every non-ASCII character (μ, –, accented names, etc.)
inconsistently with however each record was originally written, which
turns a one-field change into a multi-hundred-line diff of pure noise.
This script only ever touches the exact field values it's updating.

Usage (from repo root):
    python3 ag_data_commons/update_repository_links.py

Add --dry-run to preview changes without writing anything.
Add --status published to only apply rows where ads_status == "published"
(default: applies any row that has a non-empty ads_download_url).
"""

import argparse
import csv
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATASETS_JSON = REPO_ROOT / "data" / "datasets.json"
TRACKER_CSV = REPO_ROOT / "ag_data_commons" / "submission_tracker.csv"


def find_record_span(text: str, rid: str) -> tuple[int, int]:
    """Return (start, end) offsets of the JSON object for record id `rid`."""
    anchor = f'"id": "{rid}",\n'
    idx = text.find(anchor)
    if idx == -1:
        raise KeyError(rid)
    if text.find(anchor, idx + 1) != -1:
        raise ValueError(f"id {rid!r} is not unique in the file")

    obj_start = text.rfind("{", 0, idx)
    depth = 0
    in_string = False
    escape = False
    i = obj_start
    while i < len(text):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
        else:
            if ch == '"':
                in_string = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return obj_start, i + 1
        i += 1
    raise ValueError(f"no matching close brace for id {rid!r}")


def set_field(text: str, start: int, end: int, field: str, value: str) -> tuple[str, bool]:
    """Set `"field": "..."` to `value` within text[start:end]. Returns (text, changed)."""
    span = text[start:end]
    pattern = re.compile(r'("' + re.escape(field) + r'":\s*)"[^"]*"')
    encoded_value = json.dumps(value, ensure_ascii=False)
    new_span, count = pattern.subn(lambda m: m.group(1) + encoded_value, span, count=1)
    if count == 0:
        raise KeyError(f"field {field!r} not found in record")
    if new_span == span:
        return text, False
    return text[:start] + new_span + text[end:], True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tracker", default=str(TRACKER_CSV))
    parser.add_argument("--datasets", default=str(DATASETS_JSON))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--status", default=None,
                         help="Only apply rows with this ads_status value (e.g. 'published')")
    args = parser.parse_args()

    tracker_path = Path(args.tracker)
    datasets_path = Path(args.datasets)

    with open(tracker_path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    text = datasets_path.read_text(encoding="utf-8")
    # Still parse as JSON for lookups/validation -- only the write path avoids
    # re-serializing the whole structure.
    records = json.loads(text)
    by_id = {r["id"]: r for r in records}

    updated = []
    updated_urls = {}
    skipped_no_url = []
    skipped_no_match = []
    skipped_status = []

    for row in rows:
        rid = row.get("id", "").strip()
        url = (row.get("ads_download_url") or "").strip()
        status = (row.get("ads_status") or "").strip()

        if args.status and status != args.status:
            skipped_status.append(rid)
            continue
        if not url:
            skipped_no_url.append(rid)
            continue
        if rid not in by_id:
            skipped_no_match.append(rid)
            continue

        rec = by_id[rid]
        start, end = find_record_span(text, rid)
        changed = False

        if rec.get("repository_url") != url:
            text, did_change = set_field(text, start, end, "repository_url", url)
            changed = changed or did_change
            start, end = find_record_span(text, rid)

        if rec.get("download_url") != url:
            text, did_change = set_field(text, start, end, "download_url", url)
            changed = changed or did_change
            start, end = find_record_span(text, rid)

        if not rec.get("repository"):
            text, did_change = set_field(text, start, end, "repository", "USDA Ag Data Commons")
            changed = changed or did_change
            start, end = find_record_span(text, rid)

        if changed:
            updated.append(rid)
            updated_urls[rid] = url

    print(f"Records updated: {len(updated)}")
    for rid in updated:
        print(f"  - {rid} -> {updated_urls[rid]}")
    print(f"Rows with no ads_download_url yet (skipped): {len(skipped_no_url)}")
    if args.status:
        print(f"Rows skipped due to --status filter: {len(skipped_status)}")
    if skipped_no_match:
        print(f"WARNING: ids in tracker not found in datasets.json: {skipped_no_match}", file=sys.stderr)

    if args.dry_run:
        print("\nDry run: no files written.")
        return

    if updated:
        datasets_path.write_text(text, encoding="utf-8")
        json.loads(text)  # sanity check: still valid JSON after all edits
        print(f"\nWrote changes to {datasets_path}")
    else:
        print("\nNo changes to write.")


if __name__ == "__main__":
    main()
