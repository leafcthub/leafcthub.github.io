const catalogState = {
  datasets: [],
  query: "",
  category: "all",
  group: "all",
  className: "all",
  classes: "all",
  sort: "default",
  loaded: false,
};

const catalogElements = {
  grid: document.querySelector("[data-dataset-grid]"),
  count: document.querySelector("[data-result-count]"),
  search: document.querySelector("[data-search]"),
  category: document.querySelector("[data-category-filter]"),
  group: document.querySelector("[data-group-filter]"),
  className: document.querySelector("[data-class-name-filter]"),
  classes: document.querySelector("[data-class-filter]"),
  sort: document.querySelector("[data-sort]"),
  empty: document.querySelector("[data-empty-state]"),
  form: document.querySelector("[data-catalog-form]"),
  chips: document.querySelector("[data-active-filters]"),
  more: document.querySelector("[data-more-filters]"),
  moreCount: document.querySelector("[data-more-count]"),
};

const defaultCatalogValues = {
  query: "",
  category: "all",
  group: "all",
  className: "all",
  classes: "all",
  sort: "default",
};

const sortLabels = { name: "Name, A to Z", slices: "Most slices", classes: "Most classes" };

// Catalog state lives in the query string so filters survive Back and can be shared.
const catalogParams = {
  query: "q",
  category: "plant",
  group: "group",
  className: "class",
  classes: "n",
  sort: "sort",
};

function uniqueValues(records, key) {
  return [...new Set(records.map((record) => record[key]).filter(Boolean))].sort((a, b) => {
    const aNumber = Number(a);
    const bNumber = Number(b);
    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
      return aNumber - bNumber;
    }
    return String(a).localeCompare(String(b));
  });
}

function uniqueContributors(records) {
  const names = records.flatMap((record) => String(record.contributors || "").split(","));
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function uniqueClassNames(records) {
  return [...new Set(records.flatMap((record) => record.classes || []))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function addOptions(select, values, labelFor = (value) => value) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = labelFor(value);
    select.append(option);
  });
}

// "Classes" always means annotation classes (num_classes). Mask pixel values can differ
// from it and are shown separately on the card.
function classCount(record) {
  return Number(record.num_classes) || (record.classes || []).length || Number(record.mask_label_value_count) || 0;
}

function filteredDatasets() {
  const query = normalized(catalogState.query);
  const records = catalogState.datasets.filter((record) => {
    const matchesQuery = !query || normalized(datasetSearchText(record)).includes(query);
    const matchesCategory =
      catalogState.category === "all" || record.plant_category === catalogState.category;
    const matchesGroup = catalogState.group === "all" || record.plant_group === catalogState.group;
    const matchesClassName =
      catalogState.className === "all" || (record.classes || []).includes(catalogState.className);
    const matchesClasses =
      catalogState.classes === "all" || String(classCount(record)) === catalogState.classes;
    return matchesQuery && matchesCategory && matchesGroup && matchesClassName && matchesClasses;
  });

  if (catalogState.sort === "name") {
    records.sort((a, b) =>
      formatCardTitle(a).localeCompare(formatCardTitle(b), undefined, { numeric: true }),
    );
  } else if (catalogState.sort === "slices") {
    records.sort((a, b) => (Number(b.slice_count) || 0) - (Number(a.slice_count) || 0));
  } else if (catalogState.sort === "classes") {
    records.sort((a, b) => classCount(b) - classCount(a));
  }
  return records;
}

function syncCatalogControls() {
  catalogElements.search.value = catalogState.query;
  catalogElements.category.value = catalogState.category;
  catalogElements.group.value = catalogState.group;
  catalogElements.className.value = catalogState.className;
  catalogElements.classes.value = catalogState.classes;
  catalogElements.sort.value = catalogState.sort;
}

function writeCatalogParams() {
  const params = new URLSearchParams();
  Object.entries(catalogParams).forEach(([key, param]) => {
    const value = catalogState[key];
    if (value && value !== "all" && value !== "default") {
      params.set(param, value);
    }
  });
  const search = params.toString();
  history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
}

function readCatalogParams() {
  const params = new URLSearchParams(window.location.search);
  Object.entries(catalogParams).forEach(([key, param]) => {
    const value = params.get(param);
    if (value) {
      catalogState[key] = value;
    }
  });
  // An unknown value (stale link) would leave a select blank, so fall back to "all".
  syncCatalogControls();
  Object.keys(catalogParams).forEach((key) => {
    const select = catalogElements[key];
    if (key !== "query" && select.value !== catalogState[key]) {
      catalogState[key] = key === "sort" ? "default" : "all";
    }
  });
  syncCatalogControls();
}

function activeFilterChips() {
  const chips = [];
  if (catalogState.query.trim()) {
    chips.push(["query", `Search: "${catalogState.query.trim()}"`]);
  }
  if (catalogState.category !== "all") {
    chips.push(["category", `Plant: ${catalogState.category}`]);
  }
  if (catalogState.className !== "all") {
    chips.push(["className", `Class: ${catalogState.className.replaceAll("_", " ")}`]);
  }
  if (catalogState.group !== "all") {
    chips.push(["group", `Group: ${catalogState.group}`]);
  }
  if (catalogState.classes !== "all") {
    chips.push(["classes", `${catalogState.classes} classes`]);
  }
  return chips;
}

function renderActiveFilters() {
  const chips = activeFilterChips();
  catalogElements.chips.hidden = chips.length === 0;
  catalogElements.chips.replaceChildren(
    ...chips.map(([key, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-chip";
      button.dataset.removeFilter = key;
      button.setAttribute("aria-label", `Remove filter ${label}`);
      button.textContent = `${label} \u00d7`;
      return button;
    }),
  );
  if (chips.length) {
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "filter-chip filter-chip--clear";
    clear.dataset.clearFilters = "";
    clear.textContent = "Clear filters";
    catalogElements.chips.append(clear);
  }

  const hiddenActive =
    (catalogState.group !== "all" ? 1 : 0) +
    (catalogState.classes !== "all" ? 1 : 0) +
    (catalogState.sort !== "default" ? 1 : 0);
  catalogElements.moreCount.textContent = hiddenActive ? `(${hiddenActive} active)` : "";
  if (hiddenActive) {
    catalogElements.more.open = true;
  }
}

function renderCatalog() {
  if (!catalogState.loaded) {
    return;
  }
  const records = filteredDatasets();
  catalogElements.grid.replaceChildren(...records.map(createDatasetCard));
  catalogElements.count.textContent = `${records.length} dataset${records.length === 1 ? "" : "s"}`;
  catalogElements.empty.hidden = records.length !== 0;
  renderActiveFilters();
  writeCatalogParams();
}

let catalogSearchTimer;

function resetCatalogFilter(key) {
  catalogState[key] = defaultCatalogValues[key];
  syncCatalogControls();
  renderCatalog();
}

function clearCatalogFilters() {
  clearTimeout(catalogSearchTimer);
  Object.assign(catalogState, defaultCatalogValues);
  syncCatalogControls();
  renderCatalog();
}

async function loadCatalog() {
  try {
    catalogState.datasets = await loadDatasets();
    catalogState.loaded = true;
    addOptions(catalogElements.category, uniqueValues(catalogState.datasets, "plant_category"));
    addOptions(catalogElements.group, uniqueValues(catalogState.datasets, "plant_group"));
    addOptions(catalogElements.className, uniqueClassNames(catalogState.datasets), (name) =>
      name.replaceAll("_", " "),
    );
    addOptions(
      catalogElements.classes,
      [...new Set(catalogState.datasets.map(classCount).filter(Boolean))].sort((a, b) => a - b),
      (value) => `${value} classes`,
    );
    readCatalogParams();
    renderCatalog();
  } catch (error) {
    catalogElements.grid.innerHTML = `
      <div class="notice">
        <p>The dataset catalog could not be loaded. Check your connection, then try again.</p>
        <button class="button button--secondary" type="button" data-retry-load>Try again</button>
      </div>`;
    catalogElements.grid.querySelector("[data-retry-load]").addEventListener("click", () => {
      catalogElements.grid.textContent = "";
      loadCatalog();
    });
    console.error(error);
  }
}

function initCatalogPage() {
  if (!catalogElements.grid) {
    return;
  }

  // Listeners go on first so anything typed while the data loads is kept.
  catalogElements.search.addEventListener("input", (event) => {
    clearTimeout(catalogSearchTimer);
    catalogState.query = event.target.value;
    catalogSearchTimer = setTimeout(renderCatalog, 150);
  });

  [
    ["category", catalogElements.category],
    ["group", catalogElements.group],
    ["className", catalogElements.className],
    ["classes", catalogElements.classes],
    ["sort", catalogElements.sort],
  ].forEach(([key, select]) => {
    select.addEventListener("change", (event) => {
      catalogState[key] = event.target.value;
      renderCatalog();
    });
  });

  catalogElements.form.addEventListener("submit", (event) => event.preventDefault());
  catalogElements.form.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-filter]");
    if (remove) {
      resetCatalogFilter(remove.dataset.removeFilter);
      catalogElements.count.focus();
    } else if (event.target.closest("[data-clear-filters]")) {
      clearCatalogFilters();
      catalogElements.count.focus();
    }
  });
  catalogElements.empty.addEventListener("click", (event) => {
    if (event.target.closest("[data-clear-filters]")) {
      clearCatalogFilters();
      catalogElements.count.focus();
    }
  });

  loadCatalog();
}

function citationStatusLabel(status) {
  if (status === "in_prep") {
    return "Manuscript in preparation";
  }
  if (status === "none_confirmed") {
    return "No reference paper for this dataset (confirmed with contributor)";
  }
  return "";
}

function metadataRow(label, value) {
  if (!value && value !== 0) {
    return "";
  }
  return `
    <div>
      <dt>${label}</dt>
      <dd>${formatValue(value)}</dd>
    </div>
  `;
}

function maskValueSummary(record) {
  const values = record.mask_label_values || [];
  if (!values.length) {
    return "";
  }
  return `${values.length} values: ${values.join(", ")}`;
}

function externalLink(url, label, className = "button", extraAttrs = "", newTab = true) {
  if (!url) {
    return `<span class="${className} button--disabled" aria-disabled="true">${label}</span>`;
  }
  const target = newTab ? ' target="_blank" rel="noopener"' : "";
  return `<a class="${className}" href="${url}"${target}${extraAttrs}>${label}</a>`;
}

function trackEvent(path, title) {
  if (window.goatcounter && typeof window.goatcounter.count === "function") {
    window.goatcounter.count({ path, title, event: true });
  }
}

function renderDetail(record) {
  const root = document.querySelector("[data-dataset-detail]");
  const imageMaskPairs =
    record.source_image_count && record.source_mask_count
      ? `${record.source_image_count} images / ${record.source_mask_count} masks`
      : "";
  const title = escapeHtml(formatCardTitle(record));
  const citation = record.citation || citationStatusLabel(record.citation_status);
  document.title = `${formatCardTitle(record)} | Leaf CT Hub`;
  root.innerHTML = `
    <section class="detail-hero">
      <div class="detail-hero__content">
        <a class="back-link" href="datasets.html">Back to catalog</a>
        <div class="eyebrow">${formatValue(record.plant_category)}</div>
        <h1>${title}</h1>
        ${record.scientific_name ? `<p class="detail-hero__species">${formatScientificName(record.scientific_name)}</p>` : ""}
        ${record.description ? `<p>${record.description}</p>` : ""}
        <div class="action-row">
          ${record.gallery && record.gallery.length
            ? `<a class="button" href="gallery.html?id=${encodeURIComponent(record.id)}">View Gallery</a>`
            : `<span class="button button--disabled" aria-disabled="true" title="No slice gallery for this dataset yet">View Gallery (not available)</span>`}
          ${externalLink(record.download_url || record.repository_url, "Download dataset", "button button--secondary", ` data-track-download="${record.id}" download`, false)}
        </div>
        <dl class="access-strip" aria-label="Reuse information">
          <div><dt>License</dt><dd>${record.license ? escapeHtml(record.license) : "Not stated"}</dd></div>
          <div><dt>Citation</dt><dd>${record.citation ? '<a href="#access">See citation below</a>' : citation ? escapeHtml(citation) : "Not stated"}</dd></div>
          <div><dt>Contents</dt><dd>${imageMaskPairs || (record.slice_count ? `${escapeHtml(record.slice_count)} slices` : "Not stated")}</dd></div>
          <div><dt>Format</dt><dd>${record.file_format ? escapeHtml(record.file_format) : "Not stated"}</dd></div>
        </dl>
      </div>
      <figure class="detail-hero__image-pair">
        <span>
          <img src="${record.preview_image}" alt="${record.preview_alt || `Raw CT slice of ${formatValue(record.scientific_name || record.id)}`}">
          <small>Raw</small>
        </span>
        <span>
          <img src="${record.mask_preview_image || record.preview_image}" alt="${record.mask_preview_alt || `Segmentation mask of ${formatValue(record.scientific_name || record.id)}`}">
          <small>Mask</small>
        </span>
      </figure>
    </section>

    <section class="section">
      <div class="section-heading">
        <p class="eyebrow">Dataset Metadata</p>
        <h2>Catalog Record</h2>
      </div>
      <dl class="metadata-grid">
        <div class="metadata-row metadata-row--${record.treatment ? 3 : 2}">
          ${metadataRow("Common name", record.common_name)}
          ${metadataRow("Scientific name", formatScientificName(record.scientific_name))}
          ${metadataRow("Treatment / condition", record.treatment)}
        </div>
        <div class="metadata-row metadata-row--4">
          ${metadataRow("Image/mask pairs", imageMaskPairs)}
          ${metadataRow("Image size", record.image_size)}
          ${metadataRow("Voxel / pixel size", record.voxel_size ? formatVoxel(record) : "")}
          ${metadataRow("File format", record.file_format)}
        </div>
        <div class="metadata-row metadata-row--4">
          ${metadataRow("Instrument / facility", record.scanner)}
          ${metadataRow("Beam energy", record.beam_energy_kev ? `${record.beam_energy_kev} keV` : "")}
          ${metadataRow("Objective", record.objective)}
          ${metadataRow("Instrument location", record.scan_location)}
        </div>
      </dl>
    </section>

    <section class="section two-column">
      <div>
        <div class="section-heading">
          <p class="eyebrow">Segmentation</p>
          <h2>Annotation Classes</h2>
        </div>
        <ul class="class-list">
          ${(record.classes || []).map((item) => `<li>${item.replaceAll("_", " ")}</li>`).join("")}
        </ul>
      </div>
      <div id="access">
        <div class="section-heading">
          <p class="eyebrow">Source Information</p>
          <h2>Access and Citation</h2>
        </div>
        <dl class="source-list">
          ${metadataRow("Image/mask provider", record.contributors)}
          ${metadataRow("Provider affiliation", record.contributor_affiliation)}
          ${metadataRow("Contact", record.contact)}
          ${metadataRow("Repository", record.repository)}
          ${metadataRow("License", record.license)}
          ${metadataRow("Citation", record.citation || citationStatusLabel(record.citation_status))}
        </dl>
      </div>
    </section>

  `;

  const downloadLink = root.querySelector("[data-track-download]");
  if (downloadLink) {
    downloadLink.addEventListener("click", () => {
      trackEvent(`/download-click/${downloadLink.dataset.trackDownload}`, `Download click: ${downloadLink.dataset.trackDownload}`);
      showToast("Opening the download from the repository...");
    });
  }
}

function galleryBlock(kind, gallery) {
  const heading = kind === "raw" ? "Raw" : "Mask";
  const label = kind === "raw" ? "Raw slice" : "Segmentation mask for slice";
  const items = gallery
    .map((pair, index) => {
      const n = String(index + 1).padStart(3, "0");
      const src = kind === "raw" ? pair.raw : pair.mask;
      return `
        <figure class="gallery-item">
          <img src="${src}" alt="${label} ${index + 1} of ${gallery.length}" loading="lazy">
          <small>Slice ${n}</small>
        </figure>
      `;
    })
    .join("");
  return `
    <div class="gallery-block">
      <h2 class="gallery-block__heading">${heading}</h2>
      <div class="gallery-grid">${items}</div>
    </div>
  `;
}

function renderGalleryPage(record) {
  const root = document.querySelector("[data-gallery-page]");
  const gallery = record.gallery || [];
  const title = record.scientific_name ? formatScientificName(record.scientific_name) : toTitleCase(record.id);
  document.title = `Gallery \u2013 ${formatValue(title).replaceAll("_", " ")} | Leaf CT Hub`;
  root.innerHTML = `
    <section class="section">
      <a class="back-link" href="dataset.html?id=${encodeURIComponent(record.id)}">Back to dataset</a>
      <div class="section-heading">
        <p class="eyebrow">${formatValue(record.plant_category)}</p>
        <h1>Gallery</h1>
        <p class="body-copy">
          ${gallery.length} slice${gallery.length === 1 ? "" : "s"} \u00b7 preview only.
          Full-resolution images, masks, and the config file are available as a zip:
          ${externalLink(record.repository_url, "Download from Ag Data Commons", "button", ` data-track-download="${record.id}" download`, false)}
        </p>
      </div>
      ${galleryBlock("raw", gallery)}
      ${galleryBlock("mask", gallery)}
    </section>
  `;

  const downloadLink = root.querySelector("[data-track-download]");
  if (downloadLink) {
    downloadLink.addEventListener("click", () => {
      trackEvent(`/download-click/${downloadLink.dataset.trackDownload}`, `Download click: ${downloadLink.dataset.trackDownload}`);
      showToast("Opening the download from the repository...");
    });
  }
}

async function initGalleryPage() {
  const root = document.querySelector("[data-gallery-page]");
  if (!root) {
    return;
  }
  const id = new URLSearchParams(window.location.search).get("id");
  try {
    const records = await loadDatasets();
    const record = records.find((item) => item.id === id);
    if (!record || !(record.gallery || []).length) {
      root.innerHTML = `
        <section class="section">
          <h1>Gallery not available</h1>
          <p class="body-copy">No slice gallery is available for this dataset yet.</p>
          <a class="button" href="datasets.html">Browse datasets</a>
        </section>
      `;
      return;
    }
    renderGalleryPage(record);
  } catch (error) {
    root.innerHTML = `<p class="notice">The gallery could not be loaded.</p>`;
    console.error(error);
  }
}

async function initDetailPage() {
  const root = document.querySelector("[data-dataset-detail]");
  if (!root) {
    return;
  }
  const id = new URLSearchParams(window.location.search).get("id");
  try {
    const records = await loadDatasets();
    const record = records.find((item) => item.id === id);
    if (!record) {
      root.innerHTML = `
        <section class="section">
          <h1>Dataset not found</h1>
          <p class="body-copy">The requested catalog record is not available.</p>
          <a class="button" href="datasets.html">Browse datasets</a>
        </section>
      `;
      return;
    }
    renderDetail(record);
  } catch (error) {
    root.innerHTML = `<p class="notice">The dataset record could not be loaded.</p>`;
    console.error(error);
  }
}

function totalAnnotatedSlices(records) {
  return records.reduce(
    (total, record) => total + (Number(record.source_mask_count || record.slice_count) || 0),
    0,
  );
}

// Three different plants for the home page. The plant shown in the hero is skipped so the
// same specimen never appears twice on one screen.
const HERO_RECORD_ID = "pine_larix_occidentails1";

function selectFeaturedDatasets(records, limit = 3) {
  const hero = records.find((record) => record.id === HERO_RECORD_ID);
  const heroCategory = hero ? hero.plant_category : null;
  const categoryCounts = records.reduce((counts, record) => {
    const category = record.plant_category || "Other";
    counts.set(category, (counts.get(category) || 0) + 1);
    return counts;
  }, new Map());
  const categories = [...categoryCounts.entries()]
    .filter(([category]) => category !== heroCategory)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category]) => category);

  return categories
    .map((category) => records.find((record) => record.plant_category === category))
    .filter(Boolean)
    .slice(0, limit);
}

async function initHomePage() {
  const featured = document.querySelector("[data-featured-datasets]");
  const total = document.querySelector("[data-total-datasets]");
  const categories = document.querySelector("[data-total-categories]");
  const slices = document.querySelector("[data-total-slices]");
  const contributorList = document.querySelector("[data-contributor-list]");
  if (!featured && !total && !categories && !slices && !contributorList) {
    return;
  }
  try {
    const records = await loadDatasets();
    if (featured) {
      const selected = selectFeaturedDatasets(records);
      featured.replaceChildren(...selected.map(createDatasetCard));
    }
    if (total) {
      total.textContent = records.length;
    }
    if (categories) {
      categories.textContent = uniqueValues(records, "plant_category").length;
    }
    if (slices) {
      slices.textContent = totalAnnotatedSlices(records);
    }
    if (contributorList) {
      contributorList.replaceChildren(
        ...uniqueContributors(records).map((name) => {
          const li = document.createElement("li");
          li.textContent = name;
          return li;
        }),
      );
    }
  } catch (error) {
    if (featured) {
      featured.innerHTML = `<p class="notice">Featured datasets could not be loaded.</p>`;
    }
    console.error(error);
  }
}

initCatalogPage();
initDetailPage();
initHomePage();
initGalleryPage();
