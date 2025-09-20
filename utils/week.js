

function toYmd(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getMondayISO(iso /* 'YYYY-MM-DD' */) {
  // Brisbane timezone (fixa o dia local)
  const d = new Date(iso + 'T00:00:00+10:00');
  const dow = d.getDay();              // 0=Sun,1=Mon..6=Sat
  const diff = (dow + 6) % 7;          // days since Monday
  d.setDate(d.getDate() - diff);
  return toYmd(d);
}

function addDaysISO(iso, n) {
  const d = new Date(iso + 'T00:00:00+10:00');
  d.setDate(d.getDate() + n);
  return toYmd(d);
}

function genWorkWeek(mondayISO) {
  return [0, 1, 2, 3, 4].map(n => addDaysISO(mondayISO, n));
}

function weekdayNameFromISO(isoDate) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    timeZone: 'Australia/Brisbane',
  }).format(new Date(isoDate + 'T00:00:00+10:00')); // e.g. 'Monday'
}

module.exports = { getMondayISO, addDaysISO, genWorkWeek, weekdayNameFromISO };