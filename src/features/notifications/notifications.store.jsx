// src/features/notifications/notifications.store.jsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { app, auth, db } from "@/firebase.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const Ctx = createContext(null);
const COL = "notifications";

export function NotificationsProvider({ children }) {
  const [uid, setUid] = useState(null);
  const [items, setItems] = useState([]);

  // следим auth.uid
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUid(u?.uid || null));
    return () => unsubAuth();
  }, []);

  // realtime snapshot с тихо превключване към предпочитаната заявка (ако има индекс)
  useEffect(() => {
    if (!uid) {
      setItems([]);
      return;
    }

    const colRef = collection(db, COL);

    // 1) Fallback: where(uid) без orderBy → няма нужда от индекс; сортираме локално
    let unsubActive = onSnapshot(
      query(colRef, where("uid", "==", uid)),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => {
          const ta = (a.date?.seconds ?? a.createdAt?.seconds ?? 0);
          const tb = (b.date?.seconds ?? b.createdAt?.seconds ?? 0);
          return tb - ta; // desc
        });
        setItems(rows || []);
      },
      // грешките тук са малко вероятни; пазим тишина
      () => {}
    );

    // 2) Опит за предпочитана заявка: where(uid) + orderBy(date desc) → изисква индекс.
    // Ако мине успешно, превключваме към нея и спираме fallback-а.
    const qPreferred = query(colRef, where("uid", "==", uid), orderBy("date", "desc"));
    const unsubPreferredTry = onSnapshot(
      qPreferred,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setItems(rows || []);
        // превключи: спри fallback-а и остави предпочитаната заявка активна
        if (unsubActive && unsubActive !== unsubPreferredTry) {
          try { unsubActive(); } catch {}
        }
        unsubActive = unsubPreferredTry;
      },
      // ако няма индекс → игнорираме тихо и оставаме на fallback
      () => {}
    );

    return () => {
      if (unsubActive) { try { unsubActive(); } catch {} }
      // ако по някаква причина unsubActive не е равен на unsubPreferredTry, спри и него
      if (unsubPreferredTry && unsubPreferredTry !== unsubActive) {
        try { unsubPreferredTry(); } catch {}
      }
    };
  }, [uid]);

  // CRUD
  const add = useCallback(async ({ title, message = "" }) => {
    if (!uid) return null;
    const res = await addDoc(collection(db, COL), {
      uid,
      title: String(title || "").trim() || "Съобщение",
      message: String(message || "").trim(),
      read: false,
      date: serverTimestamp(),
      createdAt: serverTimestamp(),
      projectId: app?.options?.projectId || null,
    });
    return res.id;
  }, [uid]);

  const remove = useCallback(async (id) => {
    if (!id) return;
    await deleteDoc(doc(db, COL, id));
  }, []);

  const markRead = useCallback(async (id) => {
    if (!id) return;
    await updateDoc(doc(db, COL, id), { read: true });
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = (items || []).filter((n) => !n.read);
    await Promise.all(unread.map((n) => updateDoc(doc(db, COL, n.id), { read: true })));
  }, [items]);

  const value = useMemo(() => ({
    list: items,
    add,
    remove,
    markRead,
    markAllRead,
    unreadCount: (items || []).filter((n) => !n.read).length,
  }), [items, add, remove, markRead, markAllRead]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useNotifications = () => useContext(Ctx);
