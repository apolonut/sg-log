// src/app/App.jsx
import React, { useEffect, useState } from "react";
import Shell from "../shared/components/Shell.jsx";
import { Routes } from "./routes.jsx";

// Firebase: диагностика + live тест
import { app, auth, db } from "@/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

// ⬇️ ВАЖНО: увиваме приложението с провайдърите
import { DriversProvider } from "@/features/drivers/drivers.store.jsx";
import { TehnikaProvider } from "@/features/tehnika/tehnika.store.jsx";
import { SettingsProvider } from "@/features/settings/settings.store.jsx";
import { SchedulesProvider } from "@/features/schedule/schedule.store.jsx";

// Покажи/скрий временното debug табло (смени на false, когато не ти трябва)
const SHOW_DEBUG = true;

/** Малък live-sync тест върху колекция 'sync_probe' */
function SyncProbe() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const q = query(collection(db, "sync_probe"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const add = async () => {
    if (!text.trim()) return;
    await addDoc(collection(db, "sync_probe"), {
      text,
      createdAt: serverTimestamp(),
    });
    setText("");
  };

  return (
    <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Текст за тест"
          style={{ flex: 1, padding: 6 }}
        />
        <button onClick={add} style={{ padding: "6px 10px", cursor: "pointer" }}>
          Добави
        </button>
      </div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((i) => (
          <li key={i.id}>{i.text || <em>(празно)</em>}</li>
        ))}
      </ul>
    </div>
  );
}

/** Показва projectId, част от apiKey и текущия auth.uid */
function DebugBanner() {
  const [uid, setUid] = useState(null);
  const projectId = app?.options?.projectId || "(няма)";
  const apiKey6 = (app?.options?.apiKey || "").slice(0, 6);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid || null);
      console.log("[SG] projectId =", projectId);
      console.log("[SG] apiKey(6) =", apiKey6);
      console.log("[SG] auth.uid =", u?.uid);
    });
    return () => unsub();
  }, [projectId, apiKey6]);

  return (
    <div style={{ padding: 12, border: "1px dashed #aaa", borderRadius: 8, marginBottom: 12, background: "#fafafa" }}>
      <div><strong>projectId:</strong> {projectId}</div>
      <div><strong>apiKey (първи 6):</strong> {apiKey6 || "(празно)"}</div>
      <div><strong>auth.uid:</strong> {uid || "(няма)"}</div>
    </div>
  );
}

const NAV = [
  { key: "dashboard", label: "Дашборд",   icon: "dashboard" },
  { key: "schedule",  label: "График",    icon: "calendar"  },
  { key: "drivers",   label: "Шофьори",   icon: "drivers"   },
  { key: "tehnika",   label: "Техника",   icon: "truck"     },
  { key: "settings",  label: "Настройки", icon: "settings"  },
];

export default function App() {
  const [active, setActive] = useState("dashboard");
  const current = NAV.find((n) => n.key === active);

  // Глобална навигация през CustomEvent
  useEffect(() => {
    const onNav = (e) => {
      const tab = e?.detail?.tab;
      if (!tab) return;
      setActive(tab);
    };
    window.addEventListener("app:navigate", onNav);
    return () => window.removeEventListener("app:navigate", onNav);
  }, []);

  return (
    <SettingsProvider>
      <DriversProvider>
        <TehnikaProvider>
          <SchedulesProvider>
            <Shell
              navItems={NAV}
              activeKey={active}
              onNavChange={setActive}
              title={current?.label || "SG Logistics"}
            >
              <div className="p-4 md:p-6 lg:p-8">
                {SHOW_DEBUG && (
                  <>
                    <DebugBanner />
                    <SyncProbe />
                  </>
                )}
                <Routes active={active} />
              </div>
            </Shell>
          </SchedulesProvider>
        </TehnikaProvider>
      </DriversProvider>
    </SettingsProvider>
  );
}
