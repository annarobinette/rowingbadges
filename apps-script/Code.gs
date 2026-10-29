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

  Managing who can be picked in the "Rowing as" switcher: add a "Users" tab
  to the spreadsheet with one name per row in column A (a header row in A1
  is fine, e.g. "Name" - the script skips it since it isn't a real name match
  needed, it just reads every non-empty cell as a name). Add/remove/rename
  rows any time; the site re-reads the list on every page load.

  Redeploying: if you edit this script later, use Deploy > Manage deployments
  > edit (pencil) > New version, so the /exec URL stays the same and you
  don't have to update app.js again.

  Note on testing from this editor: clicking "Run" on doGet/doPost here
  calls them with no arguments, which is why you'd see an error reading
  `e.parameter` or `e.postData` - that only happens from a manual Run, not
  from a real request hitting the deployed URL. Use the deployed URL (or
  Apps Script's "Test deployment" option) to actually test it.
*/

const PROGRESS_SHEET_NAME = 'Progress';
const USERS_SHEET_NAME = 'Users';

function getProgressSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PROGRESS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(PROGRESS_SHEET_NAME);
    sheet.appendRow(['Person', 'Badge', 'EarnedAt']);
  }
  return sheet;
}

function slugify_(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getUsers_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 0; i < data.length; i++) {
    const name = String(data[i][0] || '').trim();
    if (!name || name.toLowerCase() === 'name') continue; // skip blanks + an optional header
    users.push({ name: name, value: slugify_(name) });
  }
  return users;
}

function resolveDisplayName_(personValue) {
  const users = getUsers_();
  const match = users.find(u => u.value === personValue.toLowerCase());
  return match ? match.name : personValue;
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const params = (e && e.parameter) || {};

  if (params.mode === 'users') {
    return jsonOutput_(getUsers_());
  }

  const person = String(params.person || '').trim();
  const sheet = getProgressSheet_();
  const data = sheet.getDataRange().getValues();

  // Keyed by lowercased badge, so if the same (person, badge) appears more
  // than once (e.g. from a bulk-migrated dataset), only the most recent
  // earnedAt is kept rather than just whichever row happens to be last.
  const latestByBadge = {};
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === person.toLowerCase()) {
      const badge = String(data[i][1]);
      const earnedAt = data[i][2];
      const key = badge.toLowerCase();
      const existing = latestByBadge[key];
      if (!existing || new Date(earnedAt) > new Date(existing.earnedAt)) {
        latestByBadge[key] = { badge: badge, earnedAt: earnedAt };
      }
    }
  }

  return jsonOutput_(Object.keys(latestByBadge).map(k => latestByBadge[k]));
}

function doPost(e) {
  const raw = e && e.postData ? e.postData.contents : '{}';
  const body = JSON.parse(raw || '{}');
  const person = String(body.person || '').trim();
  const badge = String(body.badge || '').trim();
  const action = body.action;

  if (!person || !badge) {
    return jsonOutput_({ ok: false, error: 'person and badge are required' });
  }

  const sheet = getProgressSheet_();
  const data = sheet.getDataRange().getValues();

  // Collect every matching row (not just the first) so duplicates - e.g.
  // from a bulk-migrated dataset - get fully cleaned up rather than leaving
  // stragglers behind.
  const matchingRows = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === person.toLowerCase() && String(data[i][1]).toLowerCase() === badge.toLowerCase()) {
      matchingRows.push(i + 1); // sheet rows are 1-indexed
    }
  }

  if (action === 'earn') {
    if (matchingRows.length === 0) {
      const displayName = resolveDisplayName_(person);
      sheet.appendRow([displayName, badge, new Date().toISOString()]);
    }
  } else if (action === 'unearn') {
    // Delete bottom-to-top so earlier row numbers don't shift mid-loop.
    for (let j = matchingRows.length - 1; j >= 0; j--) {
      sheet.deleteRow(matchingRows[j]);
    }
  }

  return jsonOutput_({ ok: true });
}
