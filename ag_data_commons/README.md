# Plan: Publishing the Leaf CT Hub dataset to USDA Ag Data Commons

Goal: every species/sample page on the site gets a working "View in Ag Data Commons"
link that points to *that record's own* dataset, not one generic link for everything.

## Recommended structure: one item per species/sample, grouped in one Collection

Ag Data Commons runs on the Figshare for Institutions platform. On Figshare,
an **item** (their name for a single dataset record) gets its own DOI when
published, and a **Collection** can group many items under one umbrella DOI
without giving up each item's individual DOI.

So the plan is:

1. Create **one Ag Data Commons item per catalog record** (101 total — 92 are
   already staged in `dataset_various/`, the other 9 — poplar_1..5,
   beilschmiedia_berteroana, calamagrostis_arundinacea, koelreuteria_paniculata,
   pleopeltis_guttata — exist on the site already but weren't in that folder,
   so their source images/masks need to be located before they can be
   uploaded too).
   - Each item = that species' `images/` + `masks/` + its config JSON
     (README/data dictionary describing the class mapping) as a zipped upload
     or individual files.
   - Each item gets published → gets its own DOI/URL.
2. Create **one Collection** ("Leaf CT Hub: multi-species leaf micro-CT
   segmentation dataset" or similar) and add all 101 items to it. The
   Collection DOI is what goes in the manuscript's Data Availability
   Statement; the individual item DOIs are what the website links to.
3. Website side (already wired, no code changes needed): fill in
   `repository_url` (item page URL) and `download_url` (direct file link,
   if Ag Data Commons/Figshare gives one) per record in `data/datasets.json`,
   then commit + push. `assets/js/datasets.js` already renders the button as
   a live link once those fields are non-empty.

## Before uploading: provenance / licensing to confirm

The raw images in most of these records were **not** captured by your team —
they were contributed by outside labs (from the config files' `_notes`):

- Mina Momayyezi — UC Davis, Dept. of Plant Sciences (almond, grape, olive, pistachio)
- Leila R. Fletcher — Southern Oregon University (arabidopsis)
- Aleca M. Borsuk — NY Botanical Garden (lantana_camara, v_* species)
- Jesse Gomez — UCLA (lantana_camara2, magnolia_grandiflora)
- Morgan E. Furze — Purdue University (oak_*)
- Santiago Trueba — AMAP Lab, Univ. of Montpellier (pine_*)
- Richard Harwood — Univ. of Sydney (wheat; scanned at the Australian Synchrotron, not Berkeley ALS)

Several already have a published paper of their own (e.g. oak_* cites
Momayyezi et al. 2025, AoB PLANTS, DOI 10.1093/aobpla/plaf063), and some raw
images may already sit in an existing Ag Data Commons or Zenodo record for
that paper. Before depositing, for each contributor:

- Confirm you have permission to redistribute their raw images publicly
  under Ag Data Commons' required CC0 / Public Domain license (Ag Data
  Commons will not accept a submission with unclear reuse rights).
- Credit them explicitly as an author or in "Image/mask provider" +
  affiliation on that item, and cite their paper if one exists.
- Where the raw images are already deposited elsewhere under their own DOI,
  consider whether your new item should link to that as the raw-data source
  and present your segmentation masks + config as the new contribution,
  rather than re-uploading their raw scans as if new.

None of the 101 records currently have a `repository_url` set, so this is a
first-time deposit for the whole catalog, not an update.

## Workflow once you're ready to upload

1. Request Ag Data Commons storage (My Data tab) — mention ~101 items,
   ~2.3 GB total. Approval typically takes up to 24h.
2. Because 101 manual item submissions through the web form is a lot of
   repetitive work, ask me to script bulk creation via the Figshare-compatible
   API Ag Data Commons runs on (needs a personal API token from your account
   settings — Figshare-style institutional instances typically expose this
   under Applications/API in account settings). I can loop through
   `ag_data_commons/submission_tracker.csv`, which already has each record's
   title/species/scanner/contributor/citation pre-filled from the site data,
   to create + upload + reserve a DOI for each item automatically.
   - If you'd rather pilot manually first: upload 2–3 records by hand through
     the web UI to see what curators flag, then decide whether to script the
     rest.
3. As each item is published, fill in its DOI/URL and any direct file link
   in the `ads_repository_url` / `ads_download_url` columns of
   `submission_tracker.csv`, mark `ads_status` (e.g. `published`).
4. Run:
   ```bash
   python3 ag_data_commons/update_repository_links.py --dry-run   # preview
   python3 ag_data_commons/update_repository_links.py             # apply
   ```
   This copies the filled-in URLs into `data/datasets.json` for the matching
   `id`s only — it never touches records that don't have a URL yet, so you
   can run it incrementally as items go up.
5. Check locally (`python3 -m http.server 8010`, open `datasets.html`), then
   `git add data/datasets.json ag_data_commons/submission_tracker.csv && git commit && git push`.

## Files in this folder

- `submission_tracker.csv` — one row per catalog record, metadata pre-filled
  from `data/datasets.json`, with empty `ads_item_title` / `ads_repository_url`
  / `ads_download_url` / `ads_status` columns for you to fill in as you upload.
- `update_repository_links.py` — applies the tracker's URLs into
  `data/datasets.json`. Safe to re-run; only changes rows with a URL filled in.
