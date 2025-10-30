// src/features/drivers/drivers.store.jsx
import React, { createContext, useContext, useEffect, useCallback, useState } from "react";
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

// dd.mm.yyyy -> yyyy-mm-dd
const toISO = (bg) => {
  if (!bg) return null;
  const [dd, mm, yyyy] = String(bg).split(".");
  if (!yyyy || !mm || !dd) return null;
  return `${yyyy}-${mm}-${dd}`;
};

// нормализация на драйвер
const normalizeDriver = (raw = {}) => {
  const name    = String(raw.name || "").trim();
  const phone   = String(raw.phone || raw.contact || "").trim();
  const company = (raw.company && String(raw.company).trim()) || "SG"; // празно => SG
  const egn     = String(raw.egn || "").trim();

  const tractor = String(raw.tractor || "").trim();
  const tanker  = String(raw.tanker  || "").trim();

  const driverCardExpiry = String(raw.driverCardExpiry || "").trim(); // dd.mm.yyyy
  const adrExpiry        = String(raw.adrExpiry || "").trim();       // dd.mm.yyyy

  const driverCardExpiryISO = toISO(driverCardExpiry);
  const adrExpiryISO        = toISO(adrExpiry);

  return {
    name,
    phone,
    company,
    egn,
    tractor,
    tanker,

    // документи (шофьорска карта / ADR)
    driverCardExpiry: driverCardExpiry || "",
    driverCardExpiryISO: driverCardExpiryISO || null,

    adrExpiry: adrExpiry || "",
    adrExpiryISO: adrExpiryISO || null,
  };
};

export function DriversProvider({ children }) {
  const [drivers, setDrivers] = useState([]);

  // Realtime четене
  useEffect(() => {
    // сортираме по име; ако името е еднакво, Firestore ще си реши по id
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
  }, []);

  // Създай/обнови
  const upsert = useCallback(async (data) => {
    const payload = {
      ...normalizeDriver(data),
      updatedAt: serverTimestamp(),
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

  // Изтрий
  const remove = useCallback(async (id) => {
    if (!id) return;
    await deleteDoc(doc(db, COL, id));
  }, []);

  const api = {
    list: drivers,
    upsert,
    remove,
  };

  return <DriversCtx.Provider value={api}>{children}</DriversCtx.Provider>;
}

export const useDrivers = () => useContext(DriversCtx);
