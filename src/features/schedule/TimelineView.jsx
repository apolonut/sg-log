import React, { useState } from "react";
import ScheduleTimeline from "./ScheduleTimeline.jsx";

/**
 * Лек контейнер за календара:
 * - Бърз toolbar: избор на дни (7/14) и "Цвят по" (шофьор/фирма)
 * - Рендва компактния ScheduleTimeline
 * 
 * Заб.: ScheduleTab може да продължи да използва директно ScheduleTimeline.
 * Ако предпочетеш, просто подмени в ScheduleTab:
 *   <ScheduleTimeline days={7} colorBy="driver" />
 * с:
 *   <TimelineView />
 */
export default function TimelineView() {
  const [days, setDays] = useState(7);
  const [colorBy, setColorBy] = useState("driver"); // "driver" | "company"

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">Дни:</label>
          <div className="inline-flex rounded-md overflow-hidden border border-slate-200">
            <button
              type="button"
              className={`px-3 py-1.5 text-sm ${days === 7 ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
              onClick={() => setDays(7)}
            >
              7
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-sm border-l border-slate-200 ${days === 14 ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
              onClick={() => setDays(14)}
            >
              14
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">Цвят по:</label>
          <select
            className="input"
            value={colorBy}
            onChange={(e) => setColorBy(e.target.value)}
          >
            <option value="driver">Шофьор</option>
            <option value="company">Фирма</option>
          </select>
        </div>
      </div>

      {/* Самият календар (компактен timeline) */}
      <div className="card">
        <ScheduleTimeline days={days} colorBy={colorBy} />
      </div>
    </div>
  );
}
