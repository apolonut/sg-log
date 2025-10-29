// src/features/drivers/drivers.store.jsx
import React, { createContext, useContext, useEffect, useCallback, useState, useMemo } from "react";
import { db } from "@/firebase.js";
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

// нормализация: празна/липсваща фирма -> "SG"
const normalizeCompany = (company) => {
  const c = String(company || "").trim();
  return c ? c : "SG";
};

export function DriversProvider({ children }) {
  // Държим състоянието само в React; данните идват live от Firestore
  const [drivers, setDrivers] = useState([]);

  // Realtime четене от Firestore
  useEffect(() => {
    const q = query(collection(db, COL), orderBy("name", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() || {};
          const company = normalizeCompany(data.company);
          return {
            id: d.id,
            ...data,
            company,
            isSubcontractor: company !== "SG",
          };
        });
        setDrivers(rows || []);
      },
      (err) => {
        console.error("[drivers.store] onSnapshot error:", err);
      }
    );
    return () => unsub();
  }, []);

  // Създай или обнови драйвер във Firestore
  const upsert = useCallback(async (data) => {
    const payload = {
      name: (data.name || "").trim(),
      phone: (data.phone || "").trim(),
      company: normalizeCompany(data.company),
    };

    if (data.id) {
      await updateDoc(doc(db, COL, data.id), payload);
      return data.id;
    } else {
      const res = await addDoc(collection(db, COL), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      return res.id;
    }
  }, []);

  // Изтриване
  const remove = useCallback(async (id) => {
    if (!id) return;
    await deleteDoc(doc(db, COL, id));
  }, []);

  // Удобни селектори (без да чупят нищо)
  const sgDrivers = useMemo(() => (drivers || []).filter(d => d.company === "SG"), [drivers]);
  const subcontractors = useMemo(() => (drivers || []).filter(d => d.company !== "SG"), [drivers]);

  const api = {
    list: drivers,        // съвместимо с текущия ти код
    upsert,
    remove,
    // опционално ползване:
    sgDrivers,
    subcontractors,
  };

  return <DriversCtx.Provider value={api}>{children}</DriversCtx.Provider>;
}

export const useDrivers = () => useContext(DriversCtx);
