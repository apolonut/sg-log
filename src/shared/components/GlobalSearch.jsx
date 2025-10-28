// src/shared/components/GlobalSearch.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDrivers } from "@/features/drivers/drivers.store.jsx";
import { useTehnika } from "@/features/tehnika/tehnika.store.jsx";
import { useSchedules } from "@/features/schedule/schedule.store.jsx";

export default function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  // Realtime данни от провайдърите
  const { list: drivers = [] } = useDrivers() || { list: [] };
  const { trucks = [], tankers = [] } = useTehnika() || { trucks: [], tankers: [] };
  const S = useSchedules();
  const schedules = useMemo(() => {
    const a = Array.isArray(S?.list) ? S.list : [];
    const b = Array.isArray(S?.archived) ? S.archived : [];
    return [...a, ...b];
  }, [S?.list, S?.archived]);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const low = q.toLowerCase();

    const items = [];

    drivers.forEach(d => {
      if (
        [d.name, d.company, d.tractor, d.tanker, d.contact, d.egn]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(low))
      ) {
        items.push({
          type: "driver",
          title: d.name,
          subtitle: d.company || "SG",
          extra: d.contact || "",
          payload: d,
        });
      }
    });

    trucks.forEach(t => {
      if ([t.number].filter(Boolean).some(v => String(v).toLowerCase().includes(low))) {
        items.push({ type: "truck", title: t.number, subtitle: "Влекач", payload: t });
      }
    });

    tankers.forEach(t => {
      if ([t.number].filter(Boolean).some(v => String(v).toLowerCase().includes(low))) {
        items.push({ type: "tanker", title: t.number, subtitle: "Цистерна", payload: t });
      }
    });

    schedules.forEach(s => {
      const fields = [s.driver, s.company, s.route || s.relation, s.komandirovka, s.notes, s.date, s.unloadDate];
      if (fields.filter(Boolean).some(v => String(v).toLowerCase().includes(low))) {
        items.push({
          type: "schedule",
          title: `${s.driver || "?"} • ${s.route || s.relation || "?"}`,
          subtitle: `${s.date || "?"} – ${s.unloadDate || "?"} • ${s.status || ""}`,
          payload: s,
        });
      }
    });

    return items.slice(0, 12);
  }, [q, drivers, trucks, tankers, schedules]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v)=>!v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (item) => {
    // Пример: при избор на шофьор → копирай телефон+композиция
    if (item.type === "driver") {
      const d = item.payload;
      const text = `${d.name} ${d.contact ? " · " + d.contact : ""} ${d.tractor || ""}${d.tanker ? " / " + d.tanker : ""}`;
      navigator.clipboard.writeText(text).catch(()=>{});
    }
    // При избор на товар можеш да навигираш към таб "График":
    if (item.type === "schedule") {
      window.dispatchEvent(new CustomEvent("app:navigate", { detail: { tab: "schedule" } }));
      // по желание: window.dispatchEvent(new CustomEvent("schedule:focus", { detail: { id: item.payload.id } }));
    }
    setOpen(false);
    setQ("");
  };

  return (
    <div className="relative">
      <input
        className="h-10 w-48 md:w-64 rounded-lg border border-slate-300 bg-white px-3 text-sm"
        placeholder="Търсене… (Ctrl/Cmd+K)"
        value={q}
        onChange={(e)=>{ setQ(e.target.value); setOpen(true); }}
        onFocus={()=>setOpen(true)}
      />
      {open && q && (
        <div className="absolute right-0 mt-1 w-80 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-auto z-10">
          {!results.length ? (
            <div className="px-3 py-2 text-sm text-slate-500">Няма резултати.</div>
          ) : results.map((it, i) => (
            <button
              key={`${it.type}-${it.title}-${i}`}
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
              onClick={()=>pick(it)}
            >
              <div className="text-sm font-medium">{it.title}</div>
              <div className="text-xs text-slate-500">{it.subtitle}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
