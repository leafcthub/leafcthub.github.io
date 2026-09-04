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
      metadataLine("Instrument location", submissionValue(formData, "instrument_location")),
      metadataLine("Image size", submissionValue(formData, "image_size")),
      metadataLine("Voxel / pixel size", submissionValue(formData, "voxel_size")),
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
      "## Contact email",
      "",
      submissionValue(formData, "contact") || "Not provided",
    ].join("\n");
    const issueUrl = new URL("https://github.com/leafcthub/leafcthub.github.io/issues/new");
    issueUrl.searchParams.set("title", `Dataset submission: ${title}`);
    issueUrl.searchParams.set("body", body);
    window.open(issueUrl.toString(), "_blank", "noopener");
  });
}
