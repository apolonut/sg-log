// src/features/schedule/ScheduleTimeline.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useSchedules } from "./schedule.store.jsx";
import { parseBGDate, toBG } from "../../shared/utils/dates.jsx";
import { colorForDriver, colorForCompany } from "./schedule.colors.js";
import "./TimelineView.css";

/** Локални помощници **/
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const addDays = (dateObj, n) => {
  const d = new Date(dateObj);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + Number(n || 0));
  return d;
};
const diffInDays = (a, b) => {
  const d1 = new Date(a); d1.setHours(0, 0, 0, 0);
  const d2 = new Date(b); d2.setHours(0, 0, 0, 0);
  return Math.round((d2 - d1) / MS_IN_DAY);
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function ScheduleTimeline({ days = 7, colorBy = "driver" }) {
  // ВАЖНО: взимаме upcoming вместо целия list → няма минали/архивирани
  const { upcoming, update } = useSchedules();

  // Начална дата на прозореца (днес)
  const [start, setStart] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    return d;
  });
  const end = useMemo(() => addDays(start, days - 1), [start, days]);

  // Уникални шофьори за редове
  const rows = useMemo(() => {
    const names = new Set();
    (upcoming || []).forEach((s) => s.driver && names.add(s.driver));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "bg"));
  }, [upcoming]);

  const dayWidth = 120; // px, компактен изглед
  const containerRef = useRef(null);

  const pxPerDay = dayWidth;
  const leftForDate = (bgDateStr) => {
    const d = parseBGDate(bgDateStr);
    if (!d) return 0;
    const delta = clamp(diffInDays(start, d), 0, days - 1);
    return delta * pxPerDay;
  };
  const widthForSpan = (a, b) => {
    const da = parseBGDate(a);
    const db = parseBGDate(b || a);
    if (!da || !db) return pxPerDay;
    const len = Math.max(1, diffInDays(da, db) + 1);
    return len * pxPerDay;
  };

  // ----- Drag & Drop (throttled) -----
  const rafRef = useRef(null);
  const scheduleNext = (fn) => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      fn();
    });
  };

  const onDrag = (s, e) => {
    // защита при липсващи дати
    const baseStart = parseBGDate(s.date);
    const baseEnd = parseBGDate(s.unloadDate || s.date);
    if (!baseStart || !baseEnd) return;

    const startX = e.clientX;
    const move = (ev) => {
      scheduleNext(() => {
        const dx = ev.clientX - startX;
        const dayDelta = Math.round(dx / pxPerDay);
        if (dayDelta === 0) return;
        const newStart = addDays(baseStart, dayDelta);
        const newEnd = addDays(baseEnd, dayDelta);
        update(s.id, { date: toBG(newStart), unloadDate: toBG(newEnd) });
      });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  // Resize от ляво/дясно (throttled)
  const onResize = (s, side, e) => {
    const origRight = parseBGDate(s.unloadDate || s.date);
    const origLeft = parseBGDate(s.date);
    if (!origLeft) return; // без начало не можем да ресайзваме

    const startX = e.clientX;
    const move = (ev) => {
      scheduleNext(() => {
        const dx = ev.clientX - startX;
        const dayDelta = Math.round(dx / pxPerDay);
        if (dayDelta === 0) return;

        if (side === "right") {
          if (!origRight) return;
          const newEnd = addDays(origRight, dayDelta);
          update(s.id, { unloadDate: toBG(newEnd) });
        } else {
          const newStart = addDays(origLeft, dayDelta);
          let newUnload = parseBGDate(s.unloadDate || s.date) || newStart;
          if (newUnload < newStart) newUnload = newStart;
          update(s.id, { date: toBG(newStart), unloadDate: toBG(newUnload) });
        }
      });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  // Навигация на прозореца (каденс = размер на прозореца)
  const shiftWindow = (deltaDays) => setStart((s) => addDays(s, deltaDays));

  // Клавиатурна навигация (стрелки/Home)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") shiftWindow(-days);
      if (e.key === "ArrowRight") shiftWindow(days);
      if (e.key.toLowerCase() === "home") {
        const d = new Date(); d.setHours(0, 0, 0, 0);
        setStart(d);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [days]);

  return (
    <div className="overflow-x-auto">
      {/* Контролна лента за навигация по седмици */}
      <div className="flex items-center justify-end gap-2 mb-2">
        <button
          className="btn btn-ghost h-8"
          onClick={() => shiftWindow(-days)}
          title="Предишни"
          aria-label="Предишни"
        >
          ← предишни
        </button>
        <button
          className="btn btn-ghost h-8"
          onClick={() => {
            const d = new Date(); d.setHours(0, 0, 0, 0);
            setStart(d);
          }}
          title="Днес"
          aria-label="Днес"
        >
          днес
        </button>
        <button
          className="btn btn-ghost h-8"
          onClick={() => shiftWindow(days)}
          title="Следващи"
          aria-label="Следващи"
        >
          следващи →
        </button>
      </div>

      <div style={{ minWidth: days * dayWidth + 180 }} ref={containerRef}>
        {/* Заглавна линия */}
        <div className="flex border-b bg-slate-50">
          <div className="w-[180px] px-3 py-2 text-sm font-semibold">Шофьор</div>
          {Array.from({ length: days }).map((_, i) => {
            const d = addDays(start, i);
            const label = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
            return (
              <div key={i} className="text-xs text-slate-600" style={{ width: dayWidth, padding: "8px" }}>
                {label}
              </div>
            );
          })}
        </div>

        {/* Редове по шофьор */}
        {rows.map((name) => {
          const items = (upcoming || []).filter((s) => s.driver === name);
          return (
            <div key={name} className="flex border-b relative" style={{ height: 36 }}>
              <div className="w-[180px] px-3 py-2 text-sm">{name}</div>
              <div className="relative" style={{ width: days * dayWidth }}>
                {items.map((s) => {
                  const left = leftForDate(s.date);
                  const w = widthForSpan(s.date, s.unloadDate);
                  const color =
                    colorBy === "company" ? colorForCompany(s.company) : colorForDriver(s.driver);

                  const hasDates = !!parseBGDate(s.date);

                  return (
                    <div
                      key={s.id}
                      className={`absolute top-1 h-7 rounded-md shadow-sm ${hasDates ? "cursor-move" : "cursor-not-allowed"} select-none`}
                      style={{ left, width: w, background: color }}
                      onMouseDown={hasDates ? (e) => onDrag(s, e) : undefined}
                      title={`${s.company || ""} • ${s.route || ""} • ${s.date || "?"} – ${s.unloadDate || "?"}`}
                      aria-label={`${s.company || ""} — ${s.route || ""}`}
                    >
                      {/* Resize дръжки */}
                      <div
                        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
                        onMouseDown={(e) => { e.stopPropagation(); hasDates && onResize(s, "left", e); }}
                        title="Скъси/удължи отляво"
                        aria-hidden="true"
                      />
                      <div
                        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
                        onMouseDown={(e) => { e.stopPropagation(); hasDates && onResize(s, "right", e); }}
                        title="Скъси/удължи отдясно"
                        aria-hidden="true"
                      />
                      <div className="px-2 text-xs text-white truncate leading-7">
                        {s.company} — {s.route}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}