// src/features/schedule/QuickAddRelation.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "../../shared/hooks/useLocalStorage";
import { useSchedules } from "./schedule.store.jsx";
import { toInputDate, toBG } from "../../shared/utils/dates.jsx";
import { colorForDriver, colorForClient } from "./schedule.colors.js";
import { nextKmdForDate } from "../../shared/utils/kmd.js";

// ==== малки утилити ====
const todayISO = () => toInputDate(new Date());
const addDaysISO = (iso, n) => {
  const d = iso ? new Date(iso) : new Date();
  d.setDate(d.getDate() + Number(n || 0));
  return toInputDate(d);
};
const classInput = "input h-9 px-3";

// Елементарен autocomplete dropdown (typeahead)
function AutoComplete({
  value,
  onChange,
  options,
  placeholder,
  getLabel = (x) => x,
  getValue = (x) => x,
  name,
  style,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || "");
  useEffect(() => { setQ(value || ""); }, [value]);

  const filtered = useMemo(() => {
    const s = String(q || "").toLowerCase();
    return (options || [])
      .map((o) => ({ raw: o, label: String(getLabel(o) ?? ""), val: getValue(o) ?? getLabel(o) }))
      .filter((o) => o.label.toLowerCase().includes(s))
      .slice(0, 8);
  }, [q, options, getLabel, getValue]);

  return (
    <div className="relative" style={style}>
      <input
        name={name}
        className={classInput}
        placeholder={placeholder}
        value={q}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => { const v = e.target.value; setQ(v); onChange && onChange(v); }}
        autoComplete="off"
      />
      {open && !!filtered.length && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-sm max-h-56 overflow-auto">
          {filtered.map((o, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setQ(o.label); onChange && onChange(o.val || o.label); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuickAddRelation() {
  // store (ако провайдърът липсва, падаме към localStorage)
  const S = useSchedules();

  // данни
  const [drivers] = useLocalStorage("drivers", []);
  const [clients] = useLocalStorage("clients", []);
  const [routes]  = useLocalStorage("routes", []);
  const [schedules, setSchedules] = useLocalStorage("schedules", []);

  // форма: ПРАВ
  const [driver, setDriver] = useState("");
  const [client, setClient] = useState("");
  const [route, setRoute]   = useState("");
  const [start, setStart]   = useState(todayISO());
  const [end, setEnd]       = useState(addDaysISO(todayISO(), 1));
  const [notes, setNotes]   = useState("");
  const [komDir, setKomDir] = useState("");

  // форма: ОБРАТЕН
  const [showReverse, setShowReverse] = useState(false);
  const [routeR, setRouteR] = useState("");
  const [startR, setStartR] = useState(addDaysISO(todayISO(), 1));
  const [endR, setEndR]     = useState(addDaysISO(todayISO(), 2));
  const [notesR, setNotesR] = useState("");

  // помощ: търсене на duration за релация
  const findRoute = (name) =>
    (routes || []).find(
      (r) => (String(r.name || r.route || "").toLowerCase() === String(name || "").toLowerCase())
    );

  const suggestEndByRoute = (routeName, startISO) => {
    const r = findRoute(routeName);
    if (!r || !r.duration) return addDaysISO(startISO, 1);
    return addDaysISO(startISO, Number(r.duration));
  };

  // при смяна на релация → предложи край
  useEffect(() => { if (route  && start)  setEnd (suggestEndByRoute(route,  start));  }, [route,  start]);
  useEffect(() => { if (routeR && startR) setEndR(suggestEndByRoute(routeR, startR)); }, [routeR, startR]);

  // КМД – следващ по ГОДИНА (на база стартова дата)
  const handleNextKmd = () => {
    if (!start) return;
    const bg = toBG(new Date(start));    // dd.mm.yyyy
    setKomDir(nextKmdForDate(bg));       // напр. "223/17.09"
  };

  // създаване (fallback към localStorage ако няма store.add)
  const upsertLocal = (obj) =>
    setSchedules((prev) => [{ id: `${Date.now()}${Math.random().toString(36).slice(2)}`, ...obj }, ...prev]);

  const addOne = (obj) => (S?.add ? S.add(obj) : upsertLocal(obj));

  const resetForm = () => {
    setDriver(""); setClient(""); setRoute("");
    setStart(todayISO()); setEnd(addDaysISO(todayISO(), 1));
    setNotes(""); setKomDir("");
    setShowReverse(false); setRouteR(""); setStartR(addDaysISO(todayISO(), 1)); setEndR(addDaysISO(todayISO(), 2)); setNotesR("");
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!driver || !client || !route || !start || !end) return;

    const driverCompany = (drivers.find((d) => d.name === driver)?.company) || "";

    // ПРАВ
    addOne({
      driver,
      driverCompany,
      company: client,
      route,
      date: toBG(new Date(start)),
      unloadDate: toBG(new Date(end)),
      notes,
      komandirovka: komDir || "",
      status: "Планирано",
      leg: "Прав",
    });

    // ОБРАТЕН (ако е активиран)
    if (showReverse && routeR && startR && endR) {
      addOne({
        driver,
        driverCompany,
        company: client,
        route: routeR,
        date: toBG(new Date(startR)),
        unloadDate: toBG(new Date(endR)),
        notes: notesR,
        komandirovka: "",
        status: "Планирано",
        leg: "Обратен",
      });
    }

    resetForm();
  };

  // списъци за autocomplete
  const driverNames = useMemo(
    () => (drivers || []).map((d) => d.name).filter(Boolean).sort((a, b) => a.localeCompare(b, "bg")),
    [drivers]
  );
  const clientNames = useMemo(
    () => (clients || []).map((c) => c.name || c.company || c.client || "").filter(Boolean).sort((a, b) => a.localeCompare(b, "bg")),
    [clients]
  );
  const routeNames = useMemo(
    () => (routes || []).map((r) => r.name || r.route || "").filter(Boolean).sort((a, b) => a.localeCompare(b, "bg")),
    [routes]
  );

  // цветни индикатори (тънка рамка на полетата)
  const drvColor = colorForDriver(driver);
  const cliColor = colorForClient(client);

  return (
    <div className="w-full">
      <form onSubmit={handleAdd}>
        {/* Ред 1: Прав + действия — хоризонтално, компактно */}
        <div className="grid grid-cols-12 gap-2 items-center">
          {/* Шофьор */}
          <div className="col-span-12 md:col-span-3 min-w-[220px]">
            <label className="text-[11px] uppercase tracking-wide text-slate-500">Шофьор</label>
            <div className="mt-1" style={{ borderColor: drvColor }}>
              <AutoComplete
                name="driver"
                value={driver}
                onChange={setDriver}
                options={driverNames}
                placeholder="Започни да пишеш име…"
              />
            </div>
          </div>

          {/* Клиент */}
          <div className="col-span-12 md:col-span-3 min-w-[220px]">
            <label className="text-[11px] uppercase tracking-wide text-slate-500">Клиент</label>
            <div className="mt-1" style={{ borderColor: cliColor }}>
              <AutoComplete
                name="client"
                value={client}
                onChange={setClient}
                options={clientNames}
                placeholder="Клиент…"
              />
            </div>
          </div>

          {/* Релация */}
          <div className="col-span-12 md:col-span-3 min-w-[220px]">
            <label className="text-[11px] uppercase tracking-wide text-slate-500">Релация (Прав)</label>
            <div className="mt-1">
              <AutoComplete
                name="route"
                value={route}
                onChange={setRoute}
                options={routeNames}
                placeholder="Релация…"
              />
            </div>
          </div>

          {/* Дати */}
<div className="col-span-12 md:col-span-3 flex gap-3 items-end">
  <div className="flex-1">
    <label className="text-[11px] uppercase tracking-wide text-slate-500">Начало</label>
    <input
      type="date"
      className={classInput + " mt-1 w-full"}
      value={start}
      onChange={(e) => setStart(e.target.value)}
    />
  </div>
  <div className="flex-1">
    <label className="text-[11px] uppercase tracking-wide text-slate-500">Край</label>
    <input
      type="date"
      className={classInput + " mt-1 w-full"}
      value={end}
      onChange={(e) => setEnd(e.target.value)}
    />
  </div>
</div>


          {/* Бележки + КМД */}
          <div className="col-span-12 grid grid-cols-12 gap-2 items-center mt-2">
            <div className="col-span-12 md:col-span-6">
              <input
                className={classInput}
                placeholder="Бележки (по желание)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="col-span-12 md:col-span-3 flex gap-2">
              <input
                className={classInput + " flex-1"}
                placeholder="Командировъчен № (по желание)"
                value={komDir}
                onChange={(e) => setKomDir(e.target.value)}
              />
              <button type="button" className="btn btn-ghost h-9 whitespace-nowrap" onClick={handleNextKmd}>
                Вземи следващ №
              </button>
            </div>

            <div className="col-span-12 md:col-span-3 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost h-9"
                onClick={() => { setShowReverse(true); setStartR(end); }}
              >
                Добави обратен
              </button>
              <button type="submit" className="btn btn-primary h-9">+ Добави</button>
            </div>
          </div>
        </div>

        {/* Ред 2: ОБРАТЕН */}
        {showReverse && (
          <div className="mt-3 grid grid-cols-12 gap-2 items-center border-t pt-3">
            <div className="col-span-12 md:col-span-3 min-w-[220px]">
              <label className="text-[11px] uppercase tracking-wide text-slate-500">Релация (Обратен)</label>
              <AutoComplete
                name="routeR"
                value={routeR}
                onChange={setRouteR}
                options={routeNames}
                placeholder="Релация (обратен)…"
              />
            </div>
            <div className="col-span-6 md:col-span-2">
              <label className="text-[11px] uppercase tracking-wide text-slate-500">Начало</label>
              <input type="date" className={classInput + " mt-1"} value={startR} onChange={(e) => setStartR(e.target.value)} />
            </div>
            <div className="col-span-6 md:col-span-2">
              <label className="text-[11px] uppercase tracking-wide text-slate-500">Край</label>
              <input type="date" className={classInput + " mt-1"} value={endR} onChange={(e) => setEndR(e.target.value)} />
            </div>
            <div className="col-span-12 md:col-span-5">
              <label className="text-[11px] uppercase tracking-wide text-slate-500">Бележки (обратен)</label>
              <input className={classInput + " mt-1"} value={notesR} onChange={(e) => setNotesR(e.target.value)} placeholder="Бележки (по желание)" />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
