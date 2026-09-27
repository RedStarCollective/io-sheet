/**
 * Iō Sheet bridge
 * Lets https://redstarcollective.github.io/io-sheet/ read this spreadsheet,
 * and save pharma dose changes back into it.
 *
 * Setup (once):
 *   1. In the Google Sheet: Extensions > Apps Script. Paste this whole file over Code.gs. Save.
 *   2. Project Settings (gear icon) > Script Properties > Add property:
 *        EDIT_KEY = a password of your choice (only you should know it)
 *   3. Deploy > New deployment > type "Web app".
 *        Execute as: Me.   Who has access: Anyone.
 *      Authorize when asked. Copy the Web app URL (ends in /exec).
 *   Updating later: Deploy > Manage deployments > pencil icon > Version: New version > Deploy.
 *   That keeps the same URL.
 *
 * Reading is open to anyone with the URL (the same as a view link).
 * Writing needs EDIT_KEY, and can only change pharma dose counts.
 */

// Only these tabs are ever sent to the page. Update the names here if you rename a tab.
const TABS = ['Stats & Skills [Iō]', 'Skill Improvements', 'Skill Improvement Calculator'];

// Tab names are matched loosely (spaces, brackets, capitals and accents ignored), so "Stats & Skills Io" still counts.
function tabKey_(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9&]+/g, ' ').trim().toLowerCase(); }
function findTab_(ss, name) {
  const want = tabKey_(name);
  return ss.getSheets().filter(function (sh) { return tabKey_(sh.getName()) === want; })[0] || null;
}

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const out = { updated: new Date().toISOString(), sheets: {}, missing: [] };
  TABS.forEach(function (name) {
    const sh = findTab_(ss, name);
    if (sh) out.sheets[name] = sh.getDataRange().getDisplayValues();
    else out.missing.push(name);
  });
  return json_(out);
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad request' }); }
  const key = PropertiesService.getScriptProperties().getProperty('EDIT_KEY');
  if (!key || body.key !== key) return json_({ ok: false, error: 'not allowed' });
  if (body.type === 'ping') return json_({ ok: true });
  if (body.type === 'pharma') return json_(savePharma_(body.items || []));
  return json_({ ok: false, error: 'unknown request' });
}

/** Finds the "Pharma" list on the Stats tab and writes each dose count two columns to the right of its name. */
function savePharma_(items) {
  const sh = findTab_(SpreadsheetApp.getActiveSpreadsheet(), TABS[0]);
  if (!sh) return { ok: false, error: 'Stats tab not found' };
  const vals = sh.getDataRange().getDisplayValues();
  let hr = -1, hc = -1;
  for (let r = 0; r < vals.length && hr < 0; r++) {
    for (let c = 0; c < vals[r].length; c++) {
      if (String(vals[r][c]).trim() === 'Pharma') { hr = r; hc = c; break; }
    }
  }
  if (hr < 0) return { ok: false, error: 'Pharma list not found' };
  const norm = function (s) { return String(s).trim().toLowerCase(); };
  const saved = [];
  items.forEach(function (it) {
    const n = Math.round(Number(it.n));
    if (!isFinite(n) || n < 0 || n > 999) return;
    for (let r = hr + 1; r < Math.min(vals.length, hr + 30); r++) {
      if (norm(vals[r][hc]) === norm(it.name)) {
        sh.getRange(r + 1, hc + 3).setValue(n);
        saved.push(it.name);
        break;
      }
    }
  });
  return { ok: true, saved: saved };
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
