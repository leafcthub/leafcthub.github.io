# Admin Dataset Upload Workflow

This guide explains how a Leaf CT Hub admin reviews a submitted dataset, stores it in the project dataset structure, generates previews, and updates the website catalog.

## Overview

Contributors submit dataset information through the website form. The form creates a GitHub issue with metadata and links to the dataset. Admins review the issue, download the dataset, upload/store it in the team storage workflow, and then run the import command below to update the web catalog.

The website does not directly accept large file uploads. Large X-ray micro-CT image stacks and masks should be stored in trusted storage first.

## Admin Steps

1. Open the new GitHub issue created from the Submit page.
2. Check that the contributor provided:
   - Dataset title
   - Scientific name
   - Common name, if available
   - Family
   - Imaging modality
   - Instrument/facility and instrument location, if available
   - Image size, image/mask pair count, and file format
   - Dataset/repository link
   - Paper DOI or publication link, if available
   - Image/mask provider and affiliation, if available
   - Segmentation label information
   - Notes about folder structure or mask encoding
3. Download the dataset from the provided link.
4. Review the dataset locally:
   - Confirm raw X-ray micro-CT images are present.
   - Confirm segmentation masks are present.
   - Confirm image and mask filenames match or can be paired.
   - Confirm the config file describes class names and label mapping.
5. Upload/store the reviewed dataset in the team’s standard storage location.
6. Prepare a local import folder.

Example local structure:

```text
new_dataset/
├── images/
│   ├── slice_001.tif
│   ├── slice_002.tif
│   └── ...
├── masks/
│   ├── slice_001.tif
│   ├── slice_002.tif
│   └── ...
├── config.json
└── metadata.json
```

## Required Config File

The import script expects a config JSON file with class names and mask-value mapping.

Example:

```json
{
  "name": "olive_example",
  "num_classes": 5,
  "ignore_index": 254,
  "has_bse_label": false,
  "class_names": [
    "Background",
    "Epidermis",
    "Vascular_Region",
    "Mesophyll",
    "Air_Space"
  ],
  "mapping": {
    "170": 0,
    "85": 1,
    "95": 1,
    "152": 2,
    "180": 2,
    "0": 3,
    "255": 4
  }
}
```

Notes:

- `num_classes` is the semantic class count.
- `mapping` contains the raw mask values and the semantic class index each value maps to.
- If multiple raw mask values map to one semantic class, keep them all in `mapping`.
- The website will display both semantic class count and raw mask-value count.

## Metadata Style

Use the same pattern for all equipment fields:

- `scanner`: instrument or beamline plus facility name
- `scan_location`: city, state/region, and country only

Examples:

```text
X-ray μCT beamline (8.3.2) at the Advanced Light Source, Lawrence Berkeley National Laboratory
Berkeley, CA, United States

Micro-CT beamline at the Australian Synchrotron
Clayton, Melbourne, VIC, Australia
```

Use the same pattern for provider fields:

- `contributors`: image/mask provider names
- `contributor_affiliation`: department/lab, institution, city/region, country
- `contact`: provider email or preferred contact, when available

If a contributor provides a paper DOI or publication link, convert it into:

- `doi`, when a DOI is available
- `publication_url`, when a publication page is available
- `citation`, formatted in APA style

## Required Metadata File

Create a small `metadata.json` file from the submitted GitHub issue.

Use this mapping from the Submit page:

```text
Dataset title                  -> title
Scientific name                -> scientific_name
Common name                    -> common_name
Family                         -> family
Imaging modality               -> ct_modality
Instrument / facility          -> scanner
Instrument location            -> scan_location
Image size                     -> image_size
File format                    -> file_format
Image/mask provider            -> contributors
Provider affiliation           -> contributor_affiliation
Dataset or repository link     -> repository_url
Paper DOI or publication link  -> doi and/or publication_url, then create citation
Contact                        -> contact
Notes for processing           -> notes
```

Example:

```json
{
  "title": "Olea europaea leaf X-ray micro-CT dataset",
  "scientific_name": "Olea europaea",
  "common_name": "Olive",
  "family": "Oleaceae",
  "plant_category": "Olive",
  "plant_group": "Angiosperm",
  "ct_modality": "X-ray micro-CT",
  "scanner": "X-ray μCT beamline (8.3.2) at the Advanced Light Source, Lawrence Berkeley National Laboratory",
  "scan_location": "Berkeley, CA, United States",
  "image_size": "1503 x 501",
  "file_format": "TIF",
  "repository": "USDA Ag Data Commons",
  "repository_url": "https://example.org/record",
  "doi": "10.xxxx/example",
  "publication_url": "https://example.org/publication",
  "license": "Reuse permission confirmed",
  "citation": "Author, A. A. (Year). Article title. Journal, volume(issue), pages. https://doi.org/example",
  "contributors": "Image/mask provider names",
  "contributor_affiliation": "Department or lab, institution, city/region, country",
  "contact": "name@example.com",
  "notes": "Any important notes about mask encoding, folder structure, or review."
}
```

Leave unknown fields blank rather than guessing. If a contributor provides a DOI or publication link, use it to create an APA-style `citation` before adding the record. Only publish records after reuse permission or repository licensing has been confirmed.

## Import Command

From the repository root, run:

```bash
python3 scripts/import_dataset.py \
  --id new_dataset_id \
  --images-dir /path/to/new_dataset/images \
  --masks-dir /path/to/new_dataset/masks \
  --config /path/to/new_dataset/config.json \
  --metadata /path/to/new_dataset/metadata.json
```

Example:

```bash
python3 scripts/import_dataset.py \
  --id olive_example \
  --images-dir ~/Downloads/olive_example/images \
  --masks-dir ~/Downloads/olive_example/masks \
  --config ~/Downloads/olive_example/config.json \
  --metadata ~/Downloads/olive_example/metadata.json
```

## What the Script Updates

The import script copies and updates files in the same structure used by the existing catalog:

```text
dataset/images/<id>/images/
dataset/images/<id>/masks/
dataset/configs/<id>.json
assets/images/previews/<id>.jpg
assets/images/masks/<id>.jpg
data/datasets.json
```

The script also:

- Counts image slices.
- Counts mask files.
- Detects image size.
- Records image/mask pair counts.
- Creates the raw X-ray micro-CT preview image.
- Creates the grayscale mask preview image.
- Adds the new record to `data/datasets.json`.
- Records raw mask values from the config mapping.

## Check the Website Locally

Start the local website:

```bash
python3 -m http.server 8010
```

Open:

```text
http://localhost:8010/datasets.html
```

Check:

- The new dataset card appears.
- Raw and mask previews display correctly.
- Species name is correct.
- Image size, image/mask pair count, and file format are correct.
- Mask values and semantic classes look reasonable.
- The dataset detail page opens.

## Publishing the Shared Config Copy

`dataset/configs/` is the internal working folder — it is gitignored and never pushed to GitHub. It can hold admin-only notes (internal file paths, TODOs, unfiltered contributor correspondence) that should not go out with the shared data.

Before committing a new or updated dataset, generate its public copy in `dataset/configs_public/<id>.json`: same `class_names`/`mapping`/`num_classes`/`ignore_index` as the internal config, but with `_notes` trimmed to only what's meaningful to an external data user (attribution, imaging setup, citation, per-value pixel meanings) — drop internal-only bookkeeping (filesystem paths, TODO/review flags, session changelog notes). This is the folder that actually ships in the repo.

All dataset configs — including ones with more than 5 raw mask values — live together in one folder each (no separate folder for configs with more raw values). Keep `class_names`/`mapping` fully expanded to match the actual raw pixel values whenever the source notes support it, rather than leaving it collapsed to a generic 5-class scheme.

## Final GitHub Update

After checking locally:

```bash
git status
git add data/datasets.json dataset/images dataset/configs_public assets/images/previews assets/images/masks
git commit -m "Add new Leaf CT Hub dataset"
git push
```

`dataset/configs/` and `dataset/images/` are both gitignored and never staged — only their public/lightweight counterparts (`dataset/configs_public/`, preview images) go into the commit.

## Admin Notes

- Do not guess taxonomy. If family, scientific name, DOI, or reuse permission is unclear, ask the contributor.
- Keep `license` as an internal/admin field. Use it to record repository license text or reuse-permission status when available.
- Keep large source data in the team storage workflow. The website should only include lightweight catalog files and preview images.
- Use stable dataset IDs with lowercase letters, numbers, and underscores.
- Avoid spaces in dataset IDs.
- Do not use temporary prefixes such as `test_` for final web records.
