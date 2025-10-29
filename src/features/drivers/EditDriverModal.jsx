// src/features/drivers/EditDriverModal.jsx
import React from "react";
import Modal from "../../shared/components/Modal.jsx";
import { toInputDate, fromInputDate } from "../../shared/utils/dates";
import { useSettings } from "@/features/settings/settings.store.jsx";
import { useTehnika } from "@/features/tehnika/tehnika.store.jsx";
import { useDrivers } from "./drivers.store.jsx";

export default function EditDriverModal({ open, onClose, value, onSave }) {
  const isEdit = !!value?.id;
  const { subcontractors = [] } = useSettings() || {};
  const { trucks = [], tankers = [] } = useTehnika() || {};
  const D = useDrivers();

  // показваме празно, ако company е "SG" (вътрешен) → store ще нормализира празното към "SG"
  const defaultCompany = value?.company && value.company !== "SG" ? value.company : "";

  const handleSubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    onSave?.({
      id: value?.id,
      name: f.name.value.trim(),
      company: f.company.value.trim(), // "" => SG (нормализацията е в drivers.store)
      tractor: f.tractor.value.trim(),
      tanker: f.tanker.value.trim(),
      contact: f.contact.value.trim(),
      egn: f.egn.value.trim(),
      driverCardExpiry: f.card.value ? fromInputDate(f.card.value) : "",
      adrExpiry: f.adr.value ? fromInputDate(f.adr.value) : "",
    });
  };

  const handleDelete = async () => {
    if (!isEdit || !value?.id) return;
    const ok = window.confirm(`Сигурни ли сте, че искате да изтриете шофьор: "${value?.name}"?`);
    if (!ok) return;
    try {
      await D.remove(value.id);
      onClose?.();
    } catch (err) {
      console.error("[Drivers] delete failed:", err);
      alert("Изтриването не беше успешно. Виж console за подробности.");
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">{isEdit ? "Редакция на шофьор" : "Нов шофьор"}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <input
            name="name"
            className="input"
            placeholder="Име и фамилия"
            defaultValue={value?.name || ""}
            required
          />

          <select
            name="company"
            className="input"
            defaultValue={defaultCompany}
            title="Фирма (за подизпълнител) — празно = SG"
          >
            <option value="">— без фирма (SG) —</option>
            {subcontractors.map((c) => (
              <option key={c.id || c.name} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            name="tractor"
            className="input"
            defaultValue={value?.tractor || ""}
            title="Влекач"
          >
            <option value="">—</option>
            {trucks.map((t) => (
              <option key={t.id || t.number} value={t.number}>{t.number}</option>
            ))}
          </select>

          <select
            name="tanker"
            className="input"
            defaultValue={value?.tanker || ""}
            title="Цистерна"
          >
            <option value="">—</option>
            {tankers.map((t) => (
              <option key={t.id || t.number} value={t.number}>{t.number}</option>
            ))}
          </select>

          <div>
            <label className="text-xs text-slate-500">Телефон</label>
            <input
              name="contact"
              className="input"
              placeholder="напр. +359 88 123 4567"
              defaultValue={value?.contact || value?.phone || ""}
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">ЕГН</label>
            <input
              name="egn"
              className="input"
              placeholder="напр. 7007300743"
              defaultValue={value?.egn || ""}
            />
          </div>
        </div>

        {/* Документи */}
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">Шофьорска карта валидна до</label>
            <input
              type="date"
              name="card"
              className="input"
              defaultValue={toInputDate(value?.driverCardExpiry || "")}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">ADR валидно до</label>
            <input
              type="date"
              name="adr"
              className="input"
              defaultValue={toInputDate(value?.adrExpiry || "")}
            />
          </div>
        </div>

        <div className="flex justify-between items-center gap-2 pt-2">
          <div className="flex gap-2">
            {isEdit && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Изтрий
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Отказ
            </button>
            <button type="submit" className="btn btn-primary">
              {isEdit ? "Запази" : "Добави"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
