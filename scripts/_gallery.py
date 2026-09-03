"""Shared gallery-thumbnail helpers used by import_dataset.py and generate_gallery.py.

Kept in one place so a single-dataset import (import_dataset.py) and the
batch regenerator (generate_gallery.py) always produce identical output.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps

THUMB_SIZE = 420  # longest side, px
QUALITY = 72


def make_thumbnail(source: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        thumb = ImageOps.autocontrast(image.convert("L"))
        thumb.thumbnail((THUMB_SIZE, THUMB_SIZE), Image.Resampling.LANCZOS)
        thumb.convert("RGB").save(dest, quality=QUALITY, optimize=True)


def build_gallery(root: Path, record_id: str, images: list[Path], masks: list[Path]) -> list[dict]:
    """Generate paired raw/mask thumbnails for every slice and return the gallery list.

    Pairs by position (sorted order) up to the shorter of the two lists, matching
    the same assumption import_dataset.py already makes for slice_count/preview.
    """
    gallery_root = root / "assets" / "images" / "gallery"
    pair_count = min(len(images), len(masks))
    gallery = []
    for idx, (img, msk) in enumerate(zip(images[:pair_count], masks[:pair_count]), start=1):
        name = f"{idx:04d}.jpg"
        raw_dest = gallery_root / record_id / "raw" / name
        mask_dest = gallery_root / record_id / "mask" / name
        make_thumbnail(img, raw_dest)
        make_thumbnail(msk, mask_dest)
        gallery.append({
            "raw": str(raw_dest.relative_to(root)),
            "mask": str(mask_dest.relative_to(root)),
        })
    return gallery
