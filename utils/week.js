function parseISODateUTC(iso /* 'YYYY-MM-DD' */) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)); // 00:00 UTC
}

function formatISODateUTC(date /* Date */) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function getMondayISO(iso) {
  const d = parseISODateUTC(iso);
  const dow = d.getUTCDay();            // 0=Sun..6=Sat
  const diff = (dow + 6) % 7;           // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return formatISODateUTC(d);           // Monday (UTC) como ISO
}

function addDaysISO(iso, n) {
  const d = parseISODateUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return formatISODateUTC(d);
}

// Monday..Friday
function genWorkWeek(mondayISO) {
  return [0, 1, 2, 3, 4].map(n => addDaysISO(mondayISO, n));
}

// Nome do dia (exibição) em inglês, considerando Brisbane
function weekdayNameFromISO(isoDate) {
  const d = parseISODateUTC(isoDate);   // data em UTC
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    timeZone: 'Australia/Brisbane',
  }).format(d);                         // 'Monday', 'Tuesday', ...
}

module.exports = { getMondayISO, addDaysISO, genWorkWeek, weekdayNameFromISO };