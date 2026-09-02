#!/usr/bin/env python3
"""Import one Leaf CT Hub dataset into the static catalog.

Expected use:
  python3 scripts/import_dataset.py \
    --id olive_new \
    --images-dir /path/to/images \
    --masks-dir /path/to/masks \
    --config /path/to/config.json \
    --metadata /path/to/metadata.json

The script copies files into the same structure used by this website:
  dataset/images/<id>/images
  dataset/images/<id>/masks
  dataset/configs/<id>.json
  assets/images/previews/<id>.jpg
  assets/images/masks/<id>.jpg
  data/datasets.json

dataset/images/ and dataset/configs/ are gitignored working folders (internal
notes, admin bookkeeping). Before committing, generate the shared copy by
hand in dataset/configs_public/<id>.json with unfiltered admin notes trimmed
out -- that folder, not dataset/configs/, is what actually gets pushed.
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "datasets.json"
IMAGE_EXTS = {".tif", ".tiff", ".png", ".jpg", ".jpeg"}


def image_files(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    return sorted(path for path in folder.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTS)


def copy_tree_contents(source: Path, target: Path) -> None:
    if not source.is_dir():
        raise SystemExit(f"Missing folder: {source}")
    target.mkdir(parents=True, exist_ok=True)
    for item in source.iterdir():
        if item.name == ".DS_Store":
            continue
        destination = target / item.name
        if item.is_dir():
            shutil.copytree(item, destination, dirs_exist_ok=True)
        else:
            shutil.copy2(item, destination)


def image_size(path: Path) -> str:
    with Image.open(path) as image:
        return f"{image.width} x {image.height}"


def save_raw_preview(record_id: str, images: list[Path]) -> str:
    if not images:
        return ""
    preview_path = ROOT / "assets" / "images" / "previews" / f"{record_id}.jpg"
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    source = images[len(images) // 2]
    with Image.open(source) as image:
        preview = ImageOps.autocontrast(image.convert("L"))
        preview.thumbnail((900, 520), Image.Resampling.LANCZOS)
        canvas = Image.new("L", (900, 520), 239)
        canvas.paste(preview, ((canvas.width - preview.width) // 2, (canvas.height - preview.height) // 2))
        canvas.convert("RGB").save(preview_path, quality=88, optimize=True)
    return str(preview_path.relative_to(ROOT))


def save_mask_preview(record_id: str, masks: list[Path]) -> str:
    if not masks:
        return ""
    preview_path = ROOT / "assets" / "images" / "masks" / f"{record_id}.jpg"
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    source = masks[len(masks) // 2]
    with Image.open(source) as image:
        preview = ImageOps.autocontrast(image.convert("L"))
        preview.thumbnail((900, 520), Image.Resampling.LANCZOS)
        canvas = Image.new("L", (900, 520), 239)
        canvas.paste(preview, ((canvas.width - preview.width) // 2, (canvas.height - preview.height) // 2))
        canvas.convert("RGB").save(preview_path, quality=88, optimize=True)
    return str(preview_path.relative_to(ROOT))


def sorted_label_values(mapping: dict, ignore_index=None) -> list[str]:
    """Raw mask pixel values that map to a real semantic class.

    Excludes any raw value whose mapping target is ignore_index, since those
    are noise/border pixels meant to be excluded from training, not a class.
    This keeps mask_label_value_count aligned with num_classes.
    """
    def sort_key(value: str) -> tuple[int, int | str]:
        text = str(value)
        return (0, int(text)) if text.lstrip("-").isdigit() else (1, text)

    active_keys = (
        key for key, target in mapping.items()
        if ignore_index is None or target != ignore_index
    )
    return sorted((str(key) for key in active_keys), key=sort_key)


def build_record(
    record_id: str,
    metadata: dict,
    config: dict,
    images: list[Path],
    masks: list[Path],
    preview_image: str,
    mask_preview_image: str,
) -> dict:
    mapping = config.get("mapping") or {}
    ignore_index = config.get("ignore_index", metadata.get("ignore_index"))
    mask_label_values = sorted_label_values(mapping, ignore_index)
    first_image = images[0] if images else None
    file_format = first_image.suffix.lstrip(".").upper().replace("TIFF", "TIF") if first_image else ""
    title = metadata.get("title") or f"{metadata.get('scientific_name', record_id).strip()} leaf X-ray micro-CT dataset ({record_id})"

    return {
        "id": record_id,
        "title": title,
        "plant_category": metadata.get("plant_category", ""),
        "scientific_name": metadata.get("scientific_name", ""),
        "common_name": metadata.get("common_name", ""),
        "family": metadata.get("family", ""),
        "plant_group": metadata.get("plant_group", ""),
        "species": metadata.get("scientific_name", ""),
        "cultivar_or_accession": metadata.get("cultivar_or_accession", ""),
        "treatment": metadata.get("treatment", ""),
        "tissue_or_anatomical_region": metadata.get("tissue_or_anatomical_region", "Leaf"),
        "description": metadata.get("description", ""),
        "ct_modality": metadata.get("ct_modality", "X-ray micro-CT"),
        "scanner": metadata.get("scanner", ""),
        "scan_location": metadata.get("scan_location", ""),
        "scan_year": metadata.get("scan_year", ""),
        "scan_notes": metadata.get("scan_notes", ""),
        "voxel_size": metadata.get("voxel_size", ""),
        "voxel_size_unit": metadata.get("voxel_size_unit", "um"),
        "image_size": image_size(first_image) if first_image else metadata.get("image_size", ""),
        "file_format": file_format,
        "slice_count": len(images),
        "no_of_leaves": metadata.get("no_of_leaves", ""),
        "split": metadata.get("split", "Train"),
        "classes": config.get("class_names") or metadata.get("classes", []),
        "annotation_type": metadata.get("annotation_type", ""),
        "annotation_classes_source_text": metadata.get("annotation_classes_source_text", ""),
        "num_classes": config.get("num_classes", metadata.get("num_classes", "")),
        "ignore_index": config.get("ignore_index", metadata.get("ignore_index", "")),
        "label_mapping": mapping,
        "annotation_features": {
            "has_bse_label": bool(config.get("has_bse_label", False)),
            "has_tannin": bool(metadata.get("has_tannin", False)),
            "has_resin_ducts": bool(metadata.get("has_resin_ducts", False)),
            "has_transfusion_tissue": bool(metadata.get("has_transfusion_tissue", False)),
        },
        "repository": metadata.get("repository", "USDA Ag Data Commons"),
        "repository_url": metadata.get("repository_url", ""),
        "download_url": metadata.get("download_url", ""),
        "doi": metadata.get("doi", ""),
        "publication_url": metadata.get("publication_url", metadata.get("paper_reference", "")),
        "citation": metadata.get("citation", ""),
        "license": metadata.get("license", ""),
        "contributors": metadata.get("contributors", metadata.get("provider", "")),
        "contributor_affiliation": metadata.get(
            "contributor_affiliation",
            metadata.get("provider_affiliation", ""),
        ),
        "contact": metadata.get("contact", ""),
        "preview_image": preview_image,
        "preview_alt": f"Representative X-ray micro-CT slice preview for {title}",
        "mask_preview_image": mask_preview_image,
        "mask_preview_alt": f"Representative grayscale segmentation mask preview for {title}",
        "source_config": f"dataset/configs/{record_id}.json",
        "source_image_folder": f"dataset/images/{record_id}/images",
        "source_mask_folder": f"dataset/images/{record_id}/masks",
        "source_image_count": len(images),
        "source_mask_count": len(masks),
        "notes": metadata.get("notes", ""),
        "config_notes": config.get("_notes", {}),
        "manual_review_needed": metadata.get(
            "manual_review_needed",
            ["repository_url", "doi", "license", "scanner", "citation"],
        ),
        "mask_label_values": mask_label_values,
        "mask_label_value_count": len(mask_label_values) or config.get("num_classes", ""),
        "active_mask_label_values": mask_label_values,
        "active_mask_label_value_count": len(mask_label_values) or config.get("num_classes", ""),
    }


def update_catalog(record: dict) -> None:
    records = json.load(open(CATALOG_PATH))
    records = [item for item in records if item.get("id") != record["id"]]
    records.append(record)
    records.sort(key=lambda item: item.get("id", ""))
    with open(CATALOG_PATH, "w") as handle:
        json.dump(records, handle, indent=2, ensure_ascii=True)
        handle.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Import a Leaf CT Hub dataset into the web catalog.")
    parser.add_argument("--id", required=True, help="Dataset id, used for folders and catalog record.")
    parser.add_argument("--images-dir", required=True, type=Path, help="Folder containing raw X-ray micro-CT image slices.")
    parser.add_argument("--masks-dir", required=True, type=Path, help="Folder containing segmentation masks.")
    parser.add_argument("--config", required=True, type=Path, help="Config JSON with class_names and mapping.")
    parser.add_argument("--metadata", type=Path, help="Optional metadata JSON from the submission form.")
    args = parser.parse_args()

    record_id = args.id.strip()
    target_images = ROOT / "dataset" / "images" / record_id / "images"
    target_masks = ROOT / "dataset" / "images" / record_id / "masks"
    target_config = ROOT / "dataset" / "configs" / f"{record_id}.json"

    copy_tree_contents(args.images_dir, target_images)
    copy_tree_contents(args.masks_dir, target_masks)
    target_config.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(args.config, target_config)

    config = json.load(open(target_config))
    metadata = json.load(open(args.metadata)) if args.metadata else {}
    config["name"] = record_id
    config["image_dir"] = str(target_images)
    config["mask_dir"] = str(target_masks)
    with open(target_config, "w") as handle:
        json.dump(config, handle, indent=2, ensure_ascii=True)
        handle.write("\n")

    images = image_files(target_images)
    masks = image_files(target_masks)
    preview_image = save_raw_preview(record_id, images)
    mask_preview_image = save_mask_preview(record_id, masks)
    record = build_record(record_id, metadata, config, images, masks, preview_image, mask_preview_image)
    update_catalog(record)

    print(f"Imported {record_id}")
    print(f"Images: {len(images)}")
    print(f"Masks: {len(masks)}")
    print(f"Preview: {preview_image}")
    print(f"Mask preview: {mask_preview_image}")


if __name__ == "__main__":
    main()
