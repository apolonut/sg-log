// src/features/schedule/schedule.store.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { isPastBGDate, compareBG, parseBGDate } from "@/shared/utils/dates.jsx";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";

// ---- Helpers -------------------------------------------------

const genId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const STATUS = {
  PLANNED: "Планирано",
  IN_PROGRESS: "В процес",
  DONE: "Изпълнено",
  CANCELED: "Отказано",
};

const today0 = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

function computeStatus(dateStr, unloadStr) {
  const t = today0();
  const st = parseBGDate(dateStr);
  const en = parseBGDate(unloadStr);
  if (!st || !en) return STATUS.PLANNED;
  if (t < st) return STATUS.PLANNED;
  if (t >= st && t <= en) return STATUS.IN_PROGRESS;
  if (t > en) return STATUS.DONE;
  return STATUS.PLANNED;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

// ---- KMD (командировъчен №) ---------------------------------

function ymKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}
function readCounterForMonth(ym) {
  const raw = localStorage.getItem(`kmdCounter_${ym}`);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
function writeCounterForMonth(ym, n) {
  localStorage.setItem(`kmdCounter_${ym}`, String(n));
}
function buildKmd(number, date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${number}/${dd}.${mm}`;
}

// ---- Context -------------------------------------------------

const SchedulesCtx = createContext(null);

export function SchedulesProvider({ children }) {
  // АКТИВНИ товари
  const [list, setList] = useLocalStorage("schedules", []);
  // АРХИВ (отделен масив)
  const [archived, setArchived] = useLocalStorage("schedules_archived", []);

  // снапшот на драйверите за извеждане на driverCompany
  const [drivers] = useLocalStorage("drivers", []);

  const driverCompanyByName = useMemo(() => {
    const map = new Map();
    (drivers || []).forEach((d) => map.set(d.name, d.company || ""));
    return map;
  }, [drivers]);

  // при mount: пресеем статусите (активни)
  useEffect(() => {
    setList((prev) =>
      (prev || []).map((s) => {
        const status = computeStatus(s.date, s.unloadDate);
        const driverCompany = s.driver ? (driverCompanyByName.get(s.driver) || "") : "";
        return { ...s, status, driverCompany };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recomputeStatuses = () => {
    setList((prev) =>
      (prev || []).map((s) => {
        const status = computeStatus(s.date, s.unloadDate);
        const driverCompany = s.driver ? (driverCompanyByName.get(s.driver) || "") : "";
        return { ...s, status, driverCompany };
      })
    );
  };

  // ---------- История / селектори ----------
  const past = useMemo(() => {
    return (list || [])
      .filter((s) => isPastBGDate(s.unloadDate || s.date))
      .sort((a, b) => compareBG(a.unloadDate || a.date, b.unloadDate || b.date)); // desc
  }, [list]);

  const upcoming = useMemo(() => {
    return (list || [])
      .filter((s) => !isPastBGDate(s.unloadDate || s.date))
      .sort((a, b) => {
        const ta = parseBGDate(a.date)?.getTime() ?? Infinity;
        const tb = parseBGDate(b.date)?.getTime() ?? Infinity;
        return ta - tb;
      });
  }, [list]);

  const getPastCount = () => past.length;
  const getPastSlice = (n = 20, offset = 0) => past.slice(offset, offset + n);
  const getPastSinceDays = (days = 7) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return past.filter((s) => {
      const d = parseBGDate(s.unloadDate || s.date);
      return d && d.getTime() >= cutoff;
    });
  };

  // ---------- Архивиране (с guard-и — без дубли) ----------
  const archivedList = useMemo(
    () =>
      (archived || []).sort((a, b) =>
        compareBG(a.unloadDate || a.date, b.unloadDate || b.date)
      ),
    [archived]
  );

  const isArchived = (id) => !!(archived || []).find((x) => x.id === id);

  const archiveById = (id) => {
    if (!id) return;
    // ако вече е в архива -> нищо
    if (isArchived(id)) return;

    setList((prev = []) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx === -1) return prev;
      const rec = prev[idx];
      // безопасно добавяне в архива (без дубли)
      setArchived((A = []) => {
        if (A.some((x) => x.id === id)) return A;
        return [ { ...rec }, ...A ];
      });
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  const unarchiveById = (id) => {
    if (!id) return;
    setArchived((prev = []) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx === -1) return prev;
      const rec = prev[idx];
      const status = computeStatus(rec.date, rec.unloadDate);
      const driverCompany = rec.driver ? (driverCompanyByName.get(rec.driver) || "") : "";

      // върни към активните — без дубли
      setList((L = []) => {
        if (L.some((x) => x.id === id)) return L;
        return [{ ...rec, status, driverCompany }, ...L];
      });

      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  // архивира всички DONE до cutoff (без дубли в архива)
  const archiveUntil = (dateStr) => {
    const cutoff = parseBGDate(dateStr);
    if (!cutoff) return 0;
    cutoff.setHours(23, 59, 59, 999);
    let moved = 0;

    setList((prev = []) => {
      const keep = [];
      const move = [];
      for (const s of prev) {
        const end = parseBGDate(s.unloadDate || s.date);
        if (s.status === STATUS.DONE && end && end <= cutoff) move.push(s);
        else keep.push(s);
      }
      if (move.length) {
        setArchived((A = []) => {
          const existing = new Set((A || []).map((x) => x.id));
          const add = move.filter((m) => !existing.has(m.id));
          moved = add.length;
          return add.length ? [...add, ...A] : A;
        });
      }
      return keep;
    });

    return moved;
  };

  // автоматичен архив: DONE по-стари от N дни (без дубли)
  const archiveAuto = ({ cutoffDays = 14 } = {}) => {
    const cutoff = new Date();
    cutoff.setHours(23, 59, 59, 999);
    cutoff.setDate(cutoff.getDate() - cutoffDays);
    let moved = 0;

    setList((prev = []) => {
      const keep = [];
      const move = [];
      for (const s of prev) {
        const end = parseBGDate(s.unloadDate || s.date);
        if (s.status === STATUS.DONE && end && end <= cutoff) move.push(s);
        else keep.push(s);
      }
      if (move.length) {
        setArchived((A = []) => {
          const existing = new Set((A || []).map((x) => x.id));
          const add = move.filter((m) => !existing.has(m.id));
          moved = add.length;
          return add.length ? [...add, ...A] : A;
        });
      }
      return keep;
    });

    return moved;
  };

  // ---------- CRUD (активни) ----------
  const add = (payload) => {
    const id = payload.id || genId();
    const status = computeStatus(payload.date, payload.unloadDate);
    const driverCompany = payload.driver ? (driverCompanyByName.get(payload.driver) || "") : "";
    const item = { ...payload, id, status, driverCompany };
    setList((prev) => [item, ...prev]);
    return id;
  };

  const bulkAdd = (items = []) => {
    const prepared = items.map((p) => {
      const id = p.id || genId();
      const status = computeStatus(p.date, p.unloadDate);
      const driverCompany = p.driver ? (driverCompanyByName.get(p.driver) || "") : "";
      return { ...p, id, status, driverCompany };
    });
    setList((prev) => [...prepared, ...prev]);
    return prepared.map((x) => x.id);
  };

  const update = (id, patch) => {
    let updated = null;
    setList((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        next.status = computeStatus(next.date, next.unloadDate);
        next.driverCompany = next.driver ? (driverCompanyByName.get(next.driver) || "") : "";
        updated = next;
        return next;
      })
    );
    return updated;
  };

  const remove = (id) => {
    setList((prev) => prev.filter((s) => s.id !== id));
    // ако случайно има такъв запис в архива (няма да вреди) — чистим
    setArchived((A = []) => A.filter((x) => x.id !== id));
  };

  // clone
  const clone = (id) => {
    const src = (list || []).find((x) => x.id === id);
    if (!src) return null;
    const copy = {
      id: genId(),
      company: src.company || "",
      route: src.route || "",
      driver: "",
      leg: src.leg || "Прав",
      date: src.date,
      unloadDate: src.unloadDate,
      status: computeStatus(src.date, src.unloadDate),
      komandirovka: "",
      notes: src.notes || "",
      pairGroupId: null,
      driverCompany: "",
    };
    setList((prev) => [copy, ...prev]);
    return copy.id;
  };

  // copyToClipboard
  const copyToClipboard = (s) => {
    const text = [
      `Клиент: ${s.company || "—"}`,
      `Релация: ${s.route || "—"}`,
      `Шофьор: ${s.driver || "—"}`,
      `Дати: ${s.date || "—"} – ${s.unloadDate || "—"}`,
      `№: ${s.komandirovka || "—"}`,
      `Бележки: ${s.notes || "—"}`,
    ].join(" | ");
    return copyText(text);
  };

  // KMD
  const getNextKmd = ({ dateStr, commit } = { dateStr: null, commit: false }) => {
    const dt = parseBGDate(dateStr) || new Date();
    const ymk = ymKey(dt);
    const current = readCounterForMonth(ymk);
    const num = current + (commit ? 1 : 1);
    if (commit) writeCounterForMonth(ymk, current + 1);
    return buildKmd(num, dt);
  };

  const value = {
    // данни
    list,                 // активни
    archived: archivedList,
    // селектори
    past,
    upcoming,
    getPastCount,
    getPastSlice,
    getPastSinceDays,
    // архивиране
    archiveById,
    unarchiveById,
    archiveUntil,
    archiveAuto,
    isArchived,
    // CRUD
    add,
    bulkAdd,
    update,
    remove,
    clone,
    // helpers
    copyToClipboard,
    getNextKmd,
    recomputeStatuses,
    STATUS,
  };

  // авто-обновяване на статусите при фокус на таба
  const onFocusRef = useRef(null);
  useEffect(() => {
    onFocusRef.current = () => recomputeStatuses();
    const fn = () => onFocusRef.current && onFocusRef.current();
    window.addEventListener("focus", fn);
    return () => window.removeEventListener("focus", fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <SchedulesCtx.Provider value={value}>{children}</SchedulesCtx.Provider>;
}

export function useSchedules() {
  return useContext(SchedulesCtx);
}
