const submissionForm = document.querySelector("[data-submission-form]");

function submissionValue(formData, key) {
  return String(formData.get(key) || "").trim();
}

function metadataLine(label, value) {
  return `- **${label}:** ${value || "Not provided"}`;
}

function segmentationLines(formData) {
  const rows = formData.getAll("segmentation_labels").map((className) => {
    const value = submissionValue(formData, `pixel_value__${className}`);
    return `- ${className.replaceAll("_", " ")}: ${value || "not given"}`;
  });

  const otherClass = submissionValue(formData, "segmentation_labels_other");
  if (otherClass) {
    const otherValue = submissionValue(formData, "segmentation_labels_other_value");
    rows.push(`- ${otherClass}: ${otherValue || "not given"}`);
  }

  if (!rows.length) {
    rows.push("Not provided");
  }

  const ignoreIndex = submissionValue(formData, "ignore_index");
  rows.push("", `Ignore / border pixel value: ${ignoreIndex || "none given"}`);
  return rows;
}

if (submissionForm) {
  submissionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(submissionForm);
    const scientificName = submissionValue(formData, "scientific_name");
    const title = scientificName ? `${scientificName} leaf CT dataset` : "New Leaf X-ray micro-CT dataset submission";
    const body = [
      "## Dataset submission",
      "",
      metadataLine("Scientific name", scientificName),
      metadataLine("Common name", submissionValue(formData, "common_name")),
      metadataLine("Treatment / condition", submissionValue(formData, "treatment")),
      metadataLine("Imaging modality", "X-ray micro-CT"),
      metadataLine("Instrument / facility", submissionValue(formData, "instrument_facility")),
      metadataLine("Beam energy", submissionValue(formData, "beam_energy_kev")),
      metadataLine("Objective", submissionValue(formData, "objective")),
      metadataLine("Instrument location", submissionValue(formData, "instrument_location")),
      metadataLine("Image size", submissionValue(formData, "image_size")),
      metadataLine("Voxel / pixel size", submissionValue(formData, "voxel_size")),
      metadataLine("File format", submissionValue(formData, "file_format")),
      metadataLine("Image/mask provider", submissionValue(formData, "provider")),
      metadataLine("Provider affiliation", submissionValue(formData, "provider_affiliation")),
      metadataLine("Repository URL", submissionValue(formData, "repository_url")),
      metadataLine("Paper DOI or publication link", submissionValue(formData, "paper_reference")),
      "",
      "## Segmentation classes and pixel values",
      "",
      ...segmentationLines(formData),
      "",
      "## Contact email",
      "",
      submissionValue(formData, "contact") || "Not provided",
      "",
      "## Notes for processing",
      "",
      submissionValue(formData, "processing_notes") || "Not provided",
    ].join("\n");
    // A pre-filled GitHub issue is just a long URL -- very thorough notes or a long
    // repository link can push it past what's safe across browsers/servers. Truncate
    // rather than risk a broken or silently-cut-off link.
    const MAX_BODY_LENGTH = 4000;
    const safeBody =
      body.length > MAX_BODY_LENGTH
        ? `${body.slice(0, MAX_BODY_LENGTH)}\n\n...(truncated -- this submission had too much text for the pre-filled link; please add anything missing as a comment after creating the issue)`
        : body;
    const issueUrl = new URL("https://github.com/leafcthub/leafcthub.github.io/issues/new");
    issueUrl.searchParams.set("title", `Dataset submission: ${title}`);
    issueUrl.searchParams.set("body", safeBody);
    window.open(issueUrl.toString(), "_blank", "noopener");
  });
}
