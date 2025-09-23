// src/features/settings/RouteModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/shared/components/Modal.jsx";
import { useSettings } from "./settings.store.jsx";

export default function RouteModal({
  open,
  onClose,
  value,
  onSave,
  onDelete,
  // по желание: ако модалът се ползва извън SettingsProvider, можеш да подадеш клиенти ръчно
  clientsOverride = null,
}) {
  const isEdit = !!value?.id;

  // ВАЖНО: безопасно взимане на контекста (може да липсва)
  let settings = null;
  try { settings = useSettings?.(); } catch { /* no provider - fine */ }

  // Клиентите идват по следния приоритет:
  // 1) clientsOverride проп, ако е подаден;
  // 2) от SettingsProvider (sorted.clients), ако има провайдър;
  // 3) иначе — празен масив (без да чупим)
  const clients = clientsOverride ?? settings?.sorted?.clients ?? [];

  // --- форма: текущи стойности ---
  const [name, setName] = useState("");
  const [distance, setDistance] = useState("");

  // Помощник: генериране на име „От → До“
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");

  // ново: свързани клиенти
  const [clientIds, setClientIds] = useState([]); // string[]

  const nameRef = useRef(null);

  // hydrate при отваряне
  useEffect(() => {
    if (!open) return;

    setName(value?.name || value?.fromTo || "");
    setDistance(value?.distance ?? value?.km ?? "");

    setFromCity("");
    setToCity("");

    setClientIds(Array.isArray(value?.clientIds) ? value.clientIds.filter(Boolean) : []);

    // autofocus
    setTimeout(() => nameRef.current?.focus(), 50);
  }, [open, value]);

  // валидации
  const nameError = useMemo(() => (!name.trim() ? "Въведи име." : ""), [name]);
  const kmError = useMemo(() => {
    if (distance === "" || distance === null || distance === undefined) return "";
    return /^\d+(\.\d+)?$/.test(String(distance)) ? "" : "Км трябва да е число.";
  }, [distance]);
  const canSave = !nameError && !kmError;

  // генериране
  const canGenerate = fromCity.trim() && toCity.trim();
  const generatedName = `${fromCity.trim()} → ${toCity.trim()}`;

  const selectedClientNames = useMemo(() => {
    if (!clientIds?.length) return [];
    const byId = new Map(clients.map((c) => [c.id, c]));
    return clientIds.map((id) => byId.get(id)?.name).filter(Boolean);
  }, [clientIds, clients]);

  // helpers за мултиселекта
  const toggleClient = (id) => {
    setClientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const clearClients = () => setClientIds([]);
  const selectAllClients = () => setClientIds(clients.map((c) => c.id));

  // запис
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSave) return;

    onSave?.({
      id: value?.id,
      name: name.trim(),
      distance: distance === "" ? "" : String(distance).trim(),
      clientIds: Array.isArray(clientIds) ? clientIds : [],
    });
  };

  // изтриване
  const handleDelete = () => {
    if (!isEdit) return;
    if (confirm("Сигурни ли сте, че искате да изтриете тази релация?")) {
      onDelete?.(value.id);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">{isEdit ? "Редакция на релация" : "Нова релация"}</h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-3"
        onKeyDown={(e) => { if (e.key === "Escape") onClose?.(); }}
      >
        {/* Ред 1: име + км */}
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">Име *</label>
            <input
              ref={nameRef}
              className={`input mt-1 ${nameError ? "border-red-300" : ""}`}
              placeholder="Пловдив → Бургас"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {nameError && <div className="text-xs text-red-600 mt-1">{nameError}</div>}
          </div>
          <div>
            <label className="text-xs text-slate-500">Км</label>
            <input
              className={`input mt-1 ${kmError ? "border-amber-300" : ""}`}
              placeholder="напр. 380"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              inputMode="decimal"
            />
            {kmError && <div className="text-xs text-amber-600 mt-1">{kmError}</div>}
          </div>
        </div>

        {/* Ред 2: Помощник за име */}
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500">От град</label>
            <input className="input mt-1" value={fromCity} onChange={(e) => setFromCity(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500">До град</label>
            <input className="input mt-1" value={toCity} onChange={(e) => setToCity(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="btn btn-ghost w-full"
              disabled={!canGenerate}
              onClick={() => setName(generatedName)}
              title="Попълни името по шаблон От → До"
            >
              Генерирай име
            </button>
          </div>
        </div>

        {/* Ред 3: Мултиселект клиенти */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-500">Свързани клиенти</label>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost h-8" onClick={clearClients}>Изчисти</button>
              <button type="button" className="btn btn-ghost h-8" onClick={selectAllClients} disabled={!clients.length}>
                Избери всички
              </button>
            </div>
          </div>

          {!!selectedClientNames.length && (
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedClientNames.map((n, i) => (
                <span key={`${n}-${i}`} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                  {n}
                </span>
              ))}
            </div>
          )}

          <div className="max-h-52 overflow-auto border rounded-md">
            {clients.length ? (
              <ul className="divide-y">
                {clients.map((c) => {
                  const checked = clientIds.includes(c.id);
                  return (
                    <li key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                      <input
                        id={`cli-${c.id}`}
                        type="checkbox"
                        className="checkbox"
                        checked={checked}
                        onChange={() => toggleClient(c.id)}
                      />
                      <label htmlFor={`cli-${c.id}`} className="text-sm text-slate-700 cursor-pointer">
                        {c.name}
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-3 py-2 text-sm text-slate-500">Няма клиенти. Добави от „Нова фирма“.</div>
            )}
          </div>
        </div>

        {/* Ред 4: бутони */}
        <div className="flex justify-between items-center gap-2 pt-2">
          <div>
            {isEdit && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Изтрий
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Отказ (Esc)
            </button>
            <button type="submit" className="btn btn-primary" disabled={!canSave}>
              {isEdit ? "Запази" : "Добави"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
