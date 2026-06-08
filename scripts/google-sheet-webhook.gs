/**
 * Google Apps Script — paste into Extensions → Apps Script on your Sheet.
 * Deploy: Deploy → New deployment → Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the /exec URL into js/telemetry-config.js → webhookUrl
 */
var SHEET_TOKEN = 'change-me-to-a-long-random-string';

function doPost(e) {
  try {
    var body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    if (body.token !== SHEET_TOKEN) {
      return jsonOut({ ok: false, error: 'unauthorized' });
    }
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp',
        'Event',
        'Name',
        'Score',
        'Total',
        'Pct',
        'Topic filter',
        'Difficulty',
        'Missed',
      ]);
    }
    var ts = body.at ? new Date(body.at) : new Date();
    sheet.appendRow([
      ts,
      body.event || '',
      body.name || '',
      body.score != null ? body.score : '',
      body.total != null ? body.total : '',
      body.pct != null ? body.pct : '',
      body.filterLabel || '',
      body.difficultyLabel || '',
      body.missed != null ? body.missed : '',
    ]);
    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
