import React, { useMemo, useState } from "react";
import { useSchedules } from "./schedule.store.jsx";

function Row({ s }) {
  return (
    <tr className="border-t hover:bg-slate-50">
      <td className="p-2 text-sm whitespace-nowrap">{s.date || "—"} → {s.unloadDate || "—"}</td>
      <td className="p-2 text-sm whitespace-nowrap">{s.company || "—"}</td>
      <td className="p-2 text-sm whitespace-nowrap">{s.route || "—"}</td>
      <td className="p-2 text-sm whitespace-nowrap">{s.driver || "—"}</td>
      <td className="p-2 text-right text-xs">{s.status || "—"}</td>
    </tr>
  );
}

export default function ScheduleHistory({ pageSize=20 }) {
  const { past, getPastSlice } = useSchedules();
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(pageSize);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = past;
    if (!s) return base.slice(0, shown);
    const res = base.filter(x => {
      const hay = [
        x.company, x.route, x.driver, x.status, x.notes, x.date, x.unloadDate
      ].map(v => (v || "").toString().toLowerCase()).join(" ");
      return hay.includes(s);
    });
    return res.slice(0, shown);
  }, [past, q, shown]);

  const canLoadMore = shown < past.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          className="input h-9 w-full"
          placeholder="Търси по клиент, релация, шофьор…"
          value={q}
          onChange={(e)=>{ setQ(e.target.value); setShown(pageSize); }}
        />
        <span className="text-xs text-slate-500 whitespace-nowrap">
          Общо: <b>{past.length}</b>
        </span>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <table className="table w-full">
          <thead>
            <tr className="bg-slate-50 text-xs">
              <th className="p-2 text-left">Дати</th>
              <th className="p-2 text-left">Клиент</th>
              <th className="p-2 text-left">Релация</th>
              <th className="p-2 text-left">Шофьор</th>
              <th className="p-2 text-right">Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => <Row key={s.id || `${s.company}-${s.route}-${s.date}-${s.driver}`} s={s} />)}
            {!filtered.length && (
              <tr><td colSpan={5} className="text-center text-slate-400 p-4">Няма резултати.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {canLoadMore && (
        <div className="flex justify-center">
          <button className="btn btn-ghost" onClick={()=>setShown(shown + pageSize)}>
            Покажи още
          </button>
        </div>
      )}
    </div>
  );
}
