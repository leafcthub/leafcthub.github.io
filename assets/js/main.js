const currentPage = window.location.pathname.split("/").pop() || "index.html";

// Record and gallery pages belong to the Datasets section.
const navPage = ["dataset.html", "gallery.html"].includes(currentPage) ? "datasets.html" : currentPage;

document.querySelectorAll("[data-nav]").forEach((link) => {
  const target = link.getAttribute("href");
  if (target === navPage || (navPage === "" && target === "index.html")) {
    link.setAttribute("aria-current", "page");
  }
});

const year = document.querySelector("[data-year]");
if (year) {
  year.textContent = new Date().getFullYear();
}

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) {
    existing.remove();
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  document.body.append(toast);
  requestAnimationFrame(() => toast.classList.add("toast--visible"));
  setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

async function loadDatasets() {
  const response = await fetch("data/datasets.json");
  if (!response.ok) {
    throw new Error(`Unable to load dataset catalog: ${response.status}`);
  }
  const records = await response.json();
  addDisplayTitles(records);
  return records;
}

// Two records can still end up with the same title. Tell them apart by species epithet.
function addDisplayTitles(records) {
  const counts = new Map();
  records.forEach((record) => {
    const title = formatCardTitle(record);
    counts.set(title, (counts.get(title) || 0) + 1);
  });
  records.forEach((record) => {
    const title = formatCardTitle(record);
    const epithet = String(record.scientific_name || "").split(/\s+/)[1];
    if (counts.get(title) > 1 && epithet) {
      record.display_title = `${title} (${epithet})`;
    }
  });
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// A short code that tells apart records of the same plant, taken from the id when it
// carries a digit ("olive_d3" -> "D3", "pine_pinus_contorta2" -> "2"). Words already
// covered by the names, and purely alphabetic leftovers, are skipped.
function sampleCode(record) {
  const known = new Set(
    `${record.scientific_name} ${record.plant_category} ${record.common_name} ${record.treatment}`
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean),
  );
  ["pine", "v"].forEach((word) => known.add(word));
  return String(record.id || "")
    .toLowerCase()
    .split("_")
    .map((token) => {
      const [, letters = "", digits = ""] = token.match(/^([a-z]*?)(\d*)$/) || [];
      if (!digits) {
        // Short alphabetic codes ("grape_f") tell samples apart; longer words are names.
        return letters.length <= 2 && !known.has(letters) ? letters : "";
      }
      return known.has(letters) ? digits : token;
    })
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

// Plain-text card title: "Almond, Control", "Olive D3", "Lodgepole Pine 2".
function formatCardTitle(record) {
  if (record.display_title) {
    return record.display_title;
  }
  const name = record.common_name || record.plant_category;
  if (!name) {
    return formatValue(record.id || record.title).replaceAll("_", " ");
  }
  const treatment = record.treatment ? `, ${record.treatment}` : "";
  const code = sampleCode(record);
  return `${name}${treatment}${code ? ` ${code}` : ""}`;
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
    return `${semanticCount} annotation classes / ${maskValueCount} mask values`;
  }
  return `${semanticCount || "To be added"} annotation classes`;
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

function classSummary(record) {
  const names = (record.classes || []).map((name) => name.replaceAll("_", " "));
  if (!names.length) {
    return "";
  }
  const shown = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${shown} +${names.length - 3} more` : shown;
}

function createDatasetCard(record) {
  const card = document.createElement("article");
  card.className = "dataset-card";
  const title = escapeHtml(formatCardTitle(record));
  const format = record.file_format ? `${escapeHtml(record.file_format)} format` : "Format to be added";
  const voxel = record.voxel_size
    ? `<div><dt>Voxel size</dt><dd>${escapeHtml(formatVoxel(record))}</dd></div>`
    : "";
  const classes = classSummary(record);
  card.innerHTML = `
    <div class="dataset-card__image-pair" aria-hidden="true">
      <span>
        <img src="${record.preview_image}" alt="" loading="lazy" decoding="async">
        <small>Raw</small>
      </span>
      <span>
        <img src="${record.mask_preview_image || record.preview_image}" alt="" loading="lazy" decoding="async">
        <small>Mask</small>
      </span>
    </div>
    <div class="dataset-card__body">
      <div class="eyebrow">${formatValue(record.plant_category)}</div>
      <h3><a href="${detailUrl(record.id)}">${title}</a></h3>
      <dl class="compact-meta">
        <div><dt>Species</dt><dd>${formatScientificName(record.scientific_name)}</dd></div>
        <div><dt>Image size</dt><dd>${formatValue(record.image_size)}</dd></div>
        <div><dt>Slices</dt><dd>${formatValue(record.slice_count)}</dd></div>
        ${voxel}
        ${classes ? `<div class="compact-meta__wide"><dt>Classes</dt><dd class="clamp-2">${escapeHtml(classes)}</dd></div>` : ""}
      </dl>
      <div class="tag-row">
        <span>${format}</span>
        <span>${formatLabelSummary(record)}</span>
      </div>
    </div>
  `;
  return card;
}
