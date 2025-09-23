// Генерира пореден номер по година: К-2025-0001, К-2025-0002, ...
// Държи последния номер в localStorage под ключ seq.kmdr.<year>
export function nextKomandirovkaNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const key = `seq.kmdr.${year}`;
  const last = Number(localStorage.getItem(key) || "0");
  const next = last + 1;
  localStorage.setItem(key, String(next));
  const padded = String(next).padStart(4, "0");
  return `К-${year}-${padded}`;
}

// Позволява да „приеме“ ръчно въведен номер (за съвместимост)
// Ако е във формат К-YYYY-#### → маркира, че този #### е използван
export function acceptKomandirovkaNumber(value) {
  const m = /^К-(\d{4})-(\d{4})$/.exec(String(value || ""));
  if (!m) return;
  const [, y, n] = m;
  const key = `seq.kmdr.${y}`;
  const last = Number(localStorage.getItem(key) || "0");
  const num = Number(n);
  if (num > last) localStorage.setItem(key, String(num));
}
