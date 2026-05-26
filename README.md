# Leaf CT Hub

Leaf CT Hub is an open-source website for sharing, discovering, and cataloging plant and leaf X-ray micro-CT datasets.

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
│   ├── configs/
│   └── configs_more_than_5_colors/
├── scripts/
│   └── import_dataset.py
├── ADMIN_DATASET_UPLOAD.md
├── README.md
└── LICENSE
```

Large raw image and mask stacks are not stored in this repository.

## Dataset Records

Catalog metadata is stored in:

```text
data/datasets.json
```

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

The Leaf CT Hub team reviews submissions, confirms dataset access and attribution, prepares preview images, and updates the catalog.

Admin workflow notes are in:

```text
ADMIN_DATASET_UPLOAD.md
```

## Development

This is a static website built with HTML, CSS, JavaScript, and JSON metadata. It can be run locally with:

```bash
python3 -m http.server 8010
```

Then open:

```text
http://localhost:8010/
```

## License

Website code is released under the MIT License.

Dataset images, masks, and metadata remain attributed to their respective contributors. See dataset pages for source attribution and reuse information.
