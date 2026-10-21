// @OnlyCurrentDoc  (limits the script to the one Sheet it is attached to)
/**
 * Leaf CT Hub -- private dataset-request receiver (Google Apps Script).
 *
 * What it does: the Submit page posts each request here. The script
 *   1. adds the request as a new row in the Google Sheet this script is attached to, and
 *   2. emails the request to the admin address(es) below.
 * Nothing is published. See ADMIN_DATASET_UPLOAD.md ("Set up the private submission
 * receiver") for the one-time setup.
 */

// Who gets an email for every request. Separate several addresses with commas.
const NOTIFY_EMAILS = "worasitsangjan.ws@gmail.com";

// Name of the sheet tab that stores the requests (created automatically).
const SHEET_NAME = "Requests";

// Values in the Status column dropdown. New requests start as the first one.
// Meaning: New = just arrived, Acknowledged = reply sent to the contributor,
// Waiting for contributor = we asked for more info or data, Added to catalog = done,
// Declined = not suitable (reply sent).
const STATUS_OPTIONS = ["New", "Acknowledged", "Waiting for contributor", "Added to catalog", "Declined"];

// Reject anything bigger than this per field, so nobody can flood the sheet.
const MAX_FIELD_LENGTH = 20000;

function doPost(e) {
  try {
    const data = JSON.parse((e.postData && e.postData.contents) || "{}");

    // Hidden spam-trap field: real visitors never fill it in.
    if (data.website) {
      return reply({ ok: true });
    }

    const summary = clean(data.summary);
    const scientificName = clean(data.scientific_name) || "new dataset";
    const contact = clean(data.email);
    if (!summary) {
      return reply({ ok: false, error: "Empty request" });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getSheet();
      sheet.appendRow([new Date(), scientificName, contact, summary, STATUS_OPTIONS[0], ""]);
    } finally {
      lock.releaseLock();
    }

    MailApp.sendEmail({
      to: NOTIFY_EMAILS,
      replyTo: contact || NOTIFY_EMAILS,
      subject: "Leaf CT Hub dataset request: " + scientificName,
      body:
        "A new dataset request was submitted on Leaf CT Hub.\n" +
        "Contact: " + (contact || "not given") + "\n\n" +
        summary +
        "\n\n---\nSaved in the Google Sheet tab \"" + SHEET_NAME + "\".\n" +
        "Next: reply to the contributor, set Status to Acknowledged in the Sheet, then\n" +
        "to make a draft copy the text above into body.txt and run\n" +
        "python3 scripts/parse_submission_issue.py --body-file body.txt --out-dir incoming/<id>",
    });

    return reply({ ok: true });
  } catch (error) {
    return reply({ ok: false, error: String(error) });
  }
}

// Opening the web app address in a browser shows this, so you can check the deployment worked.
function doGet() {
  return reply({ ok: true, message: "Leaf CT Hub receiver is running." });
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  const header = ["Received", "Scientific name", "Contact email", "Request text", "Status", "Notes"];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(header);
    sheet.setFrozenRows(1);
  } else if (sheet.getRange(1, 5).getValue() !== "Status") {
    // An older sheet that only had the first four columns: add Status and Notes.
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
  }
  // Status dropdown for every row below the header (re-applied so it always matches STATUS_OPTIONS).
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 5, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule);
  return sheet;
}

// Trim, cap the length, and stop spreadsheet formulas ("=...", "+...", "-...", "@...").
function clean(value) {
  let text = String(value == null ? "" : value).trim().slice(0, MAX_FIELD_LENGTH);
  if (/^[=+\-@]/.test(text)) {
    text = "'" + text;
  }
  return text;
}

function reply(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
