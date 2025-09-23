import React, { useEffect, useRef, useState } from "react";

// глобално събитие за бързи добавяния
function fireQuickAdd(type) {
  window.dispatchEvent(new CustomEvent("quick-add", { detail: { type } }));
}

export default function QuickAddMenu({ onQuickAdd }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const btnRef = useRef(null);

  // клик извън менюто → затваря
  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Esc → затваря
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const trigger = (type) => {
    onQuickAdd?.(type);
    fireQuickAdd(type);
    setOpen(false);
    btnRef.current?.focus();
  };

  const items = [
    { k: "schedule", label: "Нова задача" },
    { k: "driver",   label: "Нов шофьор" },
    { k: "truck",    label: "Ново ПС" },
    { k: "route",    label: "Нова релация" },
    { k: "company",  label: "Нова фирма" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-lg
                   text-white bg-transparent border border-white/20
                   hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-lg leading-none select-none">＋</span>
        <span className="text-sm font-semibold">Добави</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Бързо добавяне"
          className="absolute right-0 mt-2 w-56 rounded-lg p-1 z-30
                     bg-slate-900/95 text-white border border-white/10 shadow-xl backdrop-blur"
        >
          {items.map((it, idx) => (
            <button
              key={it.k}
              role="menuitem"
              className="w-full text-left px-3 py-2 text-sm rounded-md
                         hover:bg-white/10 focus:bg-white/10 focus:outline-none"
              onClick={() => trigger(it.k)}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
