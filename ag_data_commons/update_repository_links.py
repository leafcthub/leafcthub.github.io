#!/usr/bin/env python3
"""
Update data/datasets.json with Ag Data Commons links once items are published.

Reads ag_data_commons/submission_tracker.csv and, for every row where
ads_repository_url is filled in, writes that URL (and ads_download_url,
if present) into the matching record's repository_url / download_url
fields in data/datasets.json. Also sets repository to
"USDA Ag Data Commons" if it isn't already set.

Usage (from repo root):
    python3 ag_data_commons/update_repository_links.py

Add --dry-run to preview changes without writing anything.
Add --status published to only apply rows where ads_status == "published"
(default: applies any row that has a non-empty ads_repository_url).
"""

import argparse
import csv
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATASETS_JSON = REPO_ROOT / "data" / "datasets.json"
TRACKER_CSV = REPO_ROOT / "ag_data_commons" / "submission_tracker.csv"


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

    with open(datasets_path, encoding="utf-8") as f:
        records = json.load(f)
    by_id = {r["id"]: r for r in records}

    updated = []
    skipped_no_url = []
    skipped_no_match = []
    skipped_status = []

    for row in rows:
        rid = row.get("id", "").strip()
        repo_url = (row.get("ads_repository_url") or "").strip()
        dl_url = (row.get("ads_download_url") or "").strip()
        status = (row.get("ads_status") or "").strip()

        if args.status and status != args.status:
            skipped_status.append(rid)
            continue
        if not repo_url:
            skipped_no_url.append(rid)
            continue
        if rid not in by_id:
            skipped_no_match.append(rid)
            continue

        rec = by_id[rid]
        changed = False
        if rec.get("repository_url") != repo_url:
            rec["repository_url"] = repo_url
            changed = True
        if dl_url and rec.get("download_url") != dl_url:
            rec["download_url"] = dl_url
            changed = True
        if not rec.get("repository"):
            rec["repository"] = "USDA Ag Data Commons"
            changed = True
        if changed:
            updated.append(rid)

    print(f"Records updated: {len(updated)}")
    for rid in updated:
        print(f"  - {rid} -> {by_id[rid]['repository_url']}")
    print(f"Rows with no ads_repository_url yet (skipped): {len(skipped_no_url)}")
    if args.status:
        print(f"Rows skipped due to --status filter: {len(skipped_status)}")
    if skipped_no_match:
        print(f"WARNING: ids in tracker not found in datasets.json: {skipped_no_match}", file=sys.stderr)

    if args.dry_run:
        print("\nDry run: no files written.")
        return

    if updated:
        with open(datasets_path, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"\nWrote changes to {datasets_path}")
    else:
        print("\nNo changes to write.")


if __name__ == "__main__":
    main()
