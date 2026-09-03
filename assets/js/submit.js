const submissionForm = document.querySelector("[data-submission-form]");

function submissionValue(formData, key) {
  return String(formData.get(key) || "").trim();
}

function metadataLine(label, value) {
  return `- **${label}:** ${value || "Not provided"}`;
}

if (submissionForm) {
  submissionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(submissionForm);
    const title = submissionValue(formData, "dataset_title") || "New Leaf X-ray micro-CT dataset submission";
    const body = [
      "## Dataset submission",
      "",
      metadataLine("Dataset title", title),
      metadataLine("Scientific name", submissionValue(formData, "scientific_name")),
      metadataLine("Common name", submissionValue(formData, "common_name")),
      metadataLine("Family", submissionValue(formData, "family")),
      metadataLine("Imaging modality", submissionValue(formData, "imaging_modality")),
      metadataLine("Instrument / facility", submissionValue(formData, "instrument_facility")),
      metadataLine("Instrument location", submissionValue(formData, "instrument_location")),
      metadataLine("Image size", submissionValue(formData, "image_size")),
      metadataLine("Image/mask pairs", submissionValue(formData, "image_mask_pairs")),
      metadataLine("File format", submissionValue(formData, "file_format")),
      metadataLine("Image/mask provider", submissionValue(formData, "provider")),
      metadataLine("Provider affiliation", submissionValue(formData, "provider_affiliation")),
      metadataLine("Repository URL", submissionValue(formData, "repository_url")),
      metadataLine("Paper DOI or publication link", submissionValue(formData, "paper_reference")),
      "",
      "## Annotation classes",
      "",
      submissionValue(formData, "segmentation_labels") || "Not provided",
      "",
      "## Notes for processing",
      "",
      submissionValue(formData, "processing_notes") || "Not provided",
      "",
      "## Contact",
      "",
      submissionValue(formData, "contact") || "Not provided",
    ].join("\n");
    const issueUrl = new URL("https://github.com/leafcthub/leafcthub.github.io/issues/new");
    issueUrl.searchParams.set("title", `Dataset submission: ${title}`);
    issueUrl.searchParams.set("body", body);
    window.open(issueUrl.toString(), "_blank", "noopener");
  });
}
