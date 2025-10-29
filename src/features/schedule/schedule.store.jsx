// src/features/schedule/schedule.store.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useCallback, useState } from "react";
import { parseBGDate } from "@/shared/utils/dates.jsx";
import { db } from "@/firebase.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

// ---- Helpers ----
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

/**
 * По-реалистичен статус:
 * - ако има само start => преди start = PLANNED; след/на start = IN_PROGRESS
 * - ако има start и end:
 *    t < start  => PLANNED
 *    start<=t<=end => IN_PROGRESS
 *    t > end    => DONE
 */
function computeStatus(dateStr, unloadStr) {
  const t = today0();
  const st = parseBGDate(dateStr);
  const en = parseBGDate(unloadStr);

  if (!st && !en) return STATUS.PLANNED;
  if (st && !en) {
    if (t < st) return STATUS.PLANNED;
    return STATUS.IN_PROGRESS;
  }
  if (!st && en) {
    // рядък случай, но приемаме, че е IN_PROGRESS докато мине end
    if (t <= en) return STATUS.IN_PROGRESS;
    return STATUS.DONE;
  }
  if (t < st) return STATUS.PLANNED;
  if (t >= st && t <= en) return STATUS.IN_PROGRESS;
  if (t > en) return STATUS.DONE;
  return STATUS.PLANNED;
}

const toISO = (bg /* dd.mm.yyyy */) => {
  if (!bg) return "";
  const d = parseBGDate(bg);
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ---- Collections ----
const COL = "schedules";
const COL_ARCH = "schedules_archived";

// ---- Context ----
const SchedulesCtx = createContext(null);

export function SchedulesProvider({ children }) {
  const [list, setList] = useState([]);         // активни (realtime от Firestore)
  const [archived, setArchived] = useState([]); // архив (realtime от Firestore)

  // Тикер за „смяна на деня“ и focus рефреш (за да се преизчисляват селектори/статуси)
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const onFocus = () => setNowTick((x) => x + 1);
    window.addEventListener("focus", onFocus);
    // опционално: дневен таймер (в 00:05ч)
    const msToMidnight = (() => {
      const t = new Date();
      t.setHours(24, 5, 0, 0);
      return t.getTime() - Date.now();
    })();
    const midnightTimer = setTimeout(() => setNowTick((x) => x + 1), Math.max(1000, msToMidnight));
    return () => {
      window.removeEventListener("focus", onFocus);
      clearTimeout(midnightTimer);
    };
  }, []);

  // Realtime: активни
  useEffect(() => {
    const qAct = query(collection(db, COL), orderBy("dateISO", "asc"));
    const unsub = onSnapshot(
      qAct,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() || {};
          const status = computeStatus(data.date, data.unloadDate);
          return { id: d.id, ...data, status };
        });
        setList(rows);
      },
      (e) => console.error("[schedule.store] active snapshot error:", e)
    );
    return () => unsub();
  }, []);

  // Realtime: архив
  useEffect(() => {
    const qArch = query(collection(db, COL_ARCH), orderBy("dateISO", "desc"));
    const unsub = onSnapshot(
      qArch,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() || {};
          const status = computeStatus(data.date, data.unloadDate);
          return { id: d.id, ...data, status };
        });
        setArchived(rows);
      },
      (e) => console.error("[schedule.store] archive snapshot error:", e)
    );
    return () => unsub();
  }, []);

  // Селектори (рефрешват и при nowTick)
  const past = useMemo(() => {
    const t0 = today0().getTime();
    return (list || []).filter((s) => {
      const end = parseBGDate(s.unloadDate || s.date);
      return end && end.getTime() < t0;
    });
  }, [list, nowTick]);

  const upcoming = useMemo(() => {
    const t0 = today0().getTime();
    return (list || []).filter((s) => {
      const end = parseBGDate(s.unloadDate || s.date);
      return end && end.getTime() >= t0;
    });
  }, [list, nowTick]);

  const getPastCount = () => past.length;
  const getPastSlice = (n = 20, offset = 0) => past.slice(offset, offset + n);
  const getPastSinceDays = (days = 7) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return past.filter((s) => {
      const d = parseBGDate(s.unloadDate || s.date);
      return d && d.getTime() >= cutoff;
    });
  };

  const isArchived = useCallback(
    (id) => (archived || []).some((x) => x.id === id),
    [archived]
  );

  // CRUD: активни
  const add = useCallback(async (payload) => {
    const docObj = {
      company: payload.company || "",
      route: payload.route || "",
      driver: payload.driver || "",
      driverCompany: payload.driverCompany || "",
      leg: payload.leg || "Прав",
      date: payload.date || "",
      unloadDate: payload.unloadDate || "",
      dateISO: toISO(payload.date),
      unloadDateISO: toISO(payload.unloadDate),
      komandirovka: payload.komandirovka || "",
      notes: payload.notes || "",
      tractor: payload.tractor || "",
      tanker: payload.tanker || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const res = await addDoc(collection(db, COL), docObj);
    return res.id;
  }, []);

  const bulkAdd = useCallback(
    async (items = []) => {
      const results = await Promise.allSettled(items.map((p) => add(p)));
      return results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
    },
    [add]
  );

  const update = useCallback(async (id, patch) => {
    if (!id) return null;
    const next = { ...patch, updatedAt: serverTimestamp() };
    if ("date" in patch) next.dateISO = toISO(patch.date);
    if ("unloadDate" in patch) next.unloadDateISO = toISO(patch.unloadDate);
    await updateDoc(doc(db, COL, id), next);
    return { id, ...next };
  }, []);

  const remove = useCallback(async (id) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, COL, id));
    } finally {
      // безопасно чистим и от архива, ако случайно съществува
      try { await deleteDoc(doc(db, COL_ARCH, id)); } catch {}
    }
  }, []);

  // Архивиране / Деархивиране (move между колекции)
  const archiveById = useCallback(async (id) => {
    if (!id) return;
    // ако вече е в архива — нищо не правим
    if (isArchived(id)) return;
    const srcRef = doc(db, COL, id);
    const snap = await getDoc(srcRef);
    if (!snap.exists()) return;
    const data = snap.data() || {};
    await setDoc(doc(db, COL_ARCH, id), {
      ...data,
      archivedAt: serverTimestamp(),
    });
    await deleteDoc(srcRef);
  }, [isArchived]);

  const unarchiveById = useCallback(async (id) => {
    if (!id) return;
    const srcRef = doc(db, COL_ARCH, id);
    const snap = await getDoc(srcRef);
    if (!snap.exists()) return;
    const data = snap.data() || {};
    await setDoc(doc(db, COL, id), {
      ...data,
      unarchivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await deleteDoc(srcRef);
  }, []);

  // Автоматично архивиране: изпълнени товари, по-стари от N дни
  const archiveAuto = useCallback(
    async ({ cutoffDays = 14 } = {}) => {
      const now = today0();
      const cutoffMs = cutoffDays * 24 * 60 * 60 * 1000;

      const candidates = (list || []).filter((s) => {
        const st = computeStatus(s.date, s.unloadDate);
        if (st !== STATUS.DONE) return false;
        const end = parseBGDate(s.unloadDate || s.date);
        if (!end) return false;
        return now.getTime() - end.getTime() >= cutoffMs;
      });

      if (!candidates.length) return 0;

      await Promise.allSettled(
        candidates.map((s) => archiveById(s.id))
      );
      return candidates.length;
    },
    [list, archiveById]
  );

  const clone = useCallback(async (id) => {
    const src = (list || []).find((x) => x.id === id);
    if (!src) return null;
    const copy = {
      company: src.company || "",
      route: src.route || "",
      driver: "",
      leg: src.leg || "Прав",
      date: src.date || "",
      unloadDate: src.unloadDate || "",
      komandirovka: "",
      notes: "",
      tractor: src.tractor || "",
      tanker: src.tanker || "",
      driverCompany: "",
    };
    return await add(copy);
  }, [list, add]);

  // copy helper (фиксиран ключ + fallback)
  const copyToClipboard = async (s) => {
    const kmd = s.komandirovka || s.KMD || "—";
    const text = [
      `Клиент: ${s.company || "—"}`,
      `Релация: ${s.route || "—"}`,
      `Шофьор: ${s.driver || "—"}`,
      `Дати: ${s.date || "—"} – ${s.unloadDate || "—"}`,
      `№: ${kmd}`,
      `Бележки: ${s.notes || "—"}`
    ].join(" | ");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        // no-op
      }
    }
  };

  // KMD: (временно) локален месечен брояч — оставен за съвместимост
  const ymKey = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}${m}`;
  };
  const readCounterForMonth = (ym) => {
    const raw = localStorage.getItem(`kmdCounter_${ym}`);
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const writeCounterForMonth = (ym, n) => {
    localStorage.setItem(`kmdCounter_${ym}`, String(n));
  };
  const buildKmd = (number, date) => {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${number}/${dd}.${mm}`;
  };
  const getNextKmd = ({ dateStr, commit } = { dateStr: null, commit: false }) => {
    const dt = parseBGDate(dateStr) || new Date();
    const ymk = ymKey(dt);
    const current = readCounterForMonth(ymk);
    const num = current + 1;
    if (commit) writeCounterForMonth(ymk, current + 1);
    return buildKmd(num, dt);
  };

  const recomputeStatuses = useCallback(() => {
    setList((prev) => (prev || []).map((s) => ({ ...s, status: computeStatus(s.date, s.unloadDate) })));
    // подсети селекторите да се пресметнат наново
    setNowTick((x) => x + 1);
  }, []);

  const value = {
    // данни
    list,
    archived,
    // селектори
    past,
    upcoming,
    getPastCount,
    getPastSlice,
    getPastSinceDays,
    // архивиране
    archiveById,
    unarchiveById,
    isArchived,
    archiveAuto,
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

  return <SchedulesCtx.Provider value={value}>{children}</SchedulesCtx.Provider>;
}

export function useSchedules() {
  return useContext(SchedulesCtx);
}
