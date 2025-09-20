function toYmd(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getMondayISO(iso) {
  const d = new Date(iso + 'T00:00:00+10:00'); // Brisbane (AEST, sem DST para simplificar)
  const day = d.getDay(); // 0 domingo ... 1 seg
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return toYmd(d);
}

function addDaysISO(iso, delta) {
  const d = new Date(iso + 'T00:00:00+10:00');
  d.setDate(d.getDate() + delta);
  return toYmd(d);
}

// gera Mon..Fri
function genWorkWeek(weekStartISO /* Monday */) {
  return [0, 1, 2, 3, 4].map(off => addDaysISO(weekStartISO, off));
}

module.exports = { getMondayISO, addDaysISO, genWorkWeek };