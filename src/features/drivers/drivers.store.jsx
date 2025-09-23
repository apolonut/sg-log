// src/features/drivers/drivers.store.jsx
import React, { createContext, useContext, useEffect, useCallback } from "react";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";
import { seedDrivers } from "./seed";
import { db } from "@/firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

const DriversCtx = createContext(null);
const COL = "drivers";

export function DriversProvider({ children }) {
  // Държим стария localStorage ключ за съвместимост с друг код
  const [drivers, setDrivers] = useLocalStorage("drivers", seedDrivers);

  // Realtime четене от Firestore → поддържа и localStorage актуален
  useEffect(() => {
    const q = query(collection(db, COL), orderBy("name", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDrivers(rows || []);
      },
      (err) => {
        console.error("[drivers.store] onSnapshot error:", err);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Създай или обнови драйвер във Firestore
  const upsert = useCallback(async (data) => {
    const payload = {
      name: (data.name || "").trim(),
      phone: data.phone || "",
      company: data.company || "",
    };

    if (data.id) {
      // update
      await updateDoc(doc(db, COL, data.id), payload);
      return data.id;
    } else {
      // create
      const res = await addDoc(collection(db, COL), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      return res.id;
    }
  }, []);

  // (по желание) изтриване – не чупи API-то, просто добавяме функция
  const remove = useCallback(async (id) => {
    if (!id) return;
    await deleteDoc(doc(db, COL, id));
  }, []);

  const api = {
    list: drivers, // съвместимо с текущия ти код
    upsert,        // същото име/подпис
    remove,        // допълнително удобство
  };

  return <DriversCtx.Provider value={api}>{children}</DriversCtx.Provider>;
}

export const useDrivers = () => useContext(DriversCtx);
