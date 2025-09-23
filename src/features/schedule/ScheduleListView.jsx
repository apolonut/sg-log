// src/features/schedule/ScheduleListView.jsx
import React, { useMemo } from "react";
import { statusBadge, legLabel } from "./schedule.helpers.js";
import { parseBGDate, isPastBGDate } from "../../shared/utils/dates.jsx";
import { useLocalStorage } from "../../shared/hooks/useLocalStorage";
import { useSchedules } from "./schedule.store.jsx";

// helper: стабилно копиране в клипборда
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text || "";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
};

// малка иконка бутон (еднакъв вид/височина)
const IconBtn = ({ title, onClick, children, disabled }) => (
  <button
    type="button"
    className={`inline-flex items-center gap-1 text-xs px-2 py-1 h-7 rounded-md border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 ${
      disabled ? "text-slate-300 cursor-not-allowed" : "hover:bg-slate-100 text-slate-600"
    }`}
    title={title}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

export default function ScheduleListView({ items, onEdit, onAdd }) {
  const S = useSchedules(); // за remove/add/archive
  const [drivers] = useLocalStorage("drivers", []);
  const driverMap = useMemo(() => {
    const m = new Map();
    drivers.forEach((d) => m.set(d.name, d));
    return m;
  }, [drivers]);

  // Обобщение
  const summary = useMemo(() => {
    const total = items.length;
    const byStatus = items.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});
    return { total, byStatus };
  }, [items]);

  // Групиране: Клиент -> Релация -> Списък
  const byClient = useMemo(() => {
    const acc = {};
    items.forEach((s) => {
      const c = s.company || "—";
      (acc[c] ||= {});
      const routeKey = s.route || "—";
      (acc[c][routeKey] ||= []).push(s);
    });
    // сортиране по дата в релациите
    Object.values(acc).forEach((byRoute) => {
      Object.values(byRoute).forEach((arr) =>
        arr.sort((a, b) => {
          const ad = parseBGDate(a.date);
          const bd = parseBGDate(b.date);
          const cmp = (ad?.getTime() || 0) - (bd?.getTime() || 0);
          return cmp !== 0 ? cmp : (a.driver || "").localeCompare(b.driver || "", "bg");
        })
      );
    });
    return acc;
  }, [items]);

  const clientNames = useMemo(
    () => Object.keys(byClient).sort((a, b) => a.localeCompare(b, "bg")),
    [byClient]
  );

  // действия
  const handleCopyRow = async (s) => {
    const text = [
      `Клиент: ${s.company || "—"}`,
      `Релация: ${s.route || "—"}`,
      `Шофьор: ${s.driver || "—"}`,
      `Дати: ${s.date || "—"} – ${s.unloadDate || "—"}`,
      `№: ${s.komandirovka || "—"}`,
      `Бележки: ${s.notes || "—"}`
    ].join(" | ");
    await copyText(text);
  };

  const handleDuplicate = (s) => {
    if (!S) return;
    const copy = {
      company: s.company || "",
      route: s.route || "",
      driver: "", // изискване: без шофьор
      leg: s.leg || "Прав",
      date: s.date || "",
      unloadDate: s.unloadDate || "",
      komandirovka: "",
      notes: "",
      status: s.status || "Планирано",
    };
    S.add(copy);
  };

  const handleDelete = (s) => {
    if (!S || !s?.id) return;
    if (confirm("Сигурни ли сте, че искате да изтриете този товар?")) {
      S.remove(s.id);
    }
  };

  const handleArchive = (s) => {
    if (!S || !s?.id) return;
    // предпазване от повторно архивиране
    if (S.isArchived?.(s.id)) return;
    S.archiveById(s.id);
  };

  const canArchive = (s) => {
    // архивация при Изпълнено ИЛИ ако разтоварването (или датата) е в миналото
    const eligibleByDate = isPastBGDate(s.unloadDate || s.date);
    const eligibleByStatus = s.status === "Изпълнено";
    // забраняваме ако вече е архивиран
    const alreadyArchived = S?.isArchived?.(s.id);
    return (eligibleByDate || eligibleByStatus) && !alreadyArchived;
  };

  return (
    <div className="space-y-6">
      {/* Обобщение */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold">Обобщение</h4>
        {onAdd && (
            <button type="button" className="btn btn-primary h-9" onClick={onAdd}>
              + Нов товар
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-700 mt-2">
          <div>Общо: <b>{summary.total}</b></div>
          <div>Планирано: <b>{summary.byStatus["Планирано"] || 0}</b></div>
          <div>В процес: <b>{summary.byStatus["В процес"] || 0}</b></div>
          <div>Изпълнено: <b>{summary.byStatus["Изпълнено"] || 0}</b></div>
        </div>
      </div>

      {/* Секции по Клиент */}
      {clientNames.map((client) => {
        const byRoute = byClient[client];
        const routes = Object.keys(byRoute).sort((a, b) => a.localeCompare(b, "bg"));
        const totalForClient = routes.reduce((n, r) => n + byRoute[r].length, 0);

        return (
          <div className="card" key={`client-${client}`}>
            <div className="flex items-baseline justify-between mb-3">
              <h4 className="text-lg font-bold">{client}</h4>
              <span className="text-sm text-slate-500">Общо: {totalForClient}</span>
            </div>

            {routes.map((route) => {
              const list = byRoute[route];
              return (
                <div key={`route-${client}-${route}`} className="border rounded-lg mb-4 overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 text-sm text-slate-700 font-medium">{route}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-white">
                          <th className="p-2.5 text-left text-xs uppercase tracking-wide text-slate-500">Вид</th>
                          <th className="p-2.5 text-left text-xs uppercase tracking-wide text-slate-500">Шофьор</th>
                          <th className="p-2.5 text-left text-xs uppercase tracking-wide text-slate-500">Дати</th>
                          <th className="p-2.5 text-left text-xs uppercase tracking-wide text-slate-500">Командировъчен №</th>
                          <th className="p-2.5 text-left text-xs uppercase tracking-wide text-slate-500">Бележки</th>
                          <th className="p-2.5 text-left text-xs uppercase tracking-wide text-slate-500">Статус</th>
                          <th className="p-2.5 text-right text-xs uppercase tracking-wide text-slate-500">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((s) => {
                          const d = s.driver ? driverMap.get(s.driver) : null;
                          const isSub = d ? d.isOwn === false : false;
                          return (
                            <tr
                              key={s.id || `${s.company}-${s.route}-${s.date}-${s.driver || "—"}`}
                              className="border-t hover:bg-slate-50"
                            >
                              <td className="p-2.5 text-sm">{legLabel(s.leg)}</td>
                              <td className="p-2.5 text-sm">
                                <span className="font-medium">{s.driver || "—"}</span>
                                {s.driverCompany ? (
                                  <span className="text-slate-500 ml-1">/{s.driverCompany}/</span>
                                ) : null}
                                {isSub && (
                                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 align-middle">
                                    SUB
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-sm whitespace-nowrap">{s.date || "—"} – {s.unloadDate || "?"}</td>
                              <td className="p-2.5 text-sm">{s.komandirovka || "—"}</td>
                              <td className="p-2.5 text-sm truncate max-w-[18rem]">{s.notes || "—"}</td>
                              <td className="p-2.5 text-sm">
                                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${statusBadge(s.status)}`}>
                                  {s.status}
                                </span>
                              </td>
                              <td className="p-2.5 text-right text-sm">
                                <div className="flex items-center gap-1 justify-end">
                                  <IconBtn title="Редакция" onClick={() => onEdit?.(s)}>Редакция</IconBtn>
                                  <IconBtn title="Дублирай" onClick={() => handleDuplicate(s)}>Дублирай</IconBtn>
                                  <IconBtn title="Копирай" onClick={() => handleCopyRow(s)}>Копирай</IconBtn>
                                  <IconBtn title="Изтрий" onClick={() => handleDelete(s)}>Изтрий</IconBtn>
                                  <IconBtn
                                    title={
                                      S?.isArchived?.(s.id)
                                        ? "Вече е в архива"
                                        : "Архивирай"
                                    }
                                    onClick={() => handleArchive(s)}
                                    disabled={!canArchive(s)}
                                  >
                                    Архивирай
                                  </IconBtn>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {!list.length && (
                          <tr>
                            <td colSpan={7} className="text-center text-slate-400 py-4">Няма задачи.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      {!clientNames.length && <div className="card text-center text-slate-400">Няма задачи.</div>}
    </div>
  );
}
