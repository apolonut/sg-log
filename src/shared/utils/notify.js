function parseBG(d) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(d || "").trim());
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return isNaN(dt) ? null : dt;
}
function parseISO(d) {
  const dt = new Date(d);
  return isNaN(dt) ? null : dt;
}
function toDateLoose(v) {
  if (!v) return null;
  const iso = parseISO(v);
  if (iso) return iso;
  return parseBG(v);
}
export function daysUntil(dateStr) {
  const d = toDateLoose(dateStr);
  if (!d) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const ONE = 24 * 60 * 60 * 1000;
  return Math.floor((d.getTime() - today.getTime()) / ONE);
}

export function buildNotifications({ drivers = [], schedules = [], trucks = [], tankers = [] }) {
  const items = [];

  // Шофьори: карта + ADR
  drivers.forEach((d) => {
    const cardLeft = daysUntil(d.driverCardExpiry);
    if (cardLeft !== null) {
      if (cardLeft < 0) items.push({ kind: "driver-doc", severity: "red", text: `Шофьорска карта ИЗТЕКЛА — ${d.name}` });
      else if (cardLeft <= 14) items.push({ kind: "driver-doc", severity: "yellow", text: `Шофьорска карта изтича след ${cardLeft} дни — ${d.name}` });
    }
    const adrLeft = daysUntil(d.adrExpiry);
    if (adrLeft !== null) {
      if (adrLeft < 0) items.push({ kind: "driver-doc", severity: "red", text: `ADR ИЗТЕКЪЛ — ${d.name}` });
      else if (adrLeft <= 14) items.push({ kind: "driver-doc", severity: "yellow", text: `ADR изтича след ${adrLeft} дни — ${d.name}` });
    }
  });

  // Техника: ГО, Преглед, Винетка, Каско, CMR (ако ги имаш в обектите)
  const pushTech = (t, label, v) => {
    const left = daysUntil(v);
    if (left === null) return;
    const title = `${label} ${left < 0 ? "ИЗТЕКЪЛ" : left === 0 ? "изтича ДНЕС" : `изтича след ${left} дни`} — ${t.number || t.name || ""}`;
    items.push({ kind: "tech-doc", severity: left < 0 ? "red" : "yellow", text: title });
  };
  const techFields = [
    ["ГО",       "goExpiry"],
    ["Преглед",  "techExpiry"],
    ["Винетка",  "vignetteExpiry"],
    ["Каско",    "cascoExpiry"],
    ["CMR",      "cmrExpiry"],
  ];
  [...(trucks || []), ...(tankers || [])].forEach((t) => {
    techFields.forEach(([label, key]) => pushTech(t, label, t[key]));
  });

  // Курсове: днес/утре (start/end или legacy date/unloadDate)
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today.getTime() + 24*60*60*1000);

  schedules.forEach((s) => {
    const start = toDateLoose(s.startDate || s.date);
    const end   = toDateLoose(s.endDate   || s.unloadDate);
    const title = s.relation || s.title || "";

    if (start && start.getTime() === today.getTime()) {
      items.push({ kind: "course", severity: "green", text: `Днес тръгва: ${title} — ${s.driver || ""}` });
    }
    if (end) {
      if (end.getTime() === today.getTime())
        items.push({ kind: "course", severity: "green", text: `Днес пристига: ${title} — ${s.driver || ""}` });
      else if (end.getTime() === tomorrow.getTime())
        items.push({ kind: "course", severity: "yellow", text: `Утре пристига: ${title} — ${s.driver || ""}` });
    }
  });

  return items;
}
