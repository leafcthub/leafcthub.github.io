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

function prettyClass(className) {
  return className.replaceAll("_", " ");
}

// Returns { message, field } for the first problem found, or null when the form is fine.
function segmentationProblem(formData) {
  const seen = new Map();
  const claim = (label, value, field) => {
    if (seen.has(value)) {
      return {
        message: `${label} and ${seen.get(value)} both use pixel value ${value}. Each class needs its own value.`,
        field,
      };
    }
    seen.set(value, label);
    return null;
  };

  for (const className of formData.getAll("segmentation_labels")) {
    const field = submissionForm.elements[`pixel_value__${className}`];
    const value = submissionValue(formData, `pixel_value__${className}`);
    if (!value) {
      return { message: `Enter the pixel value for ${prettyClass(className)}, or uncheck it.`, field };
    }
    const clash = claim(prettyClass(className), value, field);
    if (clash) {
      return clash;
    }
  }

  const otherName = submissionValue(formData, "segmentation_labels_other");
  const otherValue = submissionValue(formData, "segmentation_labels_other_value");
  const otherValueField = submissionForm.elements.segmentation_labels_other_value;
  if (otherName && !otherValue) {
    return { message: `Enter the pixel value for ${otherName}, or clear the class name.`, field: otherValueField };
  }
  if (otherValue && !otherName) {
    return {
      message: "Enter a name for the extra class, or clear its pixel value.",
      field: submissionForm.elements.segmentation_labels_other,
    };
  }
  if (otherName) {
    const clash = claim(otherName, otherValue, otherValueField);
    if (clash) {
      return clash;
    }
  }

  const ignoreIndex = submissionValue(formData, "ignore_index");
  if (ignoreIndex && seen.has(ignoreIndex)) {
    return {
      message: `The ignore pixel value ${ignoreIndex} is already used by ${seen.get(ignoreIndex)}. Use a value no class uses.`,
      field: submissionForm.elements.ignore_index,
    };
  }
  return null;
}

function showFormError(formError, problem) {
  submissionForm.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
  formError.textContent = problem.message;
  formError.hidden = false;
  const { field } = problem;
  if (field) {
    field.setAttribute("aria-invalid", "true");
    const details = field.closest("details");
    if (details) {
      details.open = true;
    }
    field.focus();
  }
  formError.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function clearFormError(formError) {
  submissionForm.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
  formError.hidden = true;
}

// The summary keeps the layout the old GitHub-issue body had, so the admin can paste the email
// text into a file and run scripts/parse_submission_issue.py on it.
function buildSummary(formData) {
  return [
    "## Dataset submission",
    "",
    metadataLine("Scientific name", submissionValue(formData, "scientific_name")),
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
}

async function sendSubmission(endpoint, formData) {
  // The receiver (scripts/submission_receiver.gs) stores the request in a private Google Sheet
  // and emails it to the admins. Plain-text JSON keeps this a "simple" request, so the browser
  // sends it without a CORS preflight.
  const scientificName = submissionValue(formData, "scientific_name") || "new dataset";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      summary: buildSummary(formData),
      scientific_name: scientificName,
      email: submissionValue(formData, "contact"),
      website: submissionValue(formData, "_gotcha"),
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(`Submission failed: ${result.error || response.status}`);
  }
}

if (submissionForm) {
  const formError = submissionForm.querySelector("[data-form-error]");
  const submitButton = submissionForm.querySelector("[data-submit-button]");
  const done = document.querySelector("[data-submission-done]");

  submissionForm.addEventListener("input", () => clearFormError(formError));

  submissionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(submissionForm);
    if (submissionValue(formData, "_gotcha")) {
      return; // a bot filled the hidden field; pretend nothing happened
    }
    const problem = segmentationProblem(formData);
    if (problem) {
      showFormError(formError, problem);
      return;
    }
    clearFormError(formError);

    const endpoint = submissionForm.dataset.endpoint;
    if (!endpoint) {
      showFormError(formError, {
        message: "Submissions are not switched on yet. Please try again later.",
      });
      console.warn("Set data-endpoint on the submission form to your form service URL.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    try {
      await sendSubmission(endpoint, formData);
      submissionForm.hidden = true;
      done.hidden = false;
      done.focus();
    } catch (error) {
      console.error(error);
      showFormError(formError, {
        message: "Your request could not be sent. Nothing was lost: check your connection and try again.",
      });
      submitButton.disabled = false;
      submitButton.textContent = "Submit request";
    }
  });
}
