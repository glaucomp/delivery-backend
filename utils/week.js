function parseISODateUTC(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)); // 00:00 UTC
}

function formatISODateUTC(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function getMondayISO(iso) {
  const d = parseISODateUTC(iso);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (dow + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return formatISODateUTC(d);
}

function addDaysISO(iso, n) {
  const d = parseISODateUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return formatISODateUTC(d);
}

function genWorkWeek(mondayISO) {
  return [0, 1, 2, 3, 4].map(n => addDaysISO(mondayISO, n));
}

function weekdayNameFromISO(isoDate) {
  const d = parseISODateUTC(isoDate);
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    timeZone: 'Australia/Brisbane',
  }).format(d);
}

// 👇 aqui exporta todas as helpers que você usa
module.exports = {
  parseISODateUTC,
  formatISODateUTC,
  getMondayISO,
  addDaysISO,
  genWorkWeek,
  weekdayNameFromISO
};