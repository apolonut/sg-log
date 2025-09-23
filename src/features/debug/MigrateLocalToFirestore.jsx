import React, { useEffect, useMemo, useState } from "react";
import { db } from "@/firebase.js";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";

// dd.mm.yyyy -> yyyy-mm-dd
const toISO = (bg) => {
  if (!bg) return null;
  const [dd, mm, yyyy] = String(bg).split(".");
  if (!yyyy || !mm || !dd) return null;
  return `${yyyy}-${mm}-${dd}`;
};
const norm = (v) => String(v || "").trim();

export default function MigrateLocalToFirestore() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState("");
  const [sel, setSel] = useState({
    drivers: true,
    clients: true,          // включва и legacy 'companies'
    subcontractors: true,
    routes: true,
    schedules: true,
    schedules_archived: true,
  });

  // четене на локални масиви (и legacy companies -> clients)
  const data = useMemo(() => {
    const drivers = JSON.parse(localStorage.getItem("drivers") || "[]");

    // clients: клиенти от 'clients' + legacy 'companies'
    const clientsLocal = JSON.parse(localStorage.getItem("clients") || "[]");
    const legacyCompanies = JSON.parse(localStorage.getItem("companies") || "[]");
    const clients = [
      ...clientsLocal,
      ...legacyCompanies.map((c) => ({
        id: c.id || `cli_legacy_${Math.random().toString(36).slice(2)}`,
        name: c.name, eik: c.eik, address: c.address, mol: c.mol,
      })),
    ];

    const subcontractors = JSON.parse(localStorage.getItem("subcontractors") || "[]");
    const routes = JSON.parse(localStorage.getItem("routes") || "[]");
    const schedules = JSON.parse(localStorage.getItem("schedules") || "[]");
    const schedules_archived = JSON.parse(localStorage.getItem("schedules_archived") || "[]");
    return { drivers, clients, subcontractors, routes, schedules, schedules_archived };
  }, []);

  const counts = {
    drivers: data.drivers.length,
    clients: data.clients.length,
    subcontractors: data.subcontractors.length,
    routes: data.routes.length,
    schedules: data.schedules.length,
    schedules_archived: data.schedules_archived.length,
  };

  useEffect(() => {
    // ако имаш legacy 'companies', покажи подсказка
    if (localStorage.getItem("companies")) {
      console.warn("[migrate] Намерих legacy localStorage ключ 'companies' → ще го мигрирам към 'clients'.");
    }
  }, []);

  const run = async () => {
    if (running) return;
    setRunning(true);
    const rep = [];

    try {
      // ===== drivers =====
      if (sel.drivers) {
        let n = 0;
        for (let i = 0; i < data.drivers.length; i++) {
          const d = data.drivers[i] || {};
          const id = d.id || `drv_${Date.now()}_${i}`;
          await setDoc(doc(db, "drivers", id), {
            name: norm(d.name), phone: norm(d.phone), company: norm(d.company),
            createdAt: serverTimestamp(),
          }, { merge: true });
          n++;
        }
        rep.push(`drivers: ${n}`);
      }

      // ===== clients (вкл. legacy 'companies') =====
      if (sel.clients) {
        let n = 0;
        for (let i = 0; i < data.clients.length; i++) {
          const c = data.clients[i] || {};
          const id = c.id || `cli_${Date.now()}_${i}`;
          await setDoc(doc(db, "clients", id), {
            name: norm(c.name), eik: norm(c.eik), address: norm(c.address), mol: norm(c.mol),
            createdAt: serverTimestamp(),
          }, { merge: true });
          n++;
        }
        rep.push(`clients: ${n}`);
      }

      // ===== subcontractors =====
      if (sel.subcontractors) {
        let n = 0;
        for (let i = 0; i < data.subcontractors.length; i++) {
          const s = data.subcontractors[i] || {};
          const id = s.id || `sub_${Date.now()}_${i}`;
          await setDoc(doc(db, "subcontractors", id), {
            name: norm(s.name), eik: norm(s.eik), address: norm(s.address), mol: norm(s.mol),
            createdAt: serverTimestamp(),
          }, { merge: true });
          n++;
        }
        rep.push(`subcontractors: ${n}`);
      }

      // ===== routes =====
      if (sel.routes) {
        let n = 0;
        for (let i = 0; i < data.routes.length; i++) {
          const r = data.routes[i] || {};
          const id = r.id || `rt_${Date.now()}_${i}`;
          await setDoc(doc(db, "routes", id), {
            name: norm(r.name) || (r.from && r.to ? `${norm(r.from)} → ${norm(r.to)}` : ""),
            from: norm(r.from), to: norm(r.to),
            distance: Number.isFinite(+r.distance) ? +r.distance : "",
            duration: Number.isFinite(+r.duration) ? +r.duration : "",
            isBidirectional: !!r.isBidirectional,
            notes: norm(r.notes),
            clientIds: Array.isArray(r.clientIds) ? r.clientIds.filter(Boolean) : [],
            createdAt: serverTimestamp(),
          }, { merge: true });
          n++;
        }
        rep.push(`routes: ${n}`);
      }

      // ===== schedules (active) =====
      if (sel.schedules) {
        let n = 0;
        for (let i = 0; i < data.schedules.length; i++) {
          const s = data.schedules[i] || {};
          const id = s.id || `sch_${Date.now()}_${i}`;
          const dateISO = toISO(s.date);
          const unloadISO = toISO(s.unloadDate) || dateISO;
          await setDoc(doc(db, "schedules", id), {
            ...s,
            date: s.date || null,
            unloadDate: s.unloadDate || s.date || null,
            dateISO, unloadISO,
            createdAt: serverTimestamp(),
          }, { merge: true });
          n++;
        }
        rep.push(`schedules: ${n}`);
      }

      // ===== schedules_archived =====
      if (sel.schedules_archived) {
        let n = 0;
        for (let i = 0; i < data.schedules_archived.length; i++) {
          const s = data.schedules_archived[i] || {};
          const id = s.id || `arch_${Date.now()}_${i}`;
          const dateISO = toISO(s.date);
          const unloadISO = toISO(s.unloadDate) || dateISO;
          await setDoc(doc(db, "schedules_archived", id), {
            ...s,
            date: s.date || null,
            unloadDate: s.unloadDate || s.date || null,
            dateISO, unloadISO,
            originalId: s.id || id,
            archivedAt: serverTimestamp(),
          }, { merge: true });
          n++;
        }
        rep.push(`schedules_archived: ${n}`);
      }

      setReport(rep.join(" | "));
      alert("Миграцията завърши успешно. Рефрешни приложението (Ctrl+R).");
    } catch (e) {
      console.error("Migration error:", e);
      alert("Грешка при миграцията – виж конзолата (DevTools).");
    } finally {
      setRunning(false);
    }
  };

  const clearLocal = () => {
    if (!confirm("Сигурен ли си, че искаш да изтриеш локалните данни от този браузър?")) return;
    ["drivers", "clients", "companies", "subcontractors", "routes", "schedules", "schedules_archived"]
      .forEach((k) => localStorage.removeItem(k));
    alert("Локалните записи са изтрити.");
  };

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="text-sm font-semibold">Миграция към Firestore</div>
      <p className="text-sm text-slate-600">
        Копира localStorage → Firestore. Идемпотентно (setDoc с едни и същи id).
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
        {[
          ["drivers", "Шофьори"],
          ["clients", "Клиенти (вкл. legacy 'companies')"],
          ["subcontractors", "Подизпълнители"],
          ["routes", "Релации"],
          ["schedules", "График (активни)"],
          ["schedules_archived", "График (архив)"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sel[key]}
              onChange={(e) => setSel((s) => ({ ...s, [key]: e.target.checked }))}
            />
            <span>{label} <span className="text-slate-500">({counts[key]})</span></span>
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={run} disabled={running}>
          {running ? "Работи…" : "Мигрирай избраното"}
        </button>
        <button className="btn btn-outline" onClick={clearLocal}>Изтрий локалните данни</button>
      </div>

      {report && <div className="text-sm text-slate-700">Резултат: {report}</div>}
    </div>
  );
}
