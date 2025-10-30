// src/features/tehnika/tehnika.store.jsx
import React, { createContext, useContext, useEffect, useCallback } from "react";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";
import { db } from "@/firebase.js";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

/** Seed (остават за локален fall-back; Firestore ще ги замести при налични данни) */
const seedTrucks = [
  { id: "t1", number: "А 50 22 MP", type: "truck", insuranceExpiry: "15.12.2025" },
];
const seedTankers = [
  { id: "k1", number: "A 08 36 ЕМ", type: "tanker", insuranceExpiry: "15.12.2025" },
];

/** Колекции във Firestore */
const COL_TRUCKS = "trucks";
const COL_TANKERS = "tankers";

/** dd.mm.yyyy -> yyyy-mm-dd (за сортиране/филтри във Firestore) */
const toISO = (bg) => {
  if (!bg) return null;
  const [dd, mm, yyyy] = String(bg).split(".");
  if (!yyyy || !mm || !dd) return null;
  return `${yyyy}-${mm}-${dd}`;
};

/** Нормализиране на запис (и за влекачи, и за цистерни) */
const normalizeItem = (raw = {}, defType = "truck") => {
  const number = String(raw.number || "").trim();
  const type = String(raw.type || defType).trim();

  const insuranceExpiry = String(raw.insuranceExpiry || raw.goExpiry || "").trim();
  const adrExpiry        = String(raw.adrExpiry || "").trim();
  const inspectionExpiry = String(raw.inspectionExpiry || raw.techExpiry || "").trim();

  const insuranceExpiryISO  = toISO(insuranceExpiry);
  const adrExpiryISO        = toISO(adrExpiry);
  const inspectionExpiryISO = toISO(inspectionExpiry);

  return {
    number,
    type,

    // ГО / ADR / Преглед
    insuranceExpiry: insuranceExpiry || "",
    insuranceExpiryISO: insuranceExpiryISO || null,

    adrExpiry: adrExpiry || "",
    adrExpiryISO: adrExpiryISO || null,

    inspectionExpiry: inspectionExpiry || "",
    inspectionExpiryISO: inspectionExpiryISO || null,

    // доп. полета (ако решиш да ги ползваш по-нататък)
    brand: String(raw.brand || "").trim(),
    model: String(raw.model || "").trim(),
    year: raw.year || "",
    vin: String(raw.vin || "").trim(),
    notes: String(raw.notes || "").trim(),
  };
};

const Ctx = createContext(null);

export function TehnikaProvider({ children }) {
  // Държим старите localStorage ключове за съвместимост с UI
  const [trucks, setTrucks] = useLocalStorage("trucks", seedTrucks);
  const [tankers, setTankers] = useLocalStorage("tankers", seedTankers);

  // === Realtime (trucks)
  useEffect(() => {
    let unsub;
    try {
      const q = query(collection(db, COL_TRUCKS), orderBy("number", "asc"));
      unsub = onSnapshot(
        q,
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setTrucks(rows || []);
        },
        (err) => console.error("[tehnika.store] trucks onSnapshot error:", err)
      );
    } catch {
      unsub = onSnapshot(
        collection(db, COL_TRUCKS),
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setTrucks(rows || []);
        },
        (err) => console.error("[tehnika.store] trucks onSnapshot error (no orderBy):", err)
      );
    }
    return () => unsub && unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === Realtime (tankers)
  useEffect(() => {
    let unsub;
    try {
      const q = query(collection(db, COL_TANKERS), orderBy("number", "asc"));
      unsub = onSnapshot(
        q,
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setTankers(rows || []);
        },
        (err) => console.error("[tehnika.store] tankers onSnapshot error:", err)
      );
    } catch {
      unsub = onSnapshot(
        collection(db, COL_TANKERS),
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setTankers(rows || []);
        },
        (err) => console.error("[tehnika.store] tankers onSnapshot error (no orderBy):", err)
      );
    }
    return () => unsub && unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === CRUD: trucks
  const upsertTruck = useCallback(async (item) => {
    const payload = {
      ...normalizeItem(item, "truck"),
      updatedAt: serverTimestamp(),
    };
    if (item.id) {
      await updateDoc(doc(db, COL_TRUCKS, item.id), payload);
      return item.id;
    } else {
      const res = await addDoc(collection(db, COL_TRUCKS), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      return res.id;
    }
  }, []);

  const removeTruck = useCallback(async (id) => {
    if (!id) return;
    await deleteDoc(doc(db, COL_TRUCKS, id));
  }, []);

  // === CRUD: tankers
  const upsertTanker = useCallback(async (item) => {
    const payload = {
      ...normalizeItem(item, "tanker"),
      updatedAt: serverTimestamp(),
    };
    if (item.id) {
      await updateDoc(doc(db, COL_TANKERS, item.id), payload);
      return item.id;
    } else {
      const res = await addDoc(collection(db, COL_TANKERS), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      return res.id;
    }
  }, []);

  const removeTanker = useCallback(async (id) => {
    if (!id) return;
    await deleteDoc(doc(db, COL_TANKERS, id));
  }, []);

  const api = {
    trucks,
    tankers,
    upsertTruck,
    upsertTanker,
    removeTruck,
    removeTanker,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useTehnika = () => useContext(Ctx);
