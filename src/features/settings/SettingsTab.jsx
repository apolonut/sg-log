// src/features/settings/SettingsTab.jsx
import React, { useMemo, useState } from "react";
import CompanyModal from "./CompanyModal.jsx";
import RouteModal from "./RouteModal.jsx";
import { useSettings } from "./settings.store.jsx";

/** 
 * Optional debug component:
 * - Ако съществува /src/features/debug/MigrateLocalToFirestore.jsx → lazy import.
 * - Ако липсва → връща Noop компонент (не показва нищо) и НЕ предизвиква грешка.
 */
const MigrateLocalToFirestore = React.lazy(async () => {
  const files = import.meta.glob("/src/features/debug/MigrateLocalToFirestore.jsx");
  const loader = files["/src/features/debug/MigrateLocalToFirestore.jsx"];
  if (loader) {
    const mod = await loader();
    return { default: mod.default ?? mod };
  }
  console.warn("[SettingsTab] Optional debug component not present: /src/features/debug/MigrateLocalToFirestore.jsx");
  return { default: () => null };
});

function Body({ clients, subcontractors, routes, onEditClient, onEditSub, onEditRoute }) {
  const clientRows = useMemo(
    () => (clients || []).map((c, i) => ({
      key: c.id || c.name || `client-${i}`,
      name: c.name || "—",
      eik: c.eik || "—",
      address: c.address || "—",
      mol: c.mol || "—",
      raw: c,
    })),
    [clients]
  );

  const subRows = useMemo(
    () => (subcontractors || []).map((c, i) => ({
      key: c.id || c.name || `sub-${i}`,
      name: c.name || "—",
      eik: c.eik || "—",
      address: c.address || "—",
      mol: c.mol || "—",
      raw: c,
    })),
    [subcontractors]
  );

  const routeRows = useMemo(
    () => (routes || []).map((r, i) => ({
      key: r.id || r.name || r.fromTo || `route-${i}`,
      name: r.name || r.fromTo || "—",
      distance: r.distance ?? r.km ?? "—",
      raw: r,
    })),
    [routes]
  );

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Клиенти */}
      <div className="card overflow-x-auto">
        <div className="font-semibold mb-2">Клиенти</div>
        <table className="table w-full">
          <thead>
            <tr className="bg-slate-50">
              <th>Име</th><th>ЕИК</th><th>Адрес</th><th>МОЛ</th><th className="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {clientRows.map((r) => (
              <tr key={r.key} className="hover:bg-slate-50">
                <td className="font-medium">{r.name}</td>
                <td className="text-slate-600">{r.eik}</td>
                <td className="text-slate-600">{r.address}</td>
                <td className="text-slate-600">{r.mol}</td>
                <td className="text-right">
                  <button className="text-xs underline text-slate-600" onClick={() => onEditClient(r.raw)}>
                    редакция
                  </button>
                </td>
              </tr>
            ))}
            {!clientRows.length && (
              <tr><td colSpan={5} className="text-center text-slate-400 py-6">Няма записи.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Подизпълнители */}
      <div className="card overflow-x-auto">
        <div className="font-semibold mb-2">Подизпълнители</div>
        <table className="table w-full">
          <thead>
            <tr className="bg-slate-50">
              <th>Име</th><th>ЕИК</th><th>Адрес</th><th>МОЛ</th><th className="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {subRows.map((r) => (
              <tr key={r.key} className="hover:bg-slate-50">
                <td className="font-medium">{r.name}</td>
                <td className="text-slate-600">{r.eik}</td>
                <td className="text-slate-600">{r.address}</td>
                <td className="text-slate-600">{r.mol}</td>
                <td className="text-right">
                  <button className="text-xs underline text-slate-600" onClick={() => onEditSub(r.raw)}>
                    редакция
                  </button>
                </td>
              </tr>
            ))}
            {!subRows.length && (
              <tr><td colSpan={5} className="text-center text-slate-400 py-6">Няма записи.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Релации */}
      <div className="card overflow-x-auto md:col-span-2">
        <div className="font-semibold mb-2">Релации</div>
        <table className="table w-full">
          <thead>
            <tr className="bg-slate-50">
              <th>Име</th><th>Км</th><th className="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {routeRows.map((r) => (
              <tr key={r.key} className="hover:bg-slate-50">
                <td className="font-medium">{r.name}</td>
                <td className="text-slate-600">{r.distance}</td>
                <td className="text-right">
                  <button className="text-xs underline text-slate-600" onClick={() => onEditRoute(r.raw)}>
                    редакция
                  </button>
                </td>
              </tr>
            ))}
            {!routeRows.length && (
              <tr><td colSpan={3} className="text-center text-slate-400 py-6">Няма записи.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SettingsTab() {
  const {
    sorted,
    upsertClient, upsertSubcontractor, upsertRoute,
    removeClient, removeSubcontractor, removeRoute,
  } = useSettings();

  const [modals, setModals] = useState({
    company: { open: false, value: null, kind: "client" },
    route:   { open: false, value: null },
  });

  const openCompany  = (kind, value=null) => setModals((m)=>({ ...m, company: { open: true,  value, kind } }));
  const closeCompany = ()                 => setModals((m)=>({ ...m, company: { open: false, value: null, kind: "client" } }));
  const openRoute    = (value=null)       => setModals((m)=>({ ...m, route:   { open: true,  value } }));
  const closeRoute   = ()                 => setModals((m)=>({ ...m, route:   { open: false, value: null } }));

  const handleSaveCompany   = (data, kind) => { (kind === "sub" ? upsertSubcontractor : upsertClient)(data); closeCompany(); };
  const handleDeleteCompany = (id,   kind) => { if (!id) return; (kind === "sub" ? removeSubcontractor : removeClient)(id); closeCompany(); };
  const handleSaveRoute     = (data)       => { upsertRoute(data); closeRoute(); };
  const handleDeleteRoute   = (id)         => { removeRoute(id);   closeRoute(); };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-bold">Настройки</div>
        <div className="flex gap-2">
          <button className="btn btn-ghost"   onClick={() => openCompany("client")}>+ Нова фирма (клиент)</button>
          <button className="btn btn-ghost"   onClick={() => openCompany("sub")}>+ Нов подизпълнител</button>
          <button className="btn btn-primary" onClick={() => openRoute()}>+ Нова релация</button>
        </div>
      </div>

      <Body
        clients={sorted.clients}
        subcontractors={sorted.subcontractors}
        routes={sorted.routes}
        onEditClient={(data) => openCompany("client", data)}
        onEditSub={(data) => openCompany("sub", data)}
        onEditRoute={(data) => openRoute(data)}
      />

      <CompanyModal
        open={modals.company.open}
        value={modals.company.value}
        kind={modals.company.kind}
        onClose={closeCompany}
        onSave={(data) => handleSaveCompany(data, modals.company.kind)}
        onDelete={(id) => handleDeleteCompany(id, modals.company.kind)}
      />

      <RouteModal
        open={modals.route.open}
        value={modals.route.value}
        onClose={closeRoute}
        onSave={handleSaveRoute}
        onDelete={handleDeleteRoute}
      />

      {/* Администрация / Миграция — показва се само ако debug файлът реално съществува */}
      <div className="mt-8">
        <div className="text-sm font-semibold mb-2">Администрация</div>
        <React.Suspense fallback={null}>
          <MigrateLocalToFirestore />
        </React.Suspense>
      </div>
    </>
  );
}
