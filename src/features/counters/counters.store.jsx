// src/features/counters/counters.store.jsx
import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import { db } from "@/firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Глобални броячи (Firestore), основно за КМД:
 * - Номерацията е ГОДИШНА: един брояч на година.
 * - Връща формат "<номер>/<dd.MM>".
 * - ИНКРЕМЕНТ се прави САМО за "Прав" товар.
 *
 * Публичен API (чрез useCounters()):
 * - getNextKmd({ dateStr: "dd.mm.yyyy", leg: "Прав"|"Обратен", commit: boolean }): string
 *     Ако commit===true и leg!=="Обратен" → транзакционно увеличава брояча.
 * - peekKmd({ dateStr }): number   (връща текущия последен номер за годината, без инкремент)
 * - getYearValue(year): number     (чете суровата стойност за година)
 */

const Ctx = createContext(null);

// Помощници
const splitBG = (bg) => {
  if (!bg || typeof bg !== "string") return [null, null, null];
  const [dd, mm, yyyy] = bg.split(".");
  return [dd, mm, yyyy];
};
const formatShort = (dd, mm) => `${dd}.${mm}`;
const docPathForYear = (yyyy) => `counters/kmd-${yyyy}`;

export function CountersProvider({ children }) {
  const [cache, setCache] = useState({}); // { '2025': { value: 123 } }

  // мързеливо зареждане на година в кеш
  const ensureYearLoaded = useCallback(async (yyyy) => {
    if (!yyyy) return 0;
    if (cache[yyyy]?.value != null) return cache[yyyy].value;

    const ref = doc(db, docPathForYear(yyyy));
    const snap = await getDoc(ref);
    const val = Number(snap.exists() ? (snap.data()?.value ?? 0) : 0) || 0;
    setCache((c) => ({ ...c, [yyyy]: { value: val } }));
    return val;
  }, [cache]);

  // публично: връща текущия последен номер за годината (без инкремент)
  const peekKmd = useCallback(async ({ dateStr }) => {
    const [, , yyyy] = splitBG(dateStr);
    if (!yyyy) return 0;
    return await ensureYearLoaded(yyyy);
  }, [ensureYearLoaded]);

  // публично: чете суровата стойност за конкретна година
  const getYearValue = useCallback(async (yyyy) => {
    if (!yyyy) return 0;
    return await ensureYearLoaded(yyyy);
  }, [ensureYearLoaded]);

  // публично: връща следващия КМД (по дата); commit + leg контролират инкремента
  const getNextKmd = useCallback(async ({ dateStr, leg = "Прав", commit = false } = {}) => {
    const [dd, mm, yyyy] = splitBG(dateStr);
    if (!dd || !mm || !yyyy) return "";

    // ако НЕ комитваме или легът е "Обратен" → само подглед (без инкремент)
    if (!commit || String(leg) === "Обратен") {
      const current = await ensureYearLoaded(yyyy);
      const next = current + 1;
      return `${next}/${formatShort(dd, mm)}`;
    }

    // commit + "Прав" → транзакционен инкремент на годишния брояч
    const ref = doc(db, docPathForYear(yyyy));
    let nextNumber = 0;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const current = Number(snap.exists() ? (snap.data()?.value ?? 0) : 0) || 0;
      nextNumber = current + 1;

      if (!snap.exists()) {
        tx.set(ref, { value: nextNumber, updatedAt: serverTimestamp() });
      } else {
        tx.update(ref, { value: nextNumber, updatedAt: serverTimestamp() });
      }
    });

    // обнови кеша локално
    setCache((c) => ({ ...c, [yyyy]: { value: nextNumber } }));

    return `${nextNumber}/${formatShort(dd, mm)}`;
  }, [ensureYearLoaded]);

  const value = useMemo(() => ({
    peekKmd,       // async ({dateStr}) => number
    getNextKmd,    // async ({dateStr, leg, commit}) => string "<номер>/<dd.MM>"
    getYearValue,  // async (yyyy) => number
  }), [peekKmd, getNextKmd, getYearValue]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCounters = () => useContext(Ctx);
