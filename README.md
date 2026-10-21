# Leaf CT Hub

Leaf CT Hub is an open-source website for sharing, discovering, and cataloging plant and leaf X-ray micro-CT datasets.

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Open Source](https://img.shields.io/badge/Open%20Source-Yes-brightgreen.svg)
![Platform](https://img.shields.io/badge/Platform-GitHub%20Pages-orange.svg)
![Research](https://img.shields.io/badge/Research-USDA--ARS-navy.svg)

Official website: https://leafcthub.github.io/

The catalog includes dataset metadata, preview images, segmentation masks, annotation classes, contributor attribution, and links to trusted repository records.

## What The Site Includes

- Searchable plant and leaf X-ray micro-CT dataset catalog
- Dataset cards with paired raw image and mask previews
- Dataset detail pages with plant, imaging, annotation, source, and attribution metadata
- Dataset submission form for sharing metadata and a dataset link
- Companion link to the Leaf CT Segmentation App

## Repository Structure

```text
leafcthub.github.io/
├── index.html
├── datasets.html
├── dataset.html
├── submit.html
├── about.html
├── assets/
│   ├── css/
│   ├── images/
│   └── js/
├── data/
│   └── datasets.json
├── dataset/
│   └── configs_public/
├── scripts/
│   ├── import_dataset.py
│   ├── parse_submission_issue.py
│   └── submission_receiver.gs
├── ADMIN_DATASET_UPLOAD.md
├── README.md
└── LICENSE
```

Large raw image and mask stacks are not stored in this repository.

## Dataset Records

Each record can include:

- Scientific name, common name, and family
- Imaging modality, instrument/facility, and location
- Image size, file format, and image/mask counts
- Annotation classes and mask label values
- Contributor name, affiliation, and contact
- Repository link, DOI or publication link, and citation

## Contributing Data

Use the Submit page on the website to share dataset metadata and a dataset or repository link:

https://leafcthub.github.io/submit.html

Submissions are sent privately to the Leaf CT Hub team (they are not posted publicly). The team reviews them, confirms dataset access and attribution, prepares preview images, and updates the catalog.

## Adding a Submitted Dataset (for admins)

Requests from the Submit page arrive by email and as a row in a private Google Sheet. The full, step-by-step procedure, with exact commands and reply templates, is in [ADMIN_DATASET_UPLOAD.md](ADMIN_DATASET_UPLOAD.md). In short:

1. Reply to the contributor to confirm receipt, and set the row's Status in the Sheet to `Acknowledged`.
2. Make a draft from the request: `python3 scripts/parse_submission_issue.py --body-file body.txt --out-dir incoming/<id>`.
3. Fill in the details only an admin can decide (family, category, license, citation) and check `config.json`.
4. Get the images and masks from the contributor, check them, and store them in the team storage.
5. Import: `python3 scripts/import_dataset.py --id <id> --images-dir ... --masks-dir ... --config ... --metadata ...`.
6. Check the site locally (`python3 -m http.server 8010`), then commit and push to publish.
7. Tell the contributor it is live, and set Status to `Added to catalog`.

One-time setup of the private receiver (the Google Sheet and script behind the Submit page) is described in the same guide, under "Set up the private submission receiver".

## Data Maintainers

- Dr. Worasit Sangjan, USDA-ARS researcher
- Dr. Devin A. Rippner, USDA-ARS researcher

## License

Website code is released under the MIT License.

Dataset images, masks, and metadata remain attributed to their respective contributors. See dataset pages for source attribution and reuse information.
