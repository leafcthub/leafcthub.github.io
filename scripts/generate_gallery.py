#!/usr/bin/env python3
"""Batch-generate full slice-by-slice raw/mask thumbnail galleries for the catalog.

Reads directly from the external source dataset (dataset_various), not the
gitignored dataset/images/ working copies (which get pruned after import).
Writes small paired thumbnails into assets/images/gallery/<id>/{raw,mask}/
and adds a `gallery` field (list of {raw, mask} paths) plus `gallery_count`
to the matching record in data/datasets.json. Safe to re-run (idempotent) --
each run overwrites that id's thumbnails and gallery field only.

For a single newly-added dataset, import_dataset.py already calls the same
shared helper (scripts/_gallery.py) automatically -- this script is for
(re)building the gallery for many species at once, e.g. after a dataset
folder gets updated outside the normal import flow.

Usage:
  python3 scripts/generate_gallery.py --source /path/to/dataset_various/images
  python3 scripts/generate_gallery.py --source ... --only arabidopsis1 arabidopsis2
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from _gallery import build_gallery

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "datasets.json"
IMAGE_EXTS = {".tif", ".tiff", ".png", ".jpg", ".jpeg"}


def image_files(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    return sorted(
        p for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS and p.name != ".DS_Store"
    )


def update_catalog(record_id: str, gallery: list[dict]) -> bool:
    records = json.load(open(CATALOG_PATH))
    updated = False
    for record in records:
        if record.get("id") == record_id:
            record["gallery"] = gallery
            record["gallery_count"] = len(gallery)
            updated = True
            break
    if not updated:
        return False
    with open(CATALOG_PATH, "w") as handle:
        json.dump(records, handle, indent=2, ensure_ascii=True)
        handle.write("\n")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch-generate paired raw/mask gallery thumbnails.")
    parser.add_argument("--source", required=True, type=Path, help="Path to dataset_various/images")
    parser.add_argument("--only", nargs="*", help="Limit to these species ids")
    args = parser.parse_args()

    species_dirs = sorted(p for p in args.source.iterdir() if p.is_dir())
    if args.only:
        wanted = set(args.only)
        species_dirs = [p for p in species_dirs if p.name in wanted]

    for species_dir in species_dirs:
        record_id = species_dir.name
        images = image_files(species_dir / "images")
        masks = image_files(species_dir / "masks")
        if not images or not masks:
            print(f"[skip] {record_id}: missing images or masks", flush=True)
            continue
        if len(images) != len(masks):
            print(
                f"[warn] {record_id}: {len(images)} images vs {len(masks)} masks -- "
                f"pairing by position up to min count",
                flush=True,
            )
        gallery = build_gallery(ROOT, record_id, images, masks)
        ok = update_catalog(record_id, gallery)
        status = "ok" if ok else "NOT IN CATALOG"
        print(f"[{status}] {record_id}: {len(gallery)} pairs", flush=True)


if __name__ == "__main__":
    main()
