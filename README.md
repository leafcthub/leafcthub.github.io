# Leaf CT Hub

Open-source platform for sharing, discovering, and cataloging plant and leaf X-ray micro-CT datasets linked to trusted repository records and segmentation tools.

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Open Source](https://img.shields.io/badge/Open%20Source-Yes-brightgreen.svg)
![Platform](https://img.shields.io/badge/Platform-GitHub%20Pages-orange.svg)
![Research](https://img.shields.io/badge/Research-USDA--ARS-navy.svg)

Leaf CT Hub is a lightweight scientific catalog for plant and leaf X-ray micro-CT imaging datasets. The current catalog includes 92 dataset records, 13 plant categories, and 1,147 annotated image slices.

The website serves as a discovery platform where researchers can:

- Browse plant and leaf X-ray micro-CT datasets
- Explore metadata, preview images, segmentation masks, and annotation classes
- Access DOI-backed repository records and trusted data links
- Open companion segmentation resources
- Share dataset metadata through a GitHub Issue submission workflow

---

## Website

```text
Leaf CT Hub Website
        ↓
Dataset Catalog
        ↓
Dataset Detail Page
        ↓
Trusted Repository Record
        ↓
X-ray micro-CT Images + Metadata + Downloads
```

Main pages:

- `index.html`: home page, catalog summary, representative records, and segmentation tools
- `datasets.html`: searchable dataset catalog
- `dataset.html`: dataset detail page
- `submit.html`: dataset submission form that opens a pre-filled GitHub issue
- `about.html`: redirect to home

---

## Technology

- HTML
- CSS
- JavaScript
- GitHub Pages
- Local JSON metadata
- Trusted repository links for large datasets

---

## Repository Structure

```text
leaf-ct-hub/
├── index.html
├── datasets.html
├── dataset.html
├── submit.html
├── about.html        # Redirects to home
├── assets/
│   ├── css/
│   ├── images/
│   └── js/
├── data/
│   └── datasets.json
├── dataset/
│   ├── configs/
│   └── configs_more_than_5_colors/
├── scripts/
│   └── import_dataset.py
├── ADMIN_DATASET_UPLOAD.md
├── PROJECT_MEMORY.md
├── README.md
└── LICENSE
```

Large raw image stacks and mask stacks are intentionally excluded from GitHub:

```text
dataset/images/
```

---

## Dataset Metadata Example

```json
{
  "title": "Example leaf X-ray micro-CT dataset",
  "scientific_name": "Olea europaea",
  "common_name": "Olive",
  "family": "Oleaceae",
  "ct_modality": "X-ray micro-CT",
  "scanner": "X-ray μCT beamline (8.3.2) at the Advanced Light Source, Lawrence Berkeley National Laboratory",
  "scan_location": "Berkeley, CA, United States",
  "image_size": "1503 x 501",
  "source_image_count": 30,
  "source_mask_count": 30,
  "file_format": "TIF",
  "contributors": "Image/mask provider name",
  "contributor_affiliation": "Department or lab, institution, city/region, country",
  "repository": "USDA Ag Data Commons",
  "repository_url": "",
  "doi": "",
  "publication_url": "",
  "license": "Reuse permission confirmed",
  "citation": "",
  "classes": [
    "Background",
    "Adaxial_Epidermis",
    "Abaxial_Epidermis",
    "Bundle_Sheath",
    "Vascular_Tissue",
    "Palisade_Mesophyll",
    "Spongy_Mesophyll",
    "Air_Space"
  ]
}
```

Class names should describe the real annotation classes when available. If `Bundle_Sheath` is a separate class, use `Vascular_Tissue` instead of `Vascular_Region`.

---

## Contribution Workflow

1. Upload or share the dataset through trusted storage or a DOI-backed repository
2. Confirm reuse permission, provider credit, preview images, and APA-style citation when a publication is provided
3. Submit metadata through the website form
4. Admins review the GitHub issue, process previews, and update the catalog

The public Submit page asks contributors for the dataset/repository link and an optional paper DOI or publication link. Admins convert that publication reference into the internal `doi`, `publication_url`, and APA-style `citation` fields when adding the catalog record.

---

## Current Features

- Static GitHub Pages website
- Searchable dataset catalog
- Dataset cards with paired raw/mask preview images
- Dataset detail pages with plant, equipment, source, and annotation metadata
- Catalog summary and representative records on the home page
- Segmentation app link
- GitHub Issue-based dataset submission form
- Admin import script and upload workflow guide
- JSON-based metadata storage

---

## Dataset Providers

Current catalog records include data credited to:

- Aleca M. Borsuk
- Jesse Gomez
- Leila R. Fletcher
- Mina Momayyezi
- Morgan Furze
- Richard Harwood
- Santiago Trueba

---

## Future Work

- Improved dataset filtering
- Species/category browsing
- Interactive CT slice preview
- Benchmark dataset section
- Contributor dashboard
- Ag Data Commons API integration

---

## Hosting

- Website: GitHub Pages
- Metadata: `data/datasets.json`
- Preview images: `assets/images/`
- Dataset configs: `dataset/configs/` and `dataset/configs_more_than_5_colors/`
- Large dataset storage: trusted external repositories, not GitHub Pages

---

## License

MIT License

---

## Maintainer

Dr. Worasit Sangjan and Dr. Devin A. Rippner  

USDA-ARS Researchers
