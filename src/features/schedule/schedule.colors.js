// schedule.colors.js
// Детерминистични цветове за графика (шофьор / подизпълнител / клиент)
// Запазва съвместимост с:
// - colorForDriver / colorForCompany / colorForClient
// - chipStyleDriver / chipStyleCompany / chipStyleClient
// И добавя: alpha/contrast, chip варианти, overrides, кеш и разширяване на палитра.

// ---------- Палитра ----------
export const PALETTE = [
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#dc2626", // red-600
  "#9333ea", // purple-600
  "#ea580c", // orange-600
  "#0891b2", // cyan-600
  "#4f46e5", // indigo-600
  "#059669", // emerald-600
  "#b91c1c", // red-700
  "#db2777", // pink-600
  "#0d9488", // teal-600
  "#65a30d", // lime-600
  "#7c3aed", // violet-600
  "#d97706", // amber-600
  "#14b8a6", // teal-500
];

// ---------- Helpers ----------
function hash(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Връща hex цвят за произволен ключ (детерминистично) */
export function colorFor(key) {
  if (!key) return "#94a3b8"; // slate-400 fallback
  const idx = hash(key) % PALETTE.length;
  return PALETTE[idx];
}

/** Прозрачност: "#RRGGBB" + alpha(0..1) → rgba(...) */
export function colorAlpha(hex, alpha = 0.1) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return hex || "#94a3b8";
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  const a = Math.min(1, Math.max(0, Number(alpha)));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Контрастен текст за solid фон (черно/бяло) */
export function getContrastText(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "#000000";
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  const lum = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
  return lum > 0.55 ? "#000000" : "#ffffff";
}

/** Общ стил за „чип“ (фон/бордър/текст) по ключ – soft по подразбиране */
export function chipStyle(key) {
  const c = colorFor(key);
  return {
    backgroundColor: colorAlpha(c, 0.1), // ~10% opacity
    borderColor: c,
    color: c,
  };
}

/** Варианти на чип стил: "soft" | "solid" | "outline" */
export function chipStyleVariant(key, variant = "soft") {
  const c = colorFor(key);
  switch (variant) {
    case "solid":
      return { backgroundColor: c, borderColor: c, color: getContrastText(c) };
    case "outline":
      return { backgroundColor: "transparent", borderColor: c, color: c };
    case "soft":
    default:
      return { backgroundColor: colorAlpha(c, 0.1), borderColor: c, color: c };
  }
}

// ---------- Специални ключове ----------
const keyDriver  = (name) => `drv:${name || ""}`;
const keyCompany = (name) => `cmp:${name || ""}`; // подизпълнител
const keyClient  = (name) => `cli:${name || ""}`; // клиент

// ---------- Базови експортни функции (backwards compatible) ----------
export function colorForDriver(name)  { return colorFor(keyDriver(name)); }
export function colorForCompany(name) { return colorFor(keyCompany(name)); }
export function colorForClient(name)  { return colorFor(keyClient(name)); }

export function chipStyleDriver(name)  { return chipStyle(keyDriver(name)); }
export function chipStyleCompany(name) { return chipStyle(keyCompany(name)); }
export function chipStyleClient(name)  { return chipStyle(keyClient(name)); }

// Вариантни шорткъти
export const chipStyleDriverVariant  = (name, v) => chipStyleVariant(keyDriver(name), v);
export const chipStyleCompanyVariant = (name, v) => chipStyleVariant(keyCompany(name), v);
export const chipStyleClientVariant  = (name, v) => chipStyleVariant(keyClient(name), v);

// ---------- Overrides (по избор) ----------
export const OVERRIDES = {
  drv: Object.create(null),
  cmp: Object.create(null),
  cli: Object.create(null),
};

// setColorOverride("drv"|"cmp"|"cli", name, "#RRGGBB")
export function setColorOverride(kind, name, color) {
  if (!OVERRIDES[kind]) return;
  if (typeof name !== "string") return;
  if (typeof color !== "string" || !/^#([0-9a-f]{6})$/i.test(color)) return;
  OVERRIDES[kind][name] = color;
}
export function clearColorOverride(kind, name) {
  if (!OVERRIDES[kind]) return;
  delete OVERRIDES[kind][name];
}

function _withOverride(kind, name, fallback) {
  const map = OVERRIDES[kind] || {};
  return (name && map[name]) || fallback;
}

export function colorForDriverOrOverride(name)  {
  return _withOverride("drv", name, colorForDriver(name));
}
export function colorForCompanyOrOverride(name) {
  return _withOverride("cmp", name, colorForCompany(name));
}
export function colorForClientOrOverride(name)  {
  return _withOverride("cli", name, colorForClient(name));
}

// Удобни чипове, уважаващи overrides
export function chipStyleDriverOrOverride(name, variant = "soft") {
  const c = colorForDriverOrOverride(name);
  if (variant === "solid")   return { backgroundColor: c, borderColor: c, color: getContrastText(c) };
  if (variant === "outline") return { backgroundColor: "transparent", borderColor: c, color: c };
  return { backgroundColor: colorAlpha(c, 0.1), borderColor: c, color: c };
}
export function chipStyleCompanyOrOverride(name, variant = "soft") {
  const c = colorForCompanyOrOverride(name);
  if (variant === "solid")   return { backgroundColor: c, borderColor: c, color: getContrastText(c) };
  if (variant === "outline") return { backgroundColor: "transparent", borderColor: c, color: c };
  return { backgroundColor: colorAlpha(c, 0.1), borderColor: c, color: c };
}
export function chipStyleClientOrOverride(name, variant = "soft") {
  const c = colorForClientOrOverride(name);
  if (variant === "solid")   return { backgroundColor: c, borderColor: c, color: getContrastText(c) };
  if (variant === "outline") return { backgroundColor: "transparent", borderColor: c, color: c };
  return { backgroundColor: colorAlpha(c, 0.1), borderColor: c, color: c };
}

// ---------- Runtime разширения и кеш ----------
/** Добавя хекс цветове към палитрата в runtime */
export function extendPalette(colors = []) {
  if (!Array.isArray(colors)) return;
  for (const c of colors) {
    if (typeof c === "string" && /^#([0-9a-f]{6})$/i.test(c)) {
      PALETTE.push(c);
    }
  }
}

/** Кеширана версия за големи списъци */
const _colorCache = new Map();
export function colorForCached(key) {
  const k = String(key || "");
  if (_colorCache.has(k)) return _colorCache.get(k);
  const c = colorFor(k);
  _colorCache.set(k, c);
  return c;
}
export function clearColorCache() { _colorCache.clear(); }
