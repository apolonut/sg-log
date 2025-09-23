// src/shared/components/Topbar.jsx
import React, { useEffect } from "react";
import GlobalSearch from "./GlobalSearch.jsx";
import NotificationsBell from "./NotificationsBell.jsx";
import QuickAddMenu from "./QuickAddMenu.jsx";

export default function Topbar({ title = "", onHamburger, notifications }) {
  // Нормализатор за събития „quick-add“ → {kind} → {type}
  useEffect(() => {
    const normalizeQuickAdd = (e) => {
      const d = e?.detail || {};
      if (d.type) return;
      if (d.kind) {
        window.dispatchEvent(new CustomEvent("quick-add", { detail: { type: String(d.kind) } }));
      }
    };
    window.addEventListener("quick-add", normalizeQuickAdd);
    return () => window.removeEventListener("quick-add", normalizeQuickAdd);
  }, []);

  const handleQuickAdd = (type) => {
    if (!type) return;
    window.dispatchEvent(new CustomEvent("quick-add", { detail: { type: String(type) } }));
  };

  return (
    <div
      className="sticky top-0 z-20 border-b"
      style={{
        background: "var(--brand-600, rgb(79 70 229))",
        color: "var(--brand-on, white)",
      }}
    >
      <div className="h-16 flex items-center gap-3 px-3 md:px-6">
        <button
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/10"
          onClick={onHamburger}
          aria-label="Меню"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
            <path d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z" />
          </svg>
        </button>

        <h1 className="text-lg md:text-xl font-semibold tracking-tight">{title}</h1>

        <div className="ml-auto flex items-center gap-2">
          <GlobalSearch />
          <NotificationsBell items={notifications} />
          <QuickAddMenu onQuickAdd={handleQuickAdd} />
        </div>
      </div>
    </div>
  );
}
