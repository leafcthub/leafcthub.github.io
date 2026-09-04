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

function uniqueContributors(records) {
  const names = records.flatMap((record) => String(record.contributors || "").split(","));
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
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
    option.textContent = `${value} label classes`;
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
  document.title = `${formatValue(record.scientific_name || record.id).replaceAll("_", " ")} | Leaf CT Hub`;
  root.innerHTML = `
    <section class="detail-hero">
      <div class="detail-hero__content">
        <a class="back-link" href="datasets.html">Back to catalog</a>
        <div class="eyebrow">${formatValue(record.plant_category)}</div>
        <h1>${record.scientific_name ? formatScientificName(record.scientific_name) : toTitleCase(record.id)}</h1>
        ${record.description ? `<p>${record.description}</p>` : ""}
        <div class="action-row">
          ${record.gallery && record.gallery.length
            ? `<a class="button" href="gallery.html?id=${encodeURIComponent(record.id)}">View Gallery</a>`
            : `<span class="button button--disabled" aria-disabled="true">View Gallery</span>`}
          ${externalLink(record.download_url || record.repository_url, "Download dataset", "button button--secondary", ` data-track-download="${record.id}" download`, false)}
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
        <div class="metadata-row metadata-row--2">
          ${metadataRow("Common name", record.common_name)}
          ${metadataRow("Scientific name", formatScientificName(record.scientific_name))}
        </div>
        <div class="metadata-row metadata-row--3">
          ${metadataRow("Image/mask pairs", imageMaskPairs)}
          ${metadataRow("Image size", record.image_size)}
          ${metadataRow("File format", record.file_format)}
        </div>
        <div class="metadata-row metadata-row--2">
          ${metadataRow("Instrument / facility", record.scanner)}
          ${metadataRow("Instrument location", record.scan_location)}
        </div>
        <div class="metadata-row metadata-row--2">
          ${metadataRow("Voxel / pixel size", record.voxel_size ? formatVoxel(record) : "")}
          ${metadataRow("Scan notes", record.scan_notes)}
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
      showToast("Downloading dataset...");
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
          Full-resolution images, masks, and the config file:
          ${externalLink(record.repository_url, "Ag Data Commons")}
        </p>
      </div>
      ${galleryBlock("raw", gallery)}
      ${galleryBlock("mask", gallery)}
    </section>
  `;
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
