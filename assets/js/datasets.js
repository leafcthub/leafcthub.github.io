const catalogState = {
  datasets: [],
  query: "",
  category: "all",
  classes: "all",
};

const catalogElements = {
  grid: document.querySelector("[data-dataset-grid]"),
  count: document.querySelector("[data-result-count]"),
  search: document.querySelector("[data-search]"),
  category: document.querySelector("[data-category-filter]"),
  classes: document.querySelector("[data-class-filter]"),
  empty: document.querySelector("[data-empty-state]"),
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

function addOptions(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function addClassOptions(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = `${value} mask values`;
    select.append(option);
  });
}

function filteredDatasets() {
  const query = normalized(catalogState.query);
  return catalogState.datasets.filter((record) => {
    const matchesQuery = !query || normalized(datasetSearchText(record)).includes(query);
    const matchesCategory =
      catalogState.category === "all" || record.plant_category === catalogState.category;
    const matchesClasses =
      catalogState.classes === "all" ||
      String(record.mask_label_value_count || record.num_classes) === catalogState.classes;
    return matchesQuery && matchesCategory && matchesClasses;
  });
}

function renderCatalog() {
  const records = filteredDatasets();
  catalogElements.grid.replaceChildren(...records.map(createDatasetCard));
  catalogElements.count.textContent = `${records.length} dataset${records.length === 1 ? "" : "s"}`;
  catalogElements.empty.hidden = records.length !== 0;
}

async function initCatalogPage() {
  if (!catalogElements.grid) {
    return;
  }

  try {
    catalogState.datasets = await loadDatasets();
    addOptions(catalogElements.category, uniqueValues(catalogState.datasets, "plant_category"));
    addClassOptions(
      catalogElements.classes,
      uniqueValues(catalogState.datasets, "mask_label_value_count"),
    );
    renderCatalog();
  } catch (error) {
    catalogElements.grid.innerHTML = `<p class="notice">The dataset catalog could not be loaded.</p>`;
    console.error(error);
  }

  catalogElements.search.addEventListener("input", (event) => {
    catalogState.query = event.target.value;
    renderCatalog();
  });

  catalogElements.category.addEventListener("change", (event) => {
    catalogState.category = event.target.value;
    renderCatalog();
  });

  catalogElements.classes.addEventListener("change", (event) => {
    catalogState.classes = event.target.value;
    renderCatalog();
  });
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

function externalLink(url, label, className = "button") {
  if (!url) {
    return `<span class="${className} button--disabled" aria-disabled="true">${label}</span>`;
  }
  return `<a class="${className}" href="${url}" target="_blank" rel="noopener">${label}</a>`;
}

function renderDetail(record) {
  const root = document.querySelector("[data-dataset-detail]");
  const imageMaskPairs =
    record.source_image_count && record.source_mask_count
      ? `${record.source_image_count} images / ${record.source_mask_count} masks`
      : "";
  document.title = `${formatValue(record.scientific_name || record.id).replaceAll("_", " ")} | Leaf CT Hub`;
  root.innerHTML = `
    <section class="detail-hero">
      <div class="detail-hero__content">
        <a class="back-link" href="datasets.html">Back to catalog</a>
        <div class="eyebrow">${formatValue(record.plant_category)}</div>
        <h1>${record.scientific_name ? formatScientificName(record.scientific_name) : toTitleCase(record.id)}</h1>
        ${record.description ? `<p>${record.description}</p>` : ""}
        <div class="action-row">
          ${externalLink(record.repository_url, "View in Ag Data Commons")}
          ${externalLink(record.download_url || record.repository_url, "Download dataset", "button button--secondary")}
        </div>
      </div>
      <figure class="detail-hero__image-pair">
        <span>
          <img src="${record.preview_image}" alt="${record.preview_alt || ""}">
          <small>Raw</small>
        </span>
        <span>
          <img src="${record.mask_preview_image || record.preview_image}" alt="${record.mask_preview_alt || ""}">
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
        ${metadataRow("Scientific name", formatScientificName(record.scientific_name))}
        ${metadataRow("Common name", record.common_name)}
        ${metadataRow("Family", record.family)}
        ${metadataRow("Imaging modality", record.ct_modality)}
        ${metadataRow("Instrument / facility", record.scanner)}
        ${metadataRow("Instrument location", record.scan_location)}
        ${metadataRow("Image size", record.image_size)}
        ${metadataRow("Image/mask pairs", imageMaskPairs)}
        ${metadataRow("File format", record.file_format)}
      </dl>
    </section>

    <section class="section two-column">
      <div>
        <div class="section-heading">
          <p class="eyebrow">Segmentation</p>
          <h2>Annotation Classes</h2>
        </div>
        <ul class="class-list">
          ${record.classes.map((item) => `<li>${item.replaceAll("_", " ")}</li>`).join("")}
        </ul>
      </div>
      <div>
        <div class="section-heading">
          <p class="eyebrow">Source Information</p>
          <h2>Access and Citation</h2>
        </div>
        <dl class="source-list">
          ${metadataRow("Image/mask provider", record.contributors)}
          ${metadataRow("Provider affiliation", record.contributor_affiliation)}
          ${metadataRow("Contact", record.contact)}
          ${metadataRow("Repository", record.repository)}
          ${metadataRow("Repository URL", record.repository_url)}
          ${metadataRow("Download URL", record.download_url)}
          ${metadataRow("License", record.license)}
          ${metadataRow("Citation", record.citation)}
        </dl>
      </div>
    </section>
  `;
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

function selectFeaturedDatasets(records, limit = 3) {
  const categoryCounts = records.reduce((counts, record) => {
    const category = record.plant_category || "Other";
    counts.set(category, (counts.get(category) || 0) + 1);
    return counts;
  }, new Map());
  const categories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category]) => category);

  return categories
    .map(
      (category) =>
        records.find((record) => record.plant_category === category),
    )
    .filter(Boolean)
    .slice(0, limit);
}

async function initHomePage() {
  const featured = document.querySelector("[data-featured-datasets]");
  const total = document.querySelector("[data-total-datasets]");
  const categories = document.querySelector("[data-total-categories]");
  const slices = document.querySelector("[data-total-slices]");
  if (!featured) {
    return;
  }
  try {
    const records = await loadDatasets();
    const selected = selectFeaturedDatasets(records);
    featured.replaceChildren(...selected.map(createDatasetCard));
    total.textContent = records.length;
    categories.textContent = uniqueValues(records, "plant_category").length;
    if (slices) {
      slices.textContent = totalAnnotatedSlices(records);
    }
  } catch (error) {
    featured.innerHTML = `<p class="notice">Featured datasets could not be loaded.</p>`;
    console.error(error);
  }
}

initCatalogPage();
initDetailPage();
initHomePage();
