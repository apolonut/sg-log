// shared/utils/kmd.js

// Ключ в localStorage за броячи
const STORAGE_KEY = "kmdCounters";

// --- helpers ---
function readCounters() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function writeCounters(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

// Извлича DD, MM, YYYY от "dd.mm.yyyy"
function splitBG(bgDateStr) {
  if (!bgDateStr || typeof bgDateStr !== "string") return [null, null, null];
  const [dd, mm, yyyy] = bgDateStr.split(".");
  return [dd, mm, yyyy];
}

/**
 * За обратно съвместимост:
 * Ако досега са се пазили месечни ключове "YYYY-MM",
 * взимаме MAX за конкретната година и го записваме в годишния ключ "YYYY",
 * за да продължим поредността без да почваме от 1.
 */
function ensureYearFromMonthly(counters, yyyy) {
  // ако вече има годишен ключ — готови сме
  if (counters[yyyy]) return;

  // намери всички "yyyy-mm" и вземи MAX
  const prefix = `${yyyy}-`;
  let maxForYear = 0;
  for (const k in counters) {
    if (k.startsWith(prefix)) {
      const v = Number(counters[k] || 0);
      if (v > maxForYear) maxForYear = v;
    }
  }
  if (maxForYear > 0) {
    counters[yyyy] = maxForYear;
    writeCounters(counters);
  }
}

/**
 * Връща следващ пореден № за дадена дата (dd.mm.yyyy),
 * форматиран като "<номер>/<dd.MM>", и ПОВИШАВА годишния брояч.
 */
export function nextKmdForDate(bgDateStr) {
  const [dd, mm, yyyy] = splitBG(bgDateStr);
  if (!dd || !mm || !yyyy) return "";

  const counters = readCounters();
  // мигрирай от месечни към годишни, ако има стари данни
  ensureYearFromMonthly(counters, yyyy);

  const last = Number(counters[yyyy] || 0);
  const next = last + 1;

  counters[yyyy] = next;
  writeCounters(counters);

  const shortDate = `${dd}.${mm}`; // само ден.месяц
  return `${next}/${shortDate}`;
}

/** Показва текущия последен № за ГОДИНАТА на дадена дата (без да увеличава). */
export function peekKmdForDate(bgDateStr) {
  const [ , , yyyy] = splitBG(bgDateStr);
  if (!yyyy) return 0;

  const counters = readCounters();
  ensureYearFromMonthly(counters, yyyy);

  return Number(counters[yyyy] || 0);
}
