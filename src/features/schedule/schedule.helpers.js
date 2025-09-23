// статус → CSS клас за бейдж
export function statusBadge(status) {
  switch (status) {
    case "Планирано":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
    case "В процес":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "Изпълнено":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "Отказано":
      return "bg-red-100 text-red-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

// "Прав" / "Обратен" → по-четлив етикет
export function legLabel(leg) {
  if (leg === "Прав") return "➡ Прав";
  if (leg === "Обратен") return "⬅ Обратен";
  return leg || "—";
}
