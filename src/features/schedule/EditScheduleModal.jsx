// src/features/schedule/EditScheduleModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import Modal from "../../shared/components/Modal.jsx";
import { useSchedules } from "./schedule.store.jsx";
import { useDrivers } from "@/features/drivers/drivers.store.jsx";
import { useSettings } from "@/features/settings/settings.store.jsx";
import { useCounters } from "@/features/counters/counters.store.jsx";
import { toInputDate, fromInputDate, toBG } from "../../shared/utils/dates.jsx";

// безопасно BG -> ISO за <input type="date">
const safeToInput = (bg) => (bg && typeof bg === "string" ? toInputDate(bg) : "");

// клипборд helper
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text || "";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
};

// dd.MM.yyyy от Date (fallback за празна начална дата)
const todayBG = () => toBG(new Date());

export default function EditScheduleModal({
  open,
  onClose,
  value = null, // null => „Нов товар”
}) {
  const S = useSchedules();
  const C = useCounters();
  if (!S) return null;

  const { add, update, remove } = S;

  // справочници за autocomplete
  const { list: drivers } = useDrivers() || { list: [] };
  const { clients, routes } = useSettings() || { clients: [], routes: [] };

  const driverNames = useMemo(
    () => drivers.map(d => d.name).filter(Boolean).sort((a,b)=>a.localeCompare(b,"bg")),
    [drivers]
  );
  const clientNames = useMemo(
    () => clients.map(c => c.name || c.company || c.client).filter(Boolean).sort((a,b)=>a.localeCompare(b,"bg")),
    [clients]
  );
  const routeNames = useMemo(
    () => routes.map(r => r.name || r.route).filter(Boolean).sort((a,b)=>a.localeCompare(b,"bg")),
    [routes]
  );

  // локално състояние (hydrate при отваряне)
  const [id, setId]               = useState(null);
  const [company, setCompany]     = useState("");
  const [route, setRoute]         = useState("");
  const [driver, setDriver]       = useState("");
  const [leg, setLeg]             = useState("Прав"); // "Прав" | "Обратен"
  const [dateISO, setDateISO]     = useState("");     // yyyy-mm-dd
  const [unloadISO, setUnloadISO] = useState("");
  const [komandirovka, setKmd]    = useState("");
  const [notes, setNotes]         = useState("");

  useEffect(() => {
    if (!open) return;
    setId(value?.id || null);
    setCompany(value?.company || "");
    setRoute(value?.route || "");
    setDriver(value?.driver || "");
    setLeg(value?.leg || "Прав");
    setDateISO(safeToInput(value?.date || ""));
    setUnloadISO(safeToInput(value?.unloadDate || ""));
    setKmd(value?.komandirovka || "");
    setNotes(value?.notes || "");
  }, [open, value]);

  const isEdit = !!id;

  // запазване (с commit на КМД, ако липсва и е "Прав")
  const handleSave = async () => {
    if (!company.trim() || !route.trim()) return;

    // изчисляваме driverCompany
    const driverCompany = driver ? (drivers.find(d => d.name === driver)?.company || "") : "";

    // ако няма въведен № и е "Прав" → claim следващия (годишен) според началната дата (или днес)
    let kmd = (komandirovka || "").trim();
    if (!kmd && C?.getNextKmd && String(leg).trim() === "Прав") {
      const bgStr = dateISO ? fromInputDate(dateISO) : todayBG(); // dd.mm.yyyy
      try {
        kmd = (await C.getNextKmd({ dateStr: bgStr, leg: "Прав", commit: true })) || "";
      } catch (e) {
        console.error("KMD claim failed:", e);
      }
    }

    const payload = {
      id: id || undefined,
      company: company.trim(),
      route: route.trim(),
      driver: (driver || "").trim(),
      leg,
      date: dateISO ? fromInputDate(dateISO) : "",
      unloadDate: unloadISO ? fromInputDate(unloadISO) : "",
      komandirovka: kmd,
      notes: (notes || "").trim(),
      driverCompany,
    };

    try {
      if (isEdit) {
        await update(id, payload);
      } else {
        await add(payload);
      }
      onClose?.();
    } catch (e) {
      console.error("Save schedule failed:", e);
    }
  };

  // изтриване
  const handleDelete = async () => {
    if (!isEdit) return;
    try {
      await remove(id);
      onClose?.();
    } catch (e) {
      console.error("Delete schedule failed:", e);
    }
  };

  // дублиране: релация+дати; без шофьор, № и бележки
  const handleDuplicate = async () => {
    const payload = {
      company: (company || "").trim(),
      route: (route || "").trim(),
      driver: "",
      leg,
      date: dateISO ? fromInputDate(dateISO) : "",
      unloadDate: unloadISO ? fromInputDate(unloadISO) : "",
      komandirovka: "",
      notes: "",
      status: value?.status || "Планирано",
      driverCompany: "",
    };
    try {
      await add(payload);
    } catch (e) {
      console.error("Duplicate schedule failed:", e);
    }
  };

  // копиране на товар (за бутона "Копирай товар")
  const handleCopy = async () => {
    const txt = [
      `Клиент: ${company || "—"}`,
      `Релация: ${route || "—"}`,
      `Шофьор: ${driver || "—"}`,
      `Дати: ${
        value?.date || (dateISO ? fromInputDate(dateISO) : "—")
      } – ${
        value?.unloadDate || (unloadISO ? fromInputDate(unloadISO) : "—")
      }`,
      `№: ${komandirovka || "—"}`,
      `Бележки: ${notes || "—"}`
    ].join(" | ");
    await copyText(txt);
  };

  // „Следв. №“ — показва preview (без commit). Истинският commit става при Save, ако полето е празно.
  const [nextBusy, setNextBusy] = useState(false);
  const handleNextKmd = async () => {
    if (!C?.getNextKmd) return;
    if (String(leg).trim() !== "Прав") return; // само за „Прав“

    // ако няма начална дата → ползвай днешна
    const bgStr = dateISO ? fromInputDate(dateISO) : todayBG(); // dd.mm.yyyy

    setNextBusy(true);
    try {
      const preview = await C.getNextKmd({ dateStr: bgStr, leg: "Прав", commit: false });
      if (preview) setKmd(preview);
    } catch (e) {
      console.error("KMD preview failed:", e);
    } finally {
      setNextBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">{isEdit ? "Редакция на товар" : "Нов товар"}</h2>

      <div className="grid md:grid-cols-2 gap-3">
        {/* Клиент */}
        <div>
          <label className="text-xs text-slate-500">Клиент</label>
          <input
            className="input"
            list="clients_list_modal"
            placeholder="Започни да пишеш…"
            value={company}
            onChange={(e)=>setCompany(e.target.value)}
            required
          />
          <datalist id="clients_list_modal">
            {clientNames.map((n, i)=> <option key={`mc-${i}`} value={n} />)}
          </datalist>
        </div>

        {/* Релация */}
        <div>
          <label className="text-xs text-slate-500">Релация</label>
          <input
            className="input"
            list="routes_list_modal"
            placeholder="Пловдив → Бургас…"
            value={route}
            onChange={(e)=>setRoute(e.target.value)}
            required
          />
          <datalist id="routes_list_modal">
            {routeNames.map((n, i)=> <option key={`mr-${i}`} value={n} />)}
          </datalist>
        </div>

        {/* Шофьор */}
        <div>
          <label className="text-xs text-slate-500">Шофьор</label>
          <input
            className="input"
            list="drivers_list_modal"
            placeholder="Име на шофьор…"
            value={driver}
            onChange={(e)=>setDriver(e.target.value)}
          />
          <datalist id="drivers_list_modal">
            {driverNames.map((n, i)=> <option key={`md-${i}`} value={n} />)}
          </datalist>
        </div>

        {/* Вид */}
        <div>
          <label className="text-xs text-slate-500">Вид</label>
          <select className="input" value={leg} onChange={(e)=>setLeg(e.target.value)}>
            <option value="Прав">Прав</option>
            <option value="Обратен">Обратен</option>
          </select>
        </div>

        {/* Дати */}
        <div>
          <label className="text-xs text-slate-500">Начална дата</label>
          <input
            type="date"
            className="input"
            value={dateISO}
            onChange={(e)=>setDateISO(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-slate-500">Крайна дата</label>
          <input
            type="date"
            className="input"
            value={unloadISO}
            onChange={(e)=>setUnloadISO(e.target.value)}
          />
        </div>

        {/* КМД */}
        <div>
          <label className="text-xs text-slate-500">Командировъчен №</label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="напр. 222/17.09"
              value={komandirovka}
              onChange={(e)=>setKmd(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleNextKmd}
              title="Преглед на следващ № (без запис)"
              disabled={String(leg).trim() !== "Прав" || nextBusy}
            >
              {nextBusy ? "..." : "Следв. №"}
            </button>
          </div>
        </div>

        {/* Бележки */}
        <div>
          <label className="text-xs text-slate-500">Бележки</label>
          <input
            className="input"
            placeholder="Опционално…"
            value={notes}
            onChange={(e)=>setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2 mt-5">
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={handleCopy} title="Копирай детайлите в клипборда">
            Копирай товар
          </button>
          {isEdit && (
            <button type="button" className="btn btn-ghost" onClick={handleDuplicate} title="Създай копие (без шофьор)">
              Дублирай
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {isEdit && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              Изтрий
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            {isEdit ? "Запази" : "Добави"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Затвори
          </button>
        </div>
      </div>
    </Modal>
  );
}
