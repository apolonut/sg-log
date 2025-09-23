import { parseBGDate } from "@/shared/utils/dates";

// Проверка за припокриване на [a1, a2] и [b1, b2] включително
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart <= bEnd && bStart <= aEnd;
}

// Дали driver има задача, която се припокрива с [date, unloadDate]
export function isDriverBusy(driverName, dateStr, unloadStr, allSchedules) {
  if (!driverName) return false;
  const st = parseBGDate(dateStr);
  const en = parseBGDate(unloadStr);
  if (!st || !en) return false;
  return allSchedules.some((s) => {
    if (s.driver !== driverName) return false;
    const s1 = parseBGDate(s.date);
    const s2 = parseBGDate(s.unloadDate);
    return rangesOverlap(st, en, s1, s2);
  });
}

// Връща конфликтните задачи (за UI предупреждение)
export function getConflicts(driverName, dateStr, unloadStr, allSchedules) {
  const st = parseBGDate(dateStr);
  const en = parseBGDate(unloadStr);
  if (!st || !en) return [];
  return allSchedules.filter((s) => {
    if (s.driver !== driverName) return false;
    const s1 = parseBGDate(s.date);
    const s2 = parseBGDate(s.unloadDate);
    return rangesOverlap(st, en, s1, s2);
  });
}
