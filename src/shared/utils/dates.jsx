// УТИЛИТИ ЗА ДАТИ — стабилни и „защитени“

// Нормализира до 00:00:00 локално
function atStartOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * parseBGDate
 * Вход: "DD.MM.YYYY" | Date | "" | null | undefined
 * Изход: Date или null
 */
export function parseBGDate(input) {
  if (!input) return null;
  if (input instanceof Date && !isNaN(input)) return atStartOfDay(input);

  if (typeof input === "string") {
    const s = input.trim();
    // Позволяваме и ISO "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return isNaN(dt) ? null : atStartOfDay(dt);
    }
    // Класическият "DD.MM.YYYY"
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
      const [d, m, y] = s.split(".").map(Number);
      const dt = new Date(y, m - 1, d);
      return isNaN(dt) ? null : atStartOfDay(dt);
    }
  }
  return null;
}

/**
 * toBG
 * Вход: Date | "YYYY-MM-DD" | "DD.MM.YYYY"
 * Изход: "DD.MM.YYYY"
 */
export function toBG(input) {
  if (!input) return "";
  const d = input instanceof Date ? input : parseBGDate(input);
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * toInputDate
 * Вход: "DD.MM.YYYY" | Date | "" | null
 * Изход: "YYYY-MM-DD" (за <input type="date"/>) или "" ако няма валидна дата
 */
export function toInputDate(input) {
  if (!input) return "";
  const d = input instanceof Date ? input : parseBGDate(input);
  if (!d) return "";
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * fromInputDate
 * Вход: "YYYY-MM-DD"
 * Изход: "DD.MM.YYYY"
 */
export function fromInputDate(input) {
  if (!input || typeof input !== "string") return "";
  const s = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt)) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * checkExpiry
 * Вход: "DD.MM.YYYY" | Date | "" | null
 * Връща: { status: "valid"|"expiring-soon"|"expired"|"N/A", days: number }
 *  - days: дни до изтичане (отрицателни = вече изтекло)
 *  - expiring-soon: <= 30 дни по подразбиране
 */
export function checkExpiry(input, thresholdDays = 30) {
  if (!input) return { status: "N/A", days: 0 };
  const d = input instanceof Date ? input : parseBGDate(input);
  if (!d) return { status: "N/A", days: 0 };

  const today = atStartOfDay(new Date());
  const diffMs = d.getTime() - today.getTime();
  const days = Math.round(diffMs / 86400000); // 1000*60*60*24

  if (days < 0) return { status: "expired", days };
  if (days <= thresholdDays) return { status: "expiring-soon", days };
  return { status: "valid", days };
}
// ── добави най-отдолу на файла ─────────────────────────────────────────
export function isPastBGDate(bgDateStr) {
  if (!bgDateStr) return false;
  const d = parseBGDate(bgDateStr);
  if (!d) return false;
  // сравняваме по „край на деня“ на разтоварването
  const end = new Date(d); end.setHours(23,59,59,999);
  return end.getTime() < Date.now();
}

export function compareBG(a, b) {
  // за сортиране по BG дата низходящо (най-новите първи)
  const da = parseBGDate(a); const db = parseBGDate(b);
  const ta = da ? da.getTime() : -Infinity;
  const tb = db ? db.getTime() : -Infinity;
  return tb - ta;
}

// Не са задължителни — просто удобства
export function isFutureBGDate(bgDateStr) {
  const d = parseBGDate(bgDateStr);
  if (!d) return false;
  const start = new Date(); start.setHours(0,0,0,0);
  return d.getTime() > start.getTime();
}

export function isBetweenBG(bgStart, bgEnd, test) {
  const s = parseBGDate(bgStart);
  const e = parseBGDate(bgEnd || bgStart);
  const t = parseBGDate(test);
  if (!s || !e || !t) return false;
  return t.getTime() >= s.getTime() && t.getTime() <= e.getTime();
}

