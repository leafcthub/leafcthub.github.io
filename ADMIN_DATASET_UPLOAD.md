# Admin Dataset Upload Workflow

This guide explains how a Leaf CT Hub admin reviews a submitted dataset, stores it in the project dataset structure, generates previews, and updates the website catalog.

## New Admin Setup

Everything below only needs:

1. **GitHub push access to this repo** -- enough to push commits to `main` (or to a branch you merge yourself). Ask the repo owner to add you as a collaborator.
2. **Git and Python 3** installed locally.
3. **One dependency:** from the repo root, run `pip install -r requirements.txt` (installs Pillow, the only package `scripts/import_dataset.py` needs).
4. This file, read once.

You do **not** need: Ag Data Commons account credentials, GoatCounter analytics access, or any repo secrets. Depositing to Ag Data Commons ("Depositing to USDA Ag Data Commons" below) is a separate, later step that can stay restricted to whoever holds that account; you can do everything else in this guide without it.

## Overview

Contributors submit dataset information through the website form at `submit.html`. The form is private: it posts to a small Google Apps Script (`scripts/submission_receiver.gs`) that saves each request as a row in a private Google Sheet and emails it to the admin address(es). Nothing is posted publicly. The Sheet is the permanent record, so a request is never lost even if an email is delayed. The web address of the script is the `data-endpoint` attribute on the form in `submit.html`.

Each email contains the request in the same layout the old GitHub-issue body used. Save that text to a file and run the draft script on it (see Admin Step 1). From there, an admin reviews the draft, downloads the dataset, uploads/stores it in the team storage workflow, and runs the import command below to update the web catalog.

### Set up the private submission receiver (one time)

1. In Google Drive create a new Google Sheet named "Leaf CT Hub requests". Share it with the other admin(s) if they should see requests.
2. In the Sheet choose Extensions -> Apps Script. Delete the sample code and paste in the whole of `scripts/submission_receiver.gs`. At the top of the script, set `NOTIFY_EMAILS` to the admin address(es), separated by commas. Save.
3. Choose Deploy -> New deployment. Type: Web app. Execute as: **Me**. Who has access: **Anyone**. Click Deploy and approve the permission screen (Google will warn that the app is unverified; choose Advanced -> Go to project). The script only writes to this Sheet and sends mail from your account.
4. Copy the Web app URL (it ends in `/exec`). Open it in a browser: you should see `{"ok":true,"message":"Leaf CT Hub receiver is running."}`.
5. Put that URL in `submit.html`, in `data-endpoint="..."` on the `<form data-submission-form>` tag, commit and publish.
6. Test: submit the form on the live site and check that a row appears in the Sheet and an email arrives. Delete the test row.

If you change the script later, use Deploy -> Manage deployments -> edit -> New version, so the web address stays the same. Google limits a free account to about 100 emails a day, far more than this form needs.

The website does not directly accept large file uploads. Large X-ray micro-CT image stacks and masks should be stored in trusted storage first.

Datasets added directly by an admin (bulk imports, data sourced outside the submit form) skip the draft step entirely -- start at Admin Step 2 and commit straight to `main` at the end (see "Final GitHub Update").

## After a Request Arrives: Reply and Track

**Who replies.** Whichever admin opens the email first. Reply the same working day if you can, and **before** doing anything else set that row's **Status** in the Google Sheet to `Acknowledged`, so the other admin does not send a second reply. If you are away, the other admin covers.

**How.** Press Reply on the notification email. Reply goes to the contributor, not to the other admin. Do not forward their contact email anywhere public.

**Status column** (dropdown in the Sheet, set by hand as the request moves along):

| Status | Meaning |
|---|---|
| New | Just arrived; nobody has replied yet |
| Acknowledged | You replied to confirm receipt |
| Waiting for contributor | You asked for more information or the data |
| Added to catalog | The dataset is live on the site |
| Declined | Not suitable; the contributor was told why |

Use the **Notes** column for anything worth remembering (who is handling it, what is missing, the `id` you chose, the date it went live).

**Standard replies.** Edit the bracketed parts. The turnaround time is yours to choose; do not promise more than you can keep.

*1. Receipt (send first, to every request):*

> Subject: Re: Leaf CT Hub dataset request: [species]
>
> Hello [name],
>
> Thank you for submitting your [species] dataset to Leaf CT Hub. We have received your request and will review it. We expect to get back to you within [N] working days.
>
> Your request was sent privately and has not been published. Datasets are added to the public catalog only after we confirm access, attribution and reuse terms with you.
>
> Best regards,
> [your name], Leaf CT Hub team

*2. We need more information or the data:*

> Hello [name],
>
> Thank you for your request. To add your dataset we still need: [list, for example the image and mask files, the pixel value for each class, the license you want to use, a citation or DOI].
>
> You can send the files by [shared drive link or email]. Please let us know if anything is unclear.
>
> Best regards,
> [your name], Leaf CT Hub team

*3. Added to the catalog:*

> Hello [name],
>
> Your [species] dataset is now live in the Leaf CT Hub catalog: [link to the record page]. Please check that the details and attribution are correct and tell us if anything needs changing.
>
> Thank you for contributing.
>
> Best regards,
> [your name], Leaf CT Hub team

*4. Cannot add it:*

> Hello [name],
>
> Thank you for your request. We are not able to add this dataset to the catalog because [reason, for example it does not include segmentation masks or the reuse terms are unclear]. If that changes, you are welcome to submit it again.
>
> Best regards,
> [your name], Leaf CT Hub team

**No automatic reply is sent to contributors.** The receiver script only emails the admins. A script that emailed whatever address a visitor typed could be abused to send mail to strangers, so confirmation is deliberately done by a person.

**Updating the receiver script.** If `scripts/submission_receiver.gs` changes (for example to add an admin email to `NOTIFY_EMAILS`), paste the new version into Apps Script, then use Deploy -> Manage deployments -> edit (pencil) -> Version: New version -> Deploy. Do not create a new deployment: that gives a new web address, and `data-endpoint` in `submit.html` would stop working. The Status dropdown and the Status and Notes headers are added automatically on the next request.

## Admin Steps

1. **Make the draft from the emailed request.** Copy the request text from the email (or from the Sheet row) into a file, then run:

   ```bash
   python3 scripts/parse_submission_issue.py --body-file body.txt --out-dir incoming/<id>
   ```

   This writes a draft `incoming/<id>/metadata.json`, and `config.json` too if the contributor gave a pixel value for every class they checked, and prints a checklist of what is still missing. Before doing anything else:
   - The suggested `id` is only a guess from the scientific name -- rename it to match this catalog's style (e.g. `almond_drought`, `v_carlsii`) if it doesn't, especially if two submissions would slugify to the same id.
   - It never downloads any files and never touches `data/datasets.json` -- both are still entirely on you.
   - `family`, `plant_category`, `plant_group`, `license`, `doi`/`publication_url`/`citation` are always left blank -- these need admin judgment and are never guessed.
   - `config.json`, when present, was built from the contributor's self-reported pixel values -- spot-check it against the actual mask files before trusting it, and check the checklist for any class the contributor left a value blank on (those are dropped from the draft entirely, not guessed).
   - The contributor's contact email is in the request. Do not paste it into any public file or pull request.
2. Check that the contributor provided:
   - Scientific name
   - Common name, if available
   - Treatment / condition, if available
   - Instrument/facility, beam energy, objective, and instrument location, if available
   - Image size, voxel/pixel size, and file format
   - Dataset/repository link, if available (often blank at submission time -- files usually reach the admin via email or a shared drive link first, and a public repository link only exists after the Ag Data Commons upload step)
   - Paper DOI or publication link, if available
   - Image/mask provider and affiliation, if available
   - Segmentation classes with their pixel values, and an ignore/border value if their masks use one
   - Notes about folder structure or mask encoding
3. Download the dataset from the provided link.
4. Review the dataset locally:
   - Confirm raw X-ray micro-CT images are present.
   - Confirm segmentation masks are present.
   - Confirm image and mask filenames match or can be paired.
   - Confirm the config file describes class names and label mapping.
5. Upload/store the reviewed dataset in the team’s standard storage location.
6. Finish building the local import folder. If you made a draft in Step 1, keep working in `incoming/<id>/` -- `metadata.json`, and often `config.json` too, are already started. Otherwise create both from scratch.

Example folder structure:

```text
incoming/<id>/            (or new_dataset/ if you skipped the draft)
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

The import script expects a config JSON file with class names and mask-value mapping. If the submission came through the form with a pixel value given for every class, this already exists as `incoming/<id>/config.json` from Admin Step 1 -- spot-check it against the real mask files rather than trusting it blindly (it's built from the contributor's self-reported numbers). Build it by hand only when there's no draft, or the draft is incomplete.

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
- `beam_energy_kev`: X-ray beam energy in keV, when the contributor or scan log states it.
- `objective`: the actual magnification (e.g. "10x"), when stated -- a different, unrelated scan property from beam energy. Leave both blank rather than guessing.

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

Create a small `metadata.json` file from the submitted request.

Use this mapping from the Submit page:

```text
Scientific name                -> scientific_name
Common name                    -> common_name
Treatment / condition          -> treatment
Instrument / facility          -> scanner
Beam energy                    -> beam_energy_kev
Objective                      -> objective
Instrument location            -> scan_location
Image size                     -> image_size
Voxel / pixel size             -> voxel_size
File format                    -> file_format
Image/mask provider            -> contributors
Provider affiliation           -> contributor_affiliation
Dataset or repository link     -> repository_url
Paper DOI or publication link  -> doi and/or publication_url, then create citation
Contact email                  -> contact
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
assets/images/gallery/<id>/raw/0001.jpg, 0002.jpg, ...
assets/images/gallery/<id>/mask/0001.jpg, 0002.jpg, ...
data/datasets.json
```

The script also:

- Counts image slices.
- Counts mask files.
- Detects image size.
- Records image/mask pair counts.
- Creates the raw X-ray micro-CT preview image (one representative slice, shown in the hero).
- Creates the grayscale mask preview image (one representative slice, shown in the hero).
- Generates a full paired raw/mask thumbnail gallery, one pair per slice, so a visitor can
  review every slice on the dataset page before downloading -- see
  "Reviewable Slice Gallery" below.
- Adds the new record to `data/datasets.json`, including the `gallery` field.
- Records raw mask values from the config mapping.

### Reviewable Slice Gallery

Every slice gets a small (260px, a few KB) raw/mask thumbnail pair, stored under
`assets/images/gallery/<id>/` and listed in the record's `gallery` field in
`data/datasets.json`. The dataset detail page renders these as a paired grid so
visitors can browse the full dataset without downloading it first. This is generated
automatically by `import_dataset.py` for a new dataset -- no extra step needed.

To (re)generate galleries for many species at once (e.g. after re-processing a batch
of source data), use the shared batch script instead:

```bash
python3 scripts/generate_gallery.py --source /path/to/dataset_various/images
python3 scripts/generate_gallery.py --source /path/to/dataset_various/images --only arabidopsis1 arabidopsis2
```

Both scripts share the same thumbnail logic (`scripts/_gallery.py`), so output is
identical either way. Full-resolution originals are never stored in this repo --
only these small preview thumbnails. The full-resolution images/masks stay in the
Ag Data Commons deposit; see "Depositing to USDA Ag Data Commons" below.

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
git add data/datasets.json dataset/images dataset/configs_public assets/images/previews assets/images/masks assets/images/gallery
git commit -m "Add new Leaf CT Hub dataset"
git push
```

`dataset/configs/` and `dataset/images/` are both gitignored and never staged — only their public/lightweight counterparts (`dataset/configs_public/`, preview images) go into the commit.

- **Working from a submitted request (Admin Step 1):** once everything checks out, push the commit to `main` as shown above. The push is what actually publishes it.
- **Bulk or manually sourced import:** the same -- push straight to `main`.

## Depositing to USDA Ag Data Commons

The website only ever holds metadata and small preview/gallery thumbnails (see above).
The actual full-resolution images and masks that visitors download live in a separate
USDA Ag Data Commons deposit. Ag Data Commons is used purely as storage here -- there's
no separate landing page distinct from the file's direct download link -- so one URL
gets written into both the `repository_url` and `download_url` fields of the record;
those two site fields power two different buttons (the detail page's "Download dataset"
and the gallery page's "Download from Ag Data Commons") but currently always point to
the same place.

Current approach: **one combined Ag Data Commons item for the whole collection**,
with each species/sample uploaded as its own `<id>.zip` (containing `images/`, `masks/`,
and its `config.json`). Zipping per species avoids Figshare/Ag Data Commons's per-item
file-count cap (hit at 333 loose files with only 3 species uploaded) -- the platform's
own file browser isn't the review experience for this data anyway; that job now belongs
to the on-site Reviewable Slice Gallery above.

Steps for a new species once it's been imported to the site (per the steps above):

1. Build that species' zip the same way the existing ones were built (`images/`, `masks/`,
   `config.json` at the top level of the zip, named `<id>.zip`).
2. Upload the zip to the existing Ag Data Commons item via the web UI. If the item is
   already published, this creates a new version -- expected as the collection grows.
3. Once the file is live, copy its download URL into that species' row in
   `ag_data_commons/submission_tracker.csv` (`ads_download_url`), and set `ads_status`.
4. Run:
   ```bash
   python3 ag_data_commons/update_repository_links.py --dry-run   # preview
   python3 ag_data_commons/update_repository_links.py             # apply
   ```
   This copies the filled-in URLs into `data/datasets.json` for matching `id`s only --
   safe to run incrementally as more species go up.
5. Commit and push `data/datasets.json` and the tracker CSV together with any site-side
   changes from the same session.

See `ag_data_commons/README.md` for the full background and provenance notes (several
species' raw images were contributed by outside labs and need attribution/permission
confirmed before their zip goes up).

## Admin Notes

- Do not guess taxonomy. If family, scientific name, DOI, or reuse permission is unclear, ask the contributor.
- Keep `license` as an internal/admin field. Use it to record repository license text or reuse-permission status when available.
- Keep large source data in the team storage workflow. The website should only include lightweight catalog files and preview images.
- Use stable dataset IDs with lowercase letters, numbers, and underscores.
- Avoid spaces in dataset IDs.
- Do not use temporary prefixes such as `test_` for final web records.
