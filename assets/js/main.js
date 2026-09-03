const currentPage = window.location.pathname.split("/").pop() || "index.html";

document.querySelectorAll("[data-nav]").forEach((link) => {
  const target = link.getAttribute("href");
  if (target === currentPage || (currentPage === "" && target === "index.html")) {
    link.setAttribute("aria-current", "page");
  }
});

const year = document.querySelector("[data-year]");
if (year) {
  year.textContent = new Date().getFullYear();
}

async function loadDatasets() {
  const response = await fetch("data/datasets.json");
  if (!response.ok) {
    throw new Error(`Unable to load dataset catalog: ${response.status}`);
  }
  return response.json();
}

function formatValue(value, fallback = "To be added") {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : fallback;
  }
  if (value === 0) {
    return "0";
  }
  return value ? String(value) : fallback;
}

function formatVoxel(record) {
  if (!record.voxel_size) {
    return "To be added";
  }
  return `${record.voxel_size} ${record.voxel_size_unit || "um"}`;
}

function formatScientificName(value) {
  return value ? `<em class="scientific-name">${value}</em>` : "To be added";
}

function formatDatasetTitle(record) {
  const title = formatValue(record.title);
  if (!record.scientific_name || !title.includes(record.scientific_name)) {
    return title;
  }
  return title.replace(record.scientific_name, formatScientificName(record.scientific_name));
}

function formatCardTitle(record) {
  if (record.scientific_name && /^(oak|pine|v)_/.test(record.id || "")) {
    const idPrefix = record.id.split("_")[0];
    const prefix = idPrefix === "v" ? "viburnum" : idPrefix;
    const sampleNumber = (record.id.match(/(\d+)$/) || [])[1];
    const suffix = sampleNumber ? ` ${sampleNumber}` : "";
    return `${prefix} - ${formatScientificName(record.scientific_name)}${suffix}`;
  }
  return formatValue(record.id || record.title).replaceAll("_", " ");
}

function toTitleCase(value) {
  return formatValue(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatLabelSummary(record) {
  const semanticCount = Number(record.num_classes) || 0;
  const maskValueCount = Number(record.mask_label_value_count) || semanticCount;
  if (maskValueCount > semanticCount) {
    return `${semanticCount} classes / ${maskValueCount} mask values`;
  }
  return `${semanticCount || "To be added"} label classes`;
}

function normalized(value) {
  return String(value || "").toLowerCase();
}

function datasetSearchText(record) {
  return [
    record.title,
    record.id,
    record.plant_category,
    record.scientific_name,
    record.common_name,
    record.family,
    record.plant_group,
    record.notes,
    record.classes?.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

function detailUrl(id) {
  return `dataset.html?id=${encodeURIComponent(id)}`;
}

function createDatasetCard(record) {
  const card = document.createElement("article");
  card.className = "dataset-card";
  card.innerHTML = `
    <a class="dataset-card__image-pair" href="${detailUrl(record.id)}">
      <span>
        <img src="${record.preview_image}" alt="${record.preview_alt || ""}" loading="lazy">
        <small>Raw</small>
      </span>
      <span>
        <img src="${record.mask_preview_image || record.preview_image}" alt="${record.mask_preview_alt || ""}" loading="lazy">
        <small>Mask</small>
      </span>
    </a>
    <div class="dataset-card__body">
      <div class="eyebrow">${formatValue(record.plant_category)}</div>
      <h3><a href="${detailUrl(record.id)}">${formatCardTitle(record)}</a></h3>
      <dl class="compact-meta">
        <div><dt>Species</dt><dd>${formatScientificName(record.scientific_name)}</dd></div>
        <div><dt>Image size</dt><dd>${formatValue(record.image_size)}</dd></div>
        <div><dt>Slices</dt><dd>${formatValue(record.slice_count)}</dd></div>
      </dl>
      <div class="tag-row">
        <span>${formatValue(record.file_format)}</span>
        <span>${formatLabelSummary(record)}</span>
      </div>
      <div class="card-actions">
        <a class="button" href="${detailUrl(record.id)}">View record</a>
      </div>
    </div>
  `;
  return card;
}
