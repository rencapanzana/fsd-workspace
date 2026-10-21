// FSD WorkSpace: daily Google Ads numbers -> Supabase.
// Paste into Google Ads > Tools > Bulk actions > Scripts, in the FSD MCC (covers every linked account)
// and once more inside any standalone account that isn't linked to the MCC. Schedule it daily, around 6am.
//
// 1. Replace PASTE_INGEST_SECRET with the secret from Supabase (SQL editor:
//    select decrypted_secret from vault.decrypted_secrets where name = 'ingest_secret';). Never commit it.
// 2. First run only: set BACKFILL_DAYS = 60 and click Run, then set it back to 0 and save.

var ENDPOINT = 'https://ojmkekoxupjebwixhgil.supabase.co/functions/v1/google-ingest';
var SECRET = 'PASTE_INGEST_SECRET';
var BACKFILL_DAYS = 0;

function main() {
  var rows = [];
  if (typeof AdsManagerApp !== 'undefined') {
    var accounts = AdsManagerApp.accounts().get();
    while (accounts.hasNext()) {
      AdsManagerApp.select(accounts.next());
      collect(rows);
    }
  } else {
    collect(rows);
  }
  var res = UrlFetchApp.fetch(ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-ingest-secret': SECRET },
    payload: JSON.stringify({ rows: rows }),
    muteHttpExceptions: true,
  });
  Logger.log(res.getResponseCode() + ' ' + res.getContentText());
}

function collect(rows) {
  var account = AdsApp.currentAccount();
  var tz = account.getTimeZone();
  var range = BACKFILL_DAYS > 0
    ? "BETWEEN '" + day(BACKFILL_DAYS, tz) + "' AND '" + day(1, tz) + "'"
    : 'DURING YESTERDAY';
  var it = AdsApp.search(
    'SELECT segments.date, metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.clicks, metrics.impressions ' +
    'FROM customer WHERE segments.date ' + range);
  while (it.hasNext()) {
    var r = it.next();
    rows.push({
      customer_id: account.getCustomerId(),
      date: r.segments.date,
      cost: Number(r.metrics.costMicros) / 1e6,
      conversions: Number(r.metrics.conversions),
      conversions_value: Number(r.metrics.conversionsValue),
      clicks: Number(r.metrics.clicks),
      impressions: Number(r.metrics.impressions),
    });
  }
}

function day(daysAgo, tz) {
  return Utilities.formatDate(new Date(Date.now() - daysAgo * 864e5), tz, 'yyyy-MM-dd');
}
