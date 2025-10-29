// src/features/schedule/ScheduleTab.jsx
import React, { useMemo, useState } from "react";
import { SchedulesProvider, useSchedules } from "./schedule.store.jsx";
import ScheduleListView from "./ScheduleListView.jsx";
import ScheduleTimeline from "./ScheduleTimeline.jsx";
import QuickAddRelation from "./QuickAddRelation.jsx";
import EditScheduleModal from "./EditScheduleModal.jsx";
import Modal from "@/shared/components/Modal.jsx";
import { parseBGDate } from "@/shared/utils/dates.jsx";

// Малки вътрешни табове
function InnerTabs({ active, onChange }) {
  const itemCls = (k) =>
    `px-3 py-1.5 text-sm rounded-md cursor-pointer ${
      active === k
        ? "bg-slate-900 text-white"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
    }`;
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={itemCls("list")} onClick={() => onChange("list")}>
        Списък
      </button>
      <button type="button" className={itemCls("calendar")} onClick={() => onChange("calendar")}>
        Календар
      </button>
    </div>
  );
}

// История (модал) — показва минали товари от АКТИВНИЯ списък + възможност за „Архивирай“
function HistoryModal({ open, onClose, onEdit }) {
  const { getPastSlice, getPastCount, copyToClipboard, archiveById } = useSchedules();
  const [limit, setLimit] = useState(20);

  const items = useMemo(() => getPastSlice(limit, 0), [getPastSlice, limit]);
  const total = getPastCount();

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold">История на товари</h2>
        <span className="text-sm text-slate-500">Общо минали: <b>{total}</b></span>
      </div>

      <div className="card overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr className="bg-slate-50 text-sm">
              <th className="p-2.5 text-left">Дата</th>
              <th className="p-2.5 text-left">Разтоварване</th>
              <th className="p-2.5 text-left">Клиент</th>
              <th className="p-2.5 text-left">Релация</th>
              <th className="p-2.5 text-left">Шофьор</th>
              <th className="p-2.5 text-left">№</th>
              <th className="p-2.5 text-left">Бележки</th>
              <th className="p-2.5 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t hover:bg-slate-50">
                <td className="p-2.5 text-sm whitespace-nowrap">{s.date || "—"}</td>
                <td className="p-2.5 text-sm whitespace-nowrap">{s.unloadDate || "—"}</td>
                <td className="p-2.5 text-sm">{s.company || "—"}</td>
                <td className="p-2.5 text-sm">{s.route || "—"}</td>
                <td className="p-2.5 text-sm whitespace-nowrap">{s.driver || "—"}</td>
                <td className="p-2.5 text-sm whitespace-nowrap">{s.komandirovka || "—"}</td>
                <td className="p-2.5 text-sm truncate max-w-[20rem]">{s.notes || "—"}</td>
                <td className="p-2.5 text-right text-sm">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded hover:bg-slate-100 text-slate-600"
                      onClick={() => copyToClipboard(s)}
                      title="Копирай"
                    >
                      Копирай
                    </button>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded hover:bg-slate-100 text-slate-600"
                      onClick={() => onEdit?.(s)}
                      title="Редакция"
                    >
                      Редакция
                    </button>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded hover:bg-slate-100 text-slate-600"
                      onClick={() => archiveById(s.id)}
                      title="Прибери в архив"
                    >
                      Архивирай
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={8} className="text-center text-slate-400 py-6">
                  Няма минали товари.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-sm text-slate-500">
          Показани: <b>{items.length}</b> от <b>{total}</b>
        </div>
        <div className="flex gap-2">
          {items.length < total && (
            <button type="button" className="btn btn-ghost" onClick={() => setLimit((x) => x + 20)}>
              Зареди още
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Затвори
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Архив (модал) — показва прибраните товари + „Върни“
function ArchiveModal({ open, onClose }) {
  const { archived, copyToClipboard, unarchiveById } = useSchedules();
  const [limit, setLimit] = useState(30);

  const items = useMemo(() => (archived || []).slice(0, limit), [archived, limit]);
  const total = archived?.length || 0;

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold">Архивирани товари</h2>
        <span className="text-sm text-slate-500">Общо в архив: <b>{total}</b></span>
      </div>

      <div className="card overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr className="bg-slate-50 text-sm">
              <th className="p-2.5 text-left">Дата</th>
              <th className="p-2.5 text-left">Разтоварване</th>
              <th className="p-2.5 text-left">Клиент</th>
              <th className="p-2.5 text-left">Релация</th>
              <th className="p-2.5 text-left">Шофьор</th>
              <th className="p-2.5 text-left">№</th>
              <th className="p-2.5 text-left">Бележки</th>
              <th className="p-2.5 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t hover:bg-slate-50">
                <td className="p-2.5 text-sm whitespace-nowrap">{s.date || "—"}</td>
                <td className="p-2.5 text-sm whitespace-nowrap">{s.unloadDate || "—"}</td>
                <td className="p-2.5 text-sm">{s.company || "—"}</td>
                <td className="p-2.5 text-sm">{s.route || "—"}</td>
                <td className="p-2.5 text-sm whitespace-nowrap">{s.driver || "—"}</td>
                <td className="p-2.5 text-sm whitespace-nowrap">{s.komandirovka || "—"}</td>
                <td className="p-2.5 text-sm truncate max-w-[20rem]">{s.notes || "—"}</td>
                <td className="p-2.5 text-right text-sm">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded hover:bg-slate-100 text-slate-600"
                      onClick={() => copyToClipboard(s)}
                      title="Копирай"
                    >
                      Копирай
                    </button>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded hover:bg-slate-100 text-slate-600"
                      onClick={() => unarchiveById(s.id)}
                      title="Върни в активни"
                    >
                      Върни
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={8} className="text-center text-slate-400 py-6">
                  Архивът е празен.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-sm text-slate-500">
          Показани: <b>{items.length}</b> от <b>{total}</b>
        </div>
        <div className="flex gap-2">
          {items.length < total && (
            <button type="button" className="btn btn-ghost" onClick={() => setLimit((x) => x + 30)}>
              Зареди още
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Затвори
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Inner() {
  const { list, getPastCount, archived, archiveById, isArchived } = useSchedules();
  const [tab, setTab] = useState("list");       // "list" | "calendar"
  const [open, setOpen] = useState(false);      // модал за добавяне/редакция
  const [current, setCurrent] = useState(null); // текущ товар за редакция
  const [showHistory, setShowHistory] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  // Отвори модал: нов
  const onAdd = () => { setCurrent(null); setOpen(true); };
  // Отвори модал: редакция
  const onEdit = (schedule) => { setCurrent(schedule); setOpen(true); };

  const pastCount = getPastCount();
  const archivedCount = archived?.length || 0;

  // Локален „Авто архивирай“ — архивация на изпълнени товари по cutoffDays
  const archiveAuto = async ({ cutoffDays = 14 } = {}) => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - cutoffDays);

    const candidates = (list || []).filter((s) => {
      // Взимаме разтоварването; ако липсва — ползваме началната дата
      const end = parseBGDate(s.unloadDate || s.date);
      if (!end) return false;
      // Смятаме за „изпълнено“, ако е в миналото (cutoff) — status вече се изчислява в стора, но пазим логика тук
      const isOldEnough = end <= cutoff;
      return isOldEnough && !isArchived?.(s.id);
    });

    for (const c of candidates) {
      try {
        await archiveById(c.id);
      } catch (e) {
        console.error("[schedule] auto-archive error for", c.id, e);
      }
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* РЕД 1: БЪРЗ ТОВАР — винаги full width */}
      <div className="card p-3 md:p-4">
        <QuickAddRelation />
      </div>

      {/* РЕД 2: ТАБОВЕ + История/Архив + бързи действия */}
      <div className="flex items-center justify-between">
        <InnerTabs active={tab} onChange={setTab} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
            onClick={() => setShowHistory(true)}
            title="Минали товари"
          >
            История <span className="ml-1 inline-block text-xs px-1.5 py-0.5 rounded bg-slate-200">{pastCount}</span>
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
            onClick={() => setShowArchive(true)}
            title="Архивирани товари"
          >
            Архив <span className="ml-1 inline-block text-xs px-1.5 py-0.5 rounded bg-slate-200">{archivedCount}</span>
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => archiveAuto({ cutoffDays: 14 })}
            title="Прибери всички изпълнени над 14 дни"
          >
            Авто архивирай (14 дни)
          </button>
        </div>
      </div>

      {/* РЕД 3: СЪДЪРЖАНИЕ ПО ТАБ */}
      {tab === "calendar" ? (
        <div className="card">
          <ScheduleTimeline days={7} colorBy="driver" />
        </div>
      ) : (
        <ScheduleListView items={list} onEdit={onEdit} onAdd={onAdd} />
      )}

      {/* Модал за създаване/редакция */}
      <EditScheduleModal
        open={open}
        value={current}
        onClose={() => { setOpen(false); setCurrent(null); }}
      />

      {/* История (модал) */}
      <HistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onEdit={(s) => { setShowHistory(false); onEdit(s); }}
      />

      {/* Архив (модал) */}
      <ArchiveModal
        open={showArchive}
        onClose={() => setShowArchive(false)}
      />
    </div>
  );
}

export default function ScheduleTab() {
  return (
    <SchedulesProvider>
      <Inner />
    </SchedulesProvider>
  );
}
