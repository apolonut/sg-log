// src/features/tehnika/EditTruckModal.jsx
import React, { useEffect, useState } from "react";
import Modal from "@/shared/components/Modal.jsx";
import { toInputDate, fromInputDate } from "@/shared/utils/dates";
import { useSettings } from "@/features/settings/settings.store.jsx"; // ⬅️ за списъка с фирми

export default function EditTruckModal({
  open,
  onClose,
  value,                 // { id?, number?, insuranceExpiry?, adrExpiry?, inspectionExpiry?, company? }
  onSave,
  onDelete,              // (id, type) => void
  type = "truck",        // "truck" | "tanker"
  isEdit: isEditProp,    // optional
}) {
  const isEdit = isEditProp ?? !!value?.id;
  const { subcontractors = [] } = useSettings() || {};

  const labels = type === "tanker"
    ? { new: "Нова цистерна", edit: "Редакция на цистерна" }
    : { new: "Нов влекач",    edit: "Редакция на влекач" };

  const [number, setNumber] = useState("");
  const [ins, setIns] = useState("");
  const [adr, setAdr] = useState("");
  const [inspection, setInspection] = useState("");
  const [company, setCompany] = useState(""); // "" => SG

  useEffect(() => {
    if (!open) return;
    setNumber(value?.number || "");
    setIns(toInputDate(value?.insuranceExpiry || ""));
    setAdr(toInputDate(value?.adrExpiry || ""));
    setInspection(toInputDate(value?.inspectionExpiry || ""));
    setCompany(value?.company && value.company !== "SG" ? value.company : "");
  }, [open, value?.id, type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      id: value?.id,
      type,
      number: (number || "").trim(),
      company: (company || "").trim(), // празно => SG (store нормализира)
      insuranceExpiry: ins ? fromInputDate(ins) : "",
      adrExpiry: adr ? fromInputDate(adr) : "",
      inspectionExpiry: inspection ? fromInputDate(inspection) : "",
    };
    onSave?.(payload);
  };

  const handleDelete = () => {
    if (!value?.id) return;
    if (confirm(`Изтриване на ${type === "tanker" ? "цистерна" : "влекач"} ${number || ""}?`)) {
      onDelete?.(value.id, type);
      onClose?.();
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">{isEdit ? labels.edit : labels.new}</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="input"
          placeholder="Рег. номер"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">Фирма (празно = SG)</label>
            <select className="input" value={company} onChange={(e)=>setCompany(e.target.value)}>
              <option value="">— без фирма (SG) —</option>
              {subcontractors.map((c) => (
                <option key={c.id || c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500">ГО валидна до</label>
            <input type="date" className="input" value={ins} onChange={(e) => setIns(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500">ADR валидно до</label>
            <input type="date" className="input" value={adr} onChange={(e) => setAdr(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Год. преглед валиден до</label>
            <input type="date" className="input" value={inspection} onChange={(e) => setInspection(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-between gap-2 pt-1">
          {isEdit ? (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              Изтрий
            </button>
          ) : <span />}

          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Отказ</button>
            <button type="submit" className="btn btn-primary">Запази</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
