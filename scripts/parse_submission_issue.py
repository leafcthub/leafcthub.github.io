#!/usr/bin/env python3
"""Parse a Leaf CT Hub "Dataset submission" GitHub issue body into a draft
metadata.json AND config.json, matching the format submit.js generates and
the field mapping documented in ADMIN_DATASET_UPLOAD.md.

This only drafts from what the contributor actually submitted -- it never
invents scientific facts, and it never guesses a pixel-to-class mapping the
contributor didn't provide. Anything missing is left blank for the admin to
fill in or ask the contributor about, same as the manual workflow.

Usage:
    python3 scripts/parse_submission_issue.py --body-file issue_body.txt --out-dir incoming/some_id
    cat issue_body.txt | python3 scripts/parse_submission_issue.py --out-dir incoming/some_id

Also prints a suggested dataset id (derived from scientific name) and a
checklist of what still needs manual admin attention.
"""
import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

# "- **Label:** value" line -> metadata.json key.
# Matches the labels submit.js writes via metadataLine(); "Not provided" maps to "".
FIELD_MAP = {
    "Scientific name": "scientific_name",
    "Common name": "common_name",
    "Treatment / condition": "treatment",
    "Imaging modality": "ct_modality",
    "Instrument / facility": "scanner",
    "Beam energy": "beam_energy_kev",
    "Objective": "objective",
    "Instrument location": "scan_location",
    "Image size": "image_size",
    "Voxel / pixel size": "voxel_size",
    "File format": "file_format",
    "Image/mask provider": "contributors",
    "Provider affiliation": "contributor_affiliation",
    "Repository URL": "repository_url",
    "Paper DOI or publication link": "paper_reference_raw",
}

# "## Section" headers followed by a single freeform value line (or "Not provided").
SECTION_MAP = {
    "Notes for processing": "notes",
    "Contact email": "contact",
}

# The 14 fixed checkbox values on submit.html, as they appear in the issue
# body (submit.js writes them space-separated: className.replaceAll("_", " ")),
# mapped back to the underscore form used everywhere else in this catalog.
KNOWN_CLASS_LABELS = {
    "Background": "Background",
    "Air space": "Air_Space",
    "Epidermis": "Epidermis",
    "Adaxial epidermis": "Adaxial_Epidermis",
    "Abaxial epidermis": "Abaxial_Epidermis",
    "Mesophyll": "Mesophyll",
    "Palisade mesophyll": "Palisade_Mesophyll",
    "Spongy mesophyll": "Spongy_Mesophyll",
    "Vascular region": "Vascular_Region",
    "Vascular tissue": "Vascular_Tissue",
    "Vascular bundle": "Vascular_Bundle",
    "Bundle sheath": "Bundle_Sheath",
    "Resin duct": "Resin_Duct",
    "Transfusion tissue": "Transfusion_Tissue",
}


def slugify(scientific_name: str) -> str:
    """Best-effort dataset id suggestion -- admin should verify/adjust it.

    Real ids in this catalog are often abbreviated or don't purely follow
    scientific name (e.g. almond_drought, v_carlsii), so this is only a
    starting point, never used automatically.
    """
    if not scientific_name:
        return ""
    text = unicodedata.normalize("NFKD", scientific_name).encode("ascii", "ignore").decode()
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")


def class_name_key(label: str) -> str:
    """Turn an issue-body class label back into the catalog's underscore form."""
    if label in KNOWN_CLASS_LABELS:
        return KNOWN_CLASS_LABELS[label]
    return re.sub(r"\s+", "_", label.strip())


def parse_body(body: str) -> dict:
    fields = {}
    for label, key in FIELD_MAP.items():
        pattern = re.compile(r"^- \*\*" + re.escape(label) + r":\*\*\s*(.+)$", re.MULTILINE)
        m = pattern.search(body)
        if not m:
            continue
        value = m.group(1).strip()
        fields[key] = "" if value == "Not provided" else value

    for heading, key in SECTION_MAP.items():
        pattern = re.compile(
            r"^## " + re.escape(heading) + r"\s*\n\s*\n(.+?)(?=\n\n##|\Z)",
            re.MULTILINE | re.DOTALL,
        )
        m = pattern.search(body)
        if not m:
            continue
        value = m.group(1).strip()
        fields[key] = "" if value == "Not provided" else value

    return fields


def parse_segmentation(body: str) -> dict:
    """Extract class-name/pixel-value pairs and the ignore/border value.

    Returns {"pairs": [(class_name_key, int|None), ...], "unresolved": [labels
    with no value given], "ignore_index": int|None}.
    """
    section = re.search(
        r"^## Segmentation classes and pixel values\s*\n\s*\n(.+?)(?=\n\n##|\Z)",
        body,
        re.MULTILINE | re.DOTALL,
    )
    result = {"pairs": [], "unresolved": [], "ignore_index": None}
    if not section:
        return result

    block = section.group(1)
    for line in block.splitlines():
        line = line.strip()
        row = re.match(r"^- (.+?):\s*(.+)$", line)
        if row:
            label, raw_value = row.group(1).strip(), row.group(2).strip()
            key = class_name_key(label)
            if raw_value.isdigit():
                result["pairs"].append((key, int(raw_value)))
            else:
                result["unresolved"].append(label)
            continue
        ignore_row = re.match(r"^Ignore / border pixel value:\s*(.+)$", line)
        if ignore_row:
            raw_value = ignore_row.group(1).strip()
            if raw_value.isdigit():
                result["ignore_index"] = int(raw_value)

    return result


def build_metadata(fields: dict) -> dict:
    metadata = {
        "scientific_name": fields.get("scientific_name", ""),
        "common_name": fields.get("common_name", ""),
        "treatment": fields.get("treatment", ""),
        "ct_modality": fields.get("ct_modality", "X-ray micro-CT"),
        "scanner": fields.get("scanner", ""),
        "beam_energy_kev": fields.get("beam_energy_kev", ""),
        "objective": fields.get("objective", ""),
        "scan_location": fields.get("scan_location", ""),
        "image_size": fields.get("image_size", ""),
        "voxel_size": fields.get("voxel_size", ""),
        "file_format": fields.get("file_format", ""),
        "contributors": fields.get("contributors", ""),
        "contributor_affiliation": fields.get("contributor_affiliation", ""),
        "repository_url": fields.get("repository_url", ""),
        "contact": fields.get("contact", ""),
        "notes": fields.get("notes", ""),
        # Not directly derivable from the form -- admin fills these in,
        # same as the manual workflow (see ADMIN_DATASET_UPLOAD.md).
        "family": "",
        "plant_category": "",
        "plant_group": "",
        "repository": "USDA Ag Data Commons",
        "license": "",
        "doi": "",
        "publication_url": "",
        "citation": "",
    }

    # The DOI/publication link needs a human decision (which field it is,
    # plus building an APA citation) -- keep the raw text visible rather
    # than guessing which bucket it belongs in.
    paper_ref = fields.get("paper_reference_raw", "")
    if paper_ref:
        metadata["paper_reference_raw"] = paper_ref

    return metadata


def build_config(record_id: str, segmentation: dict) -> dict | None:
    pairs = segmentation["pairs"]
    if not pairs:
        return None

    class_names = [key for key, _value in pairs]
    mapping = {str(value): index for index, (_key, value) in enumerate(pairs)}

    return {
        "name": record_id,
        "num_classes": len(class_names),
        "ignore_index": segmentation["ignore_index"],
        "has_bse_label": False,
        "class_names": class_names,
        "mapping": mapping,
    }


def checklist(metadata: dict, segmentation: dict, config_written: bool) -> list[str]:
    items = []
    if not metadata.get("family"):
        items.append("Fill in `family` and `plant_category` from the scientific name.")
    if metadata.get("paper_reference_raw"):
        items.append(
            "Split `paper_reference_raw` into `doi` / `publication_url`, then write an APA `citation`."
        )
    if segmentation["unresolved"]:
        names = ", ".join(segmentation["unresolved"])
        items.append(
            f"No pixel value was given for: {names} -- ask the contributor, config.json is incomplete without it."
        )
    if not config_written:
        items.append(
            "No usable class/pixel-value pairs were submitted -- config.json could not be drafted at all, build it from the actual mask files."
        )
    else:
        items.append(
            "config.json was auto-drafted from the contributor's submitted pixel values -- "
            "spot-check it against the actual mask files before trusting it (self-reported values aren't independently verified)."
        )
    if not metadata.get("repository_url"):
        items.append(
            "No dataset link was submitted -- get the actual image/mask files from the contributor directly."
        )
    items.append("Confirm reuse permission / licensing before publishing.")
    items.append("Add the real images/masks to this folder, then the import Action takes over.")
    return items


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--body-file", type=argparse.FileType("r", encoding="utf-8"))
    parser.add_argument("--out-dir", required=True, help="Directory to write metadata.json and config.json into.")
    parser.add_argument("--id", help="Dataset id to use in config.json's name field (defaults to the folder name).")
    args = parser.parse_args()

    body = args.body_file.read() if args.body_file else sys.stdin.read()
    fields = parse_body(body)
    segmentation = parse_segmentation(body)
    metadata = build_metadata(fields)
    suggested_id = slugify(metadata.get("scientific_name", ""))
    record_id = args.id or suggested_id or Path(args.out_dir).name

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    metadata_path = out_dir / "metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
        f.write("\n")

    config = build_config(record_id, segmentation)
    config_path = out_dir / "config.json"
    if config:
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
            f.write("\n")

    print(f"Wrote {metadata_path}")
    print(f"Wrote {config_path}" if config else f"Could not draft {config_path} -- no class/pixel-value pairs submitted")
    print(f"Suggested id (verify before use): {suggested_id or '(none -- no scientific name found)'}")
    print()
    print("Still needs admin attention:")
    for item in checklist(metadata, segmentation, config is not None):
        print(f"  - {item}")


if __name__ == "__main__":
    main()
