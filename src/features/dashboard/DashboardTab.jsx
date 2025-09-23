// src/features/dashboard/DashboardTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "../../shared/hooks/useLocalStorage";
import { parseBGDate, checkExpiry } from "../../shared/utils/dates";
import EditScheduleModal from "../schedule/EditScheduleModal.jsx";
import EditDriverModal   from "../drivers/EditDriverModal.jsx";
import CompanyModal      from "../settings/CompanyModal.jsx";
import RouteModal        from "../settings/RouteModal.jsx";
import EditTruckModal    from "../tehnika/EditTruckModal.jsx";
import { exportSchedules } from "../../shared/utils/export";

// Малък кръг за статус
const Dot = ({ color = "bg-slate-400" }) => (
  <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
);

// Компактни KPI чипове (горе)
const StatChip = ({ label, value, tone = "default" }) => {
  const tones = {
    default: "bg-white border-slate-200",
    warn: "bg-amber-50 border-amber-200",
    ok: "bg-emerald-50 border-emerald-200",
  };
  return (
    <div className={`border ${tones[tone]} rounded-xl px-3 py-2 flex items-center gap-2`}>
      <span className="text-xl font-extrabold leading-none">{value}</span>
      <span className="text-sm text-slate-600">{label}</span>
    </div>
  );
};

const DriverDisplay = ({ name, company }) => (
  <>
    {name}
    {company ? <span className="text-slate-500 font-normal ml-1">/{company}/</span> : null}
  </>
);

const TripsTable = ({ trips, drivers }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50">
          <th className="p-2.5 font-semibold text-slate-600 text-xs">Шофьор</th>
          <th className="p-2.5 font-semibold text-slate-600 text-xs">Релация</th>
          <th className="p-2.5 font-semibold text-slate-600 text-xs">Дати</th>
        </tr>
      </thead>
      <tbody>
        {trips.map((trip, i) => {
          const drv = drivers.find((d) => d.name === trip.driver);
          return (
            <tr key={trip.id || `${trip.driver}-${trip.date}-${i}`} className="border-b hover:bg-slate-50 text-sm">
              <td className="p-2.5 font-medium text-slate-800">
                <DriverDisplay name={trip.driver} company={drv?.company} />
              </td>
              <td className="p-2.5 text-slate-600">{trip.route || trip.relation || "—"}</td>
              <td className="p-2.5 text-slate-600 whitespace-nowrap">
                {(trip.date || trip.startDate || "—")} – {(trip.unloadDate || trip.endDate || "—")}
              </td>
            </tr>
          );
        })}
        {!trips.length && (
          <tr>
            <td colSpan={3} className="text-center text-slate-400 py-6">Няма записи.</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

// История (последни 5) – безопасно без дублирани ключове
const PastTripsCard = ({ schedules }) => {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // минали са тези, при които unloadDate е преди днес
  const past = useMemo(() => {
    // 1) филтрираме миналите
    const raw = (schedules || []).filter((s) => {
      const end = parseBGDate(s.unloadDate || s.endDate);
      return end && end < today;
    });

    // 2) сортираме най-скорошни първи
    raw.sort((a, b) => {
      const ea = parseBGDate(a.unloadDate || a.endDate)?.getTime() ?? 0;
      const eb = parseBGDate(b.unloadDate || b.endDate)?.getTime() ?? 0;
      return eb - ea;
    });

    // 3) дедуп по id (ако има дублирани записи в storage-а)
    const seen = new Set();
    const deduped = [];
    for (const s of raw) {
      const key = s.id || `${s.company}|${s.route}|${s.date}|${s.unloadDate}|${s.driver}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(s);
      if (deduped.length >= 5) break; // показваме последните 5
    }
    return deduped;
  }, [schedules, today]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Dot color="bg-slate-500" />
          <h3 className="text-lg font-bold mb-0">История (последни 5)</h3>
        </div>
        <span className="text-xs text-slate-500">{past.length} показани</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="p-2.5 font-semibold text-slate-600 text-xs">Клиент</th>
              <th className="p-2.5 font-semibold text-slate-600 text-xs">Релация</th>
              <th className="p-2.5 font-semibold text-slate-600 text-xs">Дати</th>
            </tr>
          </thead>
          <tbody>
            {past.map((s, i) => (
              <tr
                key={(s.id ? String(s.id) : `${s.company}-${s.route}-${s.date}-${s.unloadDate}-${s.driver}`) + `#${i}`}
                className="border-b hover:bg-slate-50 text-sm"
              >
                <td className="p-2.5 font-medium text-slate-800">{s.company || "—"}</td>
                <td className="p-2.5 text-slate-600">{s.route || "—"}</td>
                <td className="p-2.5 text-slate-600 whitespace-nowrap">
                  {(s.date || "—")} – {(s.unloadDate || "—")}
                </td>
              </tr>
            ))}
            {!past.length && (
              <tr>
                <td colSpan={3} className="text-center text-slate-400 py-6">Няма записи.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-right">
        <a
          href="#"
          className="text-xs text-slate-600 underline"
          onClick={(e) => {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("app:navigate", { detail: { tab: "schedule" } }));
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("schedule:open-history"));
            }, 0);
          }}
        >
          Виж всички в „График → История“
        </a>
      </div>
    </div>
  );
};


export default function DashboardTab() {
  // Данни
  const [drivers,   setDrivers]   = useLocalStorage("drivers",   []);
  const [trucks,    setTrucks]    = useLocalStorage("trucks",    []); // {adrExpiry}
  const [tankers,   setTankers]   = useLocalStorage("tankers",   []);
  const [schedules, setSchedules] = useLocalStorage("schedules", []);
  const [archived]                = useLocalStorage("schedules_archived", []); // ⬅ ново: за Историята
  const [companies, setCompanies] = useLocalStorage("clients",   []);
  const [routes,    setRoutes]    = useLocalStorage("routes",    []);

  // Модали
  const [modals, setModals] = useState({
    schedule: { open: false, value: null },
    driver:   { open: false, value: null },
    truck:    { open: false, value: null },
    company:  { open: false, value: null },
    route:    { open: false, value: null },
  });
  const openM  = (k, value=null) => setModals((m)=>({ ...m, [k]: { open: true,  value } }));
  const closeM = (k)             => setModals((m)=>({ ...m, [k]: { open: false, value: null } }));

  // „Бързо добавяне“ — приеми detail.type ИЛИ detail.kind
  useEffect(() => {
    const onQuick = (e) => {
      const t = e.detail?.type || e.detail?.kind;
      if (!t) return;
      if (t === "schedule") openM("schedule");
      if (t === "driver")   openM("driver");
      if (t === "truck")    openM("truck");
      if (t === "route")    openM("route");
      if (t === "company")  openM("company");
    };
    window.addEventListener("quick-add", onQuick);
    return () => window.removeEventListener("quick-add", onQuick);
  }, []);

  // Upsert помощници
  const upsert = (setArr) => (item) =>
    setArr(prev => {
      if (item.id && prev.some(x=>x.id===item.id)) return prev.map(x=>x.id===item.id?{...x,...item}:x);
      return [{ id: `${Date.now()}${Math.random().toString(36).slice(2)}`, ...item }, ...prev];
    });
  const upsertSchedule = upsert(setSchedules);
  const upsertDriver   = upsert(setDrivers);
  const upsertTruck    = upsert(setTrucks);
  const upsertCompany  = upsert(setCompanies);
  const upsertRoute    = upsert(setRoutes);

  // Дата
  const today = new Date(); today.setHours(0,0,0,0);

  // Метрики
  const getDriverStatus = (driverName) =>
    schedules.some((s) => {
      if (s.driver !== driverName) return false;
      const st = parseBGDate(s.date || s.startDate), en = parseBGDate(s.unloadDate || s.endDate);
      return st && en && today >= st && today <= en;
    }) ? "busy" : "free";

  const busyDrivers = useMemo(()=> drivers.filter(d=>getDriverStatus(d.name)==="busy").length, [drivers, schedules]);

  const activeTrips = useMemo(()=> schedules.filter(s=>s.status==="В процес"), [schedules]);

  const upcomingLimit = useMemo(()=>{ const d=new Date(today); d.setDate(d.getDate()+7); return d; },[today]);
  const upcomingTrips = useMemo(()=> schedules
    .filter(s=>{ const st=parseBGDate(s.date || s.startDate); return s.status==="Планирано" && st && st>=today && st<=upcomingLimit; })
    .sort((a,b)=>parseBGDate(a.date || a.startDate)-parseBGDate(b.date || b.startDate))
  , [schedules, today, upcomingLimit]);

  // Изтичащи документи (компактно, за панела вдясно)
  const expiringDocs = useMemo(() => {
    const out = [];
    // Шофьори
    drivers.forEach((d) => {
      const card = checkExpiry(d.driverCardExpiry);
      if (card.status !== "valid" && card.status !== "N/A")
        out.push({ type: "Шофьорска карта", name: d.name, date: d.driverCardExpiry, days: card.days, status: card.status });

      const adr = checkExpiry(d.adrExpiry);
      if (adr.status !== "valid" && adr.status !== "N/A")
        out.push({ type: "ADR (шофьор)", name: d.name, date: d.adrExpiry, days: adr.days, status: adr.status });
    });
    // Влекачи
    trucks.forEach((t) => {
      const ins = checkExpiry(t.insuranceExpiry || t.goExpiry);
      if (ins.status !== "valid" && ins.status !== "N/A")
        out.push({ type: "ГО (влекач)", name: t.number, date: t.insuranceExpiry || t.goExpiry, days: ins.days, status: ins.status });

      const adr = checkExpiry(t.adrExpiry);
      if (adr.status !== "valid" && adr.status !== "N/A")
        out.push({ type: "ADR (влекач)", name: t.number, date: t.adrExpiry, days: adr.days, status: adr.status });

      const insp = checkExpiry(t.inspectionExpiry || t.techExpiry);
      if (insp.status !== "valid" && insp.status !== "N/A")
        out.push({ type: "Преглед (влекач)", name: t.number, date: t.inspectionExpiry || t.techExpiry, days: insp.days, status: insp.status });
    });
    // Цистерни
    tankers.forEach((t) => {
      const ins = checkExpiry(t.insuranceExpiry || t.goExpiry);
      if (ins.status !== "valid" && ins.status !== "N/A")
        out.push({ type: "ГО (цистерна)", name: t.number, date: t.insuranceExpiry || t.goExpiry, days: ins.days, status: ins.status });

      const adr = checkExpiry(t.adrExpiry);
      if (adr.status !== "valid" && adr.status !== "N/A")
        out.push({ type: "ADR (цистерна)", name: t.number, date: t.adrExpiry, days: adr.days, status: adr.status });

      const insp = checkExpiry(t.inspectionExpiry || t.techExpiry);
      if (insp.status !== "valid" && insp.status !== "N/A")
        out.push({ type: "Преглед (цистерна)", name: t.number, date: t.inspectionExpiry || t.techExpiry, days: insp.days, status: insp.status });
    });

    out.sort((a, b) => a.days - b.days);
    return out;
  }, [drivers, trucks, tankers]);

  const expiringCount = expiringDocs.length;

  return (
    <>
      {/* ГОРНА ЛЕНТА: три компактни KPI чипа */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <StatChip label="Изтичащи документи" value={expiringCount} tone={expiringCount ? "warn" : "default"} />
        <StatChip label="Активни курсове" value={activeTrips.length} tone={activeTrips.length ? "ok" : "default"} />
        <StatChip label="Планирани (7 дни)" value={upcomingTrips.length} />
        <div className="ml-auto">
          <button
            className="btn btn-ghost text-sm"
            onClick={() => exportSchedules(schedules)}
            title="Експорт график (Excel)"
          >
            ⇩ Експорт (Excel)
          </button>
        </div>
      </div>

      {/* ДВЕ КОЛОНИ: ляво списъци, дясно нотификации + история */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Лява колона (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Активни */}
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <Dot color="bg-emerald-500" /><h3 className="text-lg font-bold mb-0">Активни ({activeTrips.length})</h3>
            </div>
            <TripsTable trips={activeTrips} drivers={drivers}/>
          </div>

          {/* Предстоящи */}
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <Dot color="bg-indigo-500" /><h3 className="text-lg font-bold mb-0">Планирани (7 дни) ({upcomingTrips.length})</h3>
            </div>
            <TripsTable trips={upcomingTrips} drivers={drivers}/>
          </div>
        </div>

        {/* Дясна колона (1/3) — нотификации + история */}
        <div className="space-y-6">
          {/* Нотификации */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold mb-0">Нотификации</h3>
              <span className="text-xs text-slate-500">{expiringCount} изтичащи</span>
            </div>
            <div className="max-h-[420px] overflow-auto pr-1">
              {!expiringDocs.length && <p className="text-slate-500">Няма изтичащи документи в следващите 30 дни.</p>}
              <ul className="divide-y">
                {expiringDocs.map((doc, i) => (
                  <li key={`${doc.type}-${doc.name}-${doc.date}-${i}`} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{doc.type} — {doc.name}</p>
                        <p className="text-xs text-slate-600">До: {doc.date || "?"}</p>
                      </div>
                      <span className={`text-xs font-bold ${doc.status==="expired" ? "text-red-600" : "text-amber-700"}`}>
                        {doc.status==="expired" ? `-${Math.abs(doc.days)} д.` : `${doc.days} д.`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* История (последни 5) — с архив */}
          <PastTripsCard activeSchedules={schedules} archivedSchedules={archived} />
        </div>
      </div>

      {/* Модали */}
      <EditScheduleModal
        open={modals.schedule.open}
        value={modals.schedule.value}
        onClose={()=>closeM("schedule")}
        onSave={(data)=>{ upsertSchedule(data); closeM("schedule"); }}
        onDelete={(id)=>{ setSchedules(prev=>prev.filter(x=>x.id!==id)); closeM("schedule"); }}
        drivers={drivers}
        companies={companies}
        routes={routes}
        allSchedules={schedules}
      />
      <EditDriverModal open={modals.driver.open} value={modals.driver.value} onClose={()=>closeM("driver")} onSave={(data)=>{ upsertDriver(data); closeM("driver"); }} />
      <EditTruckModal  open={modals.truck.open}  value={modals.truck.value}  onClose={()=>closeM("truck")}  onSave={(data)=>{ upsertTruck(data);  closeM("truck");  }} />
      <RouteModal      open={modals.route.open}  value={modals.route.value}  onClose={()=>closeM("route")}  onSave={(data)=>{ upsertRoute(data);  closeM("route");  }} onDelete={(id)=>{ setRoutes(prev=>prev.filter(x=>x.id!==id)); closeM("route"); }} />
      <CompanyModal    open={modals.company.open}value={modals.company.value}onClose={()=>closeM("company")}onSave={(data)=>{ upsertCompany(data);closeM("company");}} onDelete={(id)=>{ setCompanies(prev=>prev.filter(x=>x.id!==id)); closeM("company"); }} />
    </>
  );
}
