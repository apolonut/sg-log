import React from "react";
import Modal from "../../shared/components/Modal.jsx";
import { toInputDate, fromInputDate } from "../../shared/utils/dates";
import { useLocalStorage } from "../../shared/hooks/useLocalStorage";

export default function EditDriverModal({ open, onClose, value, onSave }) {
  const isEdit = !!value?.id;
  const [subcontractors] = useLocalStorage("subcontractors", []);
  const [trucks] = useLocalStorage("trucks", []);
  const [tankers] = useLocalStorage("tankers", []);

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">{isEdit ? "Редакция на шофьор" : "Нов шофьор"}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = e.target;
          onSave({
            id: value?.id,
            name: f.name.value.trim(),
            company: f.company.value.trim(),
            tractor: f.tractor.value.trim(),
            tanker: f.tanker.value.trim(),
            contact: f.contact.value.trim(), // телефон
            egn: f.egn.value.trim(),         // ЕГН
            driverCardExpiry: f.card.value ? fromInputDate(f.card.value) : "",
            adrExpiry: f.adr.value ? fromInputDate(f.adr.value) : "",
          });
        }}
        className="space-y-4"
      >
        <div className="grid md:grid-cols-2 gap-3">
          <input name="name" className="input" placeholder="Име и фамилия" defaultValue={value?.name || ""} required />

          <select name="company" className="input" defaultValue={value?.company || ""} title="Фирма (за подизпълнител)">
            <option value="">— без фирма (SG) —</option>
            {subcontractors.map((c) => (
              <option key={c.id || c.name} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select name="tractor" className="input" defaultValue={value?.tractor || ""} title="Влекач">
            <option value="">—</option>
            {trucks.map((t) => <option key={t.id || t.number} value={t.number}>{t.number}</option>)}
          </select>

          <select name="tanker" className="input" defaultValue={value?.tanker || ""} title="Цистерна">
            <option value="">—</option>
            {tankers.map((t) => <option key={t.id || t.number} value={t.number}>{t.number}</option>)}
          </select>

          <div>
            <label className="text-xs text-slate-500">Телефон</label>
            <input name="contact" className="input" placeholder="напр. +359 88 123 4567" defaultValue={value?.contact || ""} />
          </div>

          <div>
            <label className="text-xs text-slate-500">ЕГН</label>
            <input name="egn" className="input" placeholder="напр. 7007300743" defaultValue={value?.egn || ""} />
          </div>
        </div>

        {/* Документи */}
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">Шофьорска карта валидна до</label>
            <input type="date" name="card" className="input" defaultValue={toInputDate(value?.driverCardExpiry || "")} />
          </div>
          <div>
            <label className="text-xs text-slate-500">ADR валидно до</label>
            <input type="date" name="adr" className="input" defaultValue={toInputDate(value?.adrExpiry || "")} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Отказ</button>
          <button type="submit" className="btn btn-primary">{isEdit ? "Запази" : "Добави"}</button>
        </div>
      </form>
    </Modal>
  );
}
