// src/shared/components/Sidebar.jsx
import React from "react";

const Icon = ({ name, className = "w-5 h-5" }) => {
  if (name === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" />
      </svg>
    );
  }
  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3V2Zm13 8H4v10h16V10Z" />
      </svg>
    );
  }
  if (name === "drivers") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm-7 9a7 7 0 0 1 14 0Z" />
      </svg>
    );
  }
  if (name === "truck") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M3 6h11v8h2l3-4h2v8h-2a3 3 0 0 1-6 0H9a3 3 0 0 1-6 0H1V8a2 2 0 0 1 2-2Zm2 10a2 2 0 1 0 2 2 2 2 0 0 0-2-2Zm10 0a2 2 0 1 0 2 2 2 2 0 0 0-2-2Z" />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M12 8a4 4 0 1 1-4 4 4 4 0 0 1 4-4Zm8.94 4a7.92 7.92 0 0 0-.15-1.58l2.11-1.65-2-3.46-2.6 1a8.11 8.11 0 0 0-2.74-1.58l-.41-2.76h-4l-.41 2.76A8.11 8.11 0 0 0 7.7 4.73l-2.6-1-2 3.46 2.11 1.65A7.92 7.92 0 0 0 5.06 12a7.92 7.92 0 0 0 .15 1.58l-2.11 1.65 2 3.46 2.6-1a8.11 8.11 0 0 0 2.74 1.58l.41 2.76h4l.41-2.76a8.11 8.11 0 0 0 2.74-1.58l2.6 1 2-3.46-2.11-1.65A7.92 7.92 0 0 0 20.94 12Z" />
      </svg>
    );
  }
  return <span className={className} />;
};

export default function Sidebar({ items = [], activeKey, onChange, open }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 brand-surface-0
                  transform transition-transform md:translate-x-0 ${
                    open ? "translate-x-0" : "-translate-x-full"
                  } md:block`}
    >
      {/* Header с лого */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-200">
        <img
          src="/sg-logo.png"
          alt="SG Logistics"
          className="h-7 w-auto select-none"
          draggable="false"
        />
        <div className="text-lg font-extrabold tracking-tight">
          {/* текстът е в цвят на бранда с безопасен fallback */}
          <span
            className="font-extrabold"
            style={{ color: "var(--brand-700, rgb(67 56 202))" }}
          >
            SG
          </span>{" "}
          Logistics
        </div>
      </div>

      {/* Навигация */}
      <nav className="p-2">
        {items.map((it) => {
          const active = it.key === activeKey;
          return (
            <button
              key={it.key}
              onClick={() => onChange?.(it.key)}
              aria-current={active ? "page" : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-left
                          transition-colors ${
                            active
                              ? "border"
                              : "border border-transparent hover:bg-slate-50"
                          }`}
              // brand фон/цвят за active + безопасни fallbacks
              style={
                active
                  ? {
                      background: "var(--brand-50, rgb(238 242 255))",
                      color: "var(--brand-700, rgb(67 56 202))",
                      borderColor: "var(--brand-200, rgb(199 210 254))",
                    }
                  : undefined
              }
            >
              <Icon
                name={it.icon}
                className="w-5 h-5"
                // оцветяваме иконата според състоянието с var() fallback
                style={{
                  color: active
                    ? "var(--brand-600, rgb(79 70 229))"
                    : "rgb(100 116 139)",
                }}
              />
              <span className={active ? "" : "text-slate-600"}>{it.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 text-xs text-slate-500">
        v1.0 • © {new Date().getFullYear()}
      </div>
    </aside>
  );
}
