/*
  Progress API — Google Apps Script Web App

  Deployment (one-time, from the spreadsheet that holds your badges):
    1. Open the spreadsheet → Extensions → Apps Script.
    2. Delete any starter code in the editor, paste this file's contents in.
    3. Click Deploy → New deployment → type "Web app".
       - Execute as: Me
       - Who has access: Anyone
    4. Click Deploy, authorize when prompted, and copy the Web App URL
       (ends in /exec).
    5. Paste that URL into PROGRESS_API_URL in app.js.

  This creates and manages its own "Progress" tab in the same spreadsheet
  (columns: Person | Badge | EarnedAt) — you don't need to create it by hand,
  it's added automatically on first write.

  Redeploying: if you edit this script later, use Deploy > Manage deployments
  > edit (pencil) > New version, so the /exec URL stays the same and you
  don't have to update app.js again.
*/

const SHEET_NAME = 'Progress';

function getProgressSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Person', 'Badge', 'EarnedAt']);
  }
  return sheet;
}

function doGet(e) {
  const person = (e.parameter.person || '').trim();
  const sheet = getProgressSheet_();
  const data = sheet.getDataRange().getValues();

  const result = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === person) {
      result.push({ badge: data[i][1], earnedAt: data[i][2] });
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const person = String(body.person || '').trim();
  const badge = String(body.badge || '').trim();
  const action = body.action;

  if (!person || !badge) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'person and badge are required' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = getProgressSheet_();
  const data = sheet.getDataRange().getValues();

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === person && String(data[i][1]) === badge) {
      rowIndex = i + 1; // sheet rows are 1-indexed
      break;
    }
  }

  if (action === 'earn') {
    if (rowIndex === -1) {
      sheet.appendRow([person, badge, new Date().toISOString()]);
    }
  } else if (action === 'unearn') {
    if (rowIndex !== -1) {
      sheet.deleteRow(rowIndex);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
