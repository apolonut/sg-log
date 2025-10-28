// src/shared/components/NotificationsBell.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * API:
 * - <NotificationsBell items={[{id, title, message, date, read:false}]} onMarkAllRead={fn}/>
 *   Ако items не е подаден, ще чете + пише в localStorage("notifications") за назад-съвместимост.
 * - onOpen / onClose — незадължителни колбекове
 */
export default function NotificationsBell({ items, onOpen, onClose, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const [localItems, setLocalItems] = useState([]);

  const btnRef = useRef(null);
  const rootRef = useRef(null);

  // fallback към localStorage ако няма props.items
  useEffect(() => {
    if (Array.isArray(items)) return;
    try {
      const raw = localStorage.getItem("notifications");
      const arr = JSON.parse(raw || "[]");
      if (Array.isArray(arr)) setLocalItems(arr);
    } catch {
      setLocalItems([]);
    }
  }, [items]);

  const list = useMemo(() => (Array.isArray(items) ? items : localItems), [items, localItems]);
  const unread = list.filter((n) => !n.read).length;

  // затваряне при клик извън
  useEffect(() => {
    const onDocClick = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        if (open) {
          setOpen(false);
          onClose?.();
        }
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open, onClose]);

  // Esc → затваря
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        onClose?.();
        btnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next) onOpen?.();
      else onClose?.();
      return next;
    });
  };

  const fmt = (d) => {
    try {
      const dt = typeof d === "string" || typeof d?.toDate === "function"
        ? (typeof d?.toDate === "function" ? d.toDate() : new Date(d))
        : d;
      return dt.toLocaleString();
    } catch {
      return "";
    }
  };

  const markAllRead = () => {
    if (Array.isArray(items)) {
      onMarkAllRead?.();
      return;
    }
    const next = list.map((n) => ({ ...n, read: true }));
    setLocalItems(next);
    try { localStorage.setItem("notifications", JSON.stringify(next)); } catch {}
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        title="Уведомления"
        onClick={toggle}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg
                   text-white hover:bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
          <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22ZM19 17v-5a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2Z"/>
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full
                           bg-rose-500 text-white text-[10px] leading-[18px] text-center font-bold">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Уведомления"
          className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-lg z-30
                     bg-slate-900/95 text-white border border-white/10 shadow-xl backdrop-blur"
        >
          <div className="p-2 border-b border-white/10 flex items-center justify-between">
            <div className="text-sm font-semibold">Уведомления</div>
            <button
              type="button"
              className="text-xs px-2 py-1 rounded hover:bg-white/10"
              onClick={markAllRead}
            >
              Маркирай всички като прочетени
            </button>
          </div>

          <div className="max-h-80 overflow-auto p-1">
            {list.length === 0 && (
              <div className="px-3 py-6 text-sm text-white/70">Няма уведомления.</div>
            )}

            {list.map((n) => (
              <div
                key={n.id ?? `${n.title}-${n.date ?? ""}`}
                className={`px-3 py-2 rounded-md mb-1 last:mb-0 hover:bg-white/10 ${
                  n.read ? "opacity-80" : "bg-white/5"
                }`}
              >
                <div className="text-sm font-medium truncate">{n.title || "Съобщение"}</div>
                {n.message ? (
                  <div className="text-xs text-white/80 truncate">{n.message}</div>
                ) : null}
                {n.date ? (
                  <div className="text-[11px] text-white/60 mt-0.5">{fmt(n.date)}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
