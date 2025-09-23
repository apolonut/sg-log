// src/features/settings/settings.store.jsx
import React, { createContext, useContext, useEffect, useMemo, useCallback } from "react";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";
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

/** localStorage ключове (НЕ ги сменяме, за да не чупим нищо) */
const LS_KEYS = {
  clients: "clients",
  subcontractors: "subcontractors",
  routes: "routes",
};

/** Seed-ове (може да са и []) */
const seedClients = [{ id: "cli1", name: "Бай Лъчо ООД", eik: "", address: "", mol: "" }];
const seedSubs    = [{ id: "sub1", name: "Кака Лъчка ЕООД", eik: "", address: "", mol: "" }];
const seedRoutes  = []; // { id, name, from, to, distance, duration, isBidirectional, notes, clientIds }

/** Колекции в Firestore */
const COL_CLIENTS = "clients";
const COL_SUBS    = "subcontractors";
const COL_ROUTES  = "routes";

/** Помощници */
const ensureId = (prefix = "id") => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const normStr  = (v) => String(v || "").trim();
const ciEq     = (a, b) => normStr(a).toLowerCase() === normStr(b).toLowerCase();

/** Дедупликация по name (case-insensitive) */
function dedupeByName(items) {
  const seen = new Set();
  const out = [];
  for (const it of items || []) {
    const key = normStr(it?.name).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

/** Нормализиране на route (добавяме clientIds: []) */
function normalizeRoute(r) {
  const name = normStr(r?.name) || (r?.from && r?.to ? `${r.from} → ${r.to}` : "");
  const distance = Number.isFinite(+r?.distance) ? +r.distance : "";
  const duration = Number.isFinite(+r?.duration) ? +r.duration : "";
  const clientIds = Array.isArray(r?.clientIds) ? r.clientIds.filter(Boolean) : [];

  return {
    id: r?.id || ensureId("rt"),
    name,
    from: normStr(r?.from),
    to: normStr(r?.to),
    distance,                 // (км, по желание)
    duration,                 // (дни; ползва се в QuickAddRelation)
    isBidirectional: !!r?.isBidirectional,
    notes: normStr(r?.notes),
    clientIds,                // списък от id на клиенти, към които е вързана релацията
  };
}

/** Търсене по name (contains, case-insensitive) */
function searchByName(list, q) {
  const s = normStr(q).toLowerCase();
  if (!s) return list || [];
  return (list || []).filter((x) => normStr(x?.name).toLowerCase().includes(s));
}

const Ctx = createContext(null);

export function SettingsProvider({ children }) {
  // Оставяме localStorage API/ключове, но данните идват от Firestore (realtime)
  const [clients, setClients]             = useLocalStorage(LS_KEYS.clients,        seedClients);
  const [subcontractors, setSubs]         = useLocalStorage(LS_KEYS.subcontractors, seedSubs);
  const [routes, setRoutes]               = useLocalStorage(LS_KEYS.routes,         seedRoutes);

  /** ===== Firestore realtime ===== */

  // Clients
  useEffect(() => {
    const qClients = query(collection(db, COL_CLIENTS), orderBy("name", "asc"));
    const unsub = onSnapshot(qClients, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(rows || []);
    }, (e) => console.error("[settings.store] clients snapshot error:", e));
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subcontractors
  useEffect(() => {
    const qSubs = query(collection(db, COL_SUBS), orderBy("name", "asc"));
    const unsub = onSnapshot(qSubs, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubs(rows || []);
    }, (e) => console.error("[settings.store] subs snapshot error:", e));
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Routes
  useEffect(() => {
    const qRoutes = query(collection(db, COL_ROUTES), orderBy("name", "asc"));
    const unsub = onSnapshot(qRoutes, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...normalizeRoute(d.data()) }));
      setRoutes(rows || []);
    }, (e) => console.error("[settings.store] routes snapshot error:", e));
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ===== Миграции/нормализации (еднократно, само за стара локална история) ===== */
  useEffect(() => {
    // Нормализирай всички локални релации (ако имало стари данни) – безопасно
    setRoutes((prev) => Array.isArray(prev) ? prev.map(normalizeRoute) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ===== CRUD: Clients ===== */
  const upsertClient = useCallback(async (item) => {
    const incoming = { ...item, name: normStr(item?.name) };
    if (!incoming.name) return;

    if (incoming.id) {
      // update
      await updateDoc(doc(db, COL_CLIENTS, incoming.id), {
        name: incoming.name,
        eik: normStr(incoming.eik),
        address: normStr(incoming.address),
        mol: normStr(incoming.mol),
      });
    } else {
      // create
      await addDoc(collection(db, COL_CLIENTS), {
        name: incoming.name,
        eik: normStr(incoming.eik),
        address: normStr(incoming.address),
        mol: normStr(incoming.mol),
        createdAt: serverTimestamp(),
      });
    }
  }, []);

  const removeClient = useCallback(async (id) => {
    if (!id) return;
    await deleteDoc(doc(db, COL_CLIENTS, id));
  }, []);

  const bulkUpsertClients = useCallback(async (items = []) => {
    for (const raw of items) {
      await upsertClient(raw);
    }
  }, [upsertClient]);

  /** ===== CRUD: Subcontractors ===== */
  const upsertSub = useCallback(async (item) => {
    const incoming = { ...item, name: normStr(item?.name) };
    if (!incoming.name) return;

    if (incoming.id) {
      await updateDoc(doc(db, COL_SUBS, incoming.id), {
        name: incoming.name,
        eik: normStr(incoming.eik),
        address: normStr(incoming.address),
        mol: normStr(incoming.mol),
      });
    } else {
      await addDoc(collection(db, COL_SUBS), {
        name: incoming.name,
        eik: normStr(incoming.eik),
        address: normStr(incoming.address),
        mol: normStr(incoming.mol),
        createdAt: serverTimestamp(),
      });
    }
  }, []);

  const removeSub = useCallback(async (id) => {
    if (!id) return;
    await deleteDoc(doc(db, COL_SUBS, id));
  }, []);

  const bulkUpsertSubs = useCallback(async (items = []) => {
    for (const raw of items) {
      await upsertSub(raw);
    }
  }, [upsertSub]);

  /** ===== CRUD: Routes ===== */
  const upsertRoute = useCallback(async (item) => {
    const incoming = normalizeRoute(item);

    if (incoming.id) {
      await updateDoc(doc(db, COL_ROUTES, incoming.id), {
        name: incoming.name,
        from: incoming.from,
        to: incoming.to,
        distance: incoming.distance,
        duration: incoming.duration,
        isBidirectional: incoming.isBidirectional,
        notes: incoming.notes,
        clientIds: incoming.clientIds,
      });
    } else {
      await addDoc(collection(db, COL_ROUTES), {
        name: incoming.name,
        from: incoming.from,
        to: incoming.to,
        distance: incoming.distance,
        duration: incoming.duration,
        isBidirectional: incoming.isBidirectional,
        notes: incoming.notes,
        clientIds: incoming.clientIds,
        createdAt: serverTimestamp(),
      });
    }
  }, []);

  const removeRoute = useCallback(async (id) => {
    if (!id) return;
    await deleteDoc(doc(db, COL_ROUTES, id));
  }, []);

  const bulkUpsertRoutes = useCallback(async (items = []) => {
    for (const raw of items) {
      await upsertRoute(raw);
    }
  }, [upsertRoute]);

  /** ===== Удобни lookup-и / търсене / сортиране ===== */
  const maps = {
    clientById:        useMemo(() => new Map((clients || []).map((c) => [c.id, c])), [clients]),
    subcontractorById: useMemo(() => new Map((subcontractors || []).map((s) => [s.id, s])), [subcontractors]),
    routeById:         useMemo(() => new Map((routes || []).map((r) => [r.id, r])), [routes]),
  };

  const sortByNameAsc = (a, b) => normStr(a?.name).localeCompare(normStr(b?.name), "bg");

  const search = {
    clients:        (q) => searchByName(clients, q),
    subcontractors: (q) => searchByName(subcontractors, q),
    routes:         (q) => searchByName(routes, q),
  };

  const sorted = {
    clients:        useMemo(() => [...(clients || [])].sort(sortByNameAsc), [clients]),
    subcontractors: useMemo(() => [...(subcontractors || [])].sort(sortByNameAsc), [subcontractors]),
    routes:         useMemo(() => [...(routes || [])].sort(sortByNameAsc), [routes]),
  };

  /** Филтри за релации по клиент (за QuickAddRelation) */
  const getRoutesForClient = (clientId) => {
    if (!clientId) return sorted.routes;
    return (sorted.routes || []).filter((r) => Array.isArray(r.clientIds) && r.clientIds.includes(clientId));
  };

  /** Import / Export */
  const exportData = () => ({
    version: 2,
    exportedAt: new Date().toISOString(),
    clients,
    subcontractors,
    routes,
  });

  const importData = async (data = {}) => {
    const inClients = Array.isArray(data.clients) ? data.clients : [];
    const inSubs    = Array.isArray(data.subcontractors) ? data.subcontractors : [];
    const inRoutes  = Array.isArray(data.routes) ? data.routes : [];
    await bulkUpsertClients(inClients);
    await bulkUpsertSubs(inSubs);
    await bulkUpsertRoutes(inRoutes.map(normalizeRoute));
  };

  /** Валидатор за дубликати по име (за модалите) */
  const isDuplicateName = (type, name, ignoreId = null) => {
    const list = type === "client" ? clients : subcontractors;
    const nm = normStr(name);
    return (list || []).some((x) => ciEq(x.name, nm) && x.id !== ignoreId);
  };

  /** API, който изнасяме (без да чупим текущите имена) */
  const api = {
    // данни
    clients, subcontractors, routes,
    // сортирани
    sorted,
    // lookup-и
    maps,
    // търсене
    search,
    // CRUD
    upsertClient,
    upsertSubcontractor: upsertSub,
    upsertRoute,
    removeClient,
    removeSubcontractor: removeSub,
    removeRoute,
    bulkUpsertClients,
    bulkUpsertSubcontractors: bulkUpsertSubs,
    bulkUpsertRoutes,
    // import/export
    exportData,
    importData,
    // проверки
    isDuplicateName,
    // филтри
    getRoutesForClient,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
