// src/features/schedule/EditScheduleModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import Modal from "../../shared/components/Modal.jsx";
import { useSchedules } from "./schedule.store.jsx";
import { useLocalStorage } from "../../shared/hooks/useLocalStorage";
import { toInputDate, fromInputDate } from "../../shared/utils/dates.jsx";
import { nextKmdForDate } from "../../shared/utils/kmd.js";

// безопасно BG -> ISO за <input type="date">
const safeToInput = (bg) => (bg && typeof bg === "string" ? toInputDate(bg) : "");

// клипборд helper
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text || "";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
};

export default function EditScheduleModal({
  open,
  onClose,
  value = null, // null => „Нов товар”
}) {
  const S = useSchedules();
  if (!S) return null;

  const { add, update, remove, getNextKmd } = S;

  // справочници за autocomplete
  const [drivers] = useLocalStorage("drivers", []);
  const [clients] = useLocalStorage("clients", []);
  const [routes]  = useLocalStorage("routes", []);

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

  // запазване
  const handleSave = () => {
    if (!company.trim() || !route.trim()) return;

    const payload = {
      id: id || undefined,
      company: company.trim(),
      route: route.trim(),
      driver: (driver || "").trim(),
      leg,
      date: dateISO ? fromInputDate(dateISO) : "",
      unloadDate: unloadISO ? fromInputDate(unloadISO) : "",
      komandirovka: (komandirovka || "").trim(),
      notes: (notes || "").trim(),
    };

    if (isEdit) {
      update(id, payload);
    } else {
      add(payload);
    }
    onClose?.();
  };

  // изтриване
  const handleDelete = () => {
    if (!isEdit) return;
    remove(id);
    onClose?.();
  };

  // дублиране: релация+дати; без шофьор, № и бележки
  const handleDuplicate = () => {
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
    };
    add(payload);
  };

  // копиране на товар
  const handleCopy = async () => {
    const txt = [
      `Клиент: ${company || "—"}`,
      `Релация: ${route || "—"}`,
      `Шофьор: ${driver || "—"}`,
      `Дати: ${value?.date || (dateISO ? fromInputDate(dateISO) : "—")} – ${value?.unloadDate || (unloadISO ? fromInputDate(unloadISO) : "—")}`,
      `№: ${komandirovka || "—"}`,
      `Бележки: ${notes || "—"}`
    ].join(" | ");
    await copyText(txt);
  };

  // следващ командировъчен № (годишен брояч)
  const handleNextKmd = () => {
    const dateStr = dateISO ? fromInputDate(dateISO) : ""; // BG dd.mm.yyyy
    if (getNextKmd) {
      // ако store поддържа брояча – ползвай него
      const next = getNextKmd({ dateStr, commit: true });
      setKmd(next);
    } else {
      // иначе – локалният годишен брояч
      const next = nextKmdForDate(dateStr);
      setKmd(next);
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
            <button type="button" className="btn btn-ghost" onClick={handleNextKmd}>Следв. №</button>
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
