// src/features/tehnika/EditTankerModal.jsx
import React from "react";
import Modal from "@/shared/components/Modal.jsx";
import { toInputDate, fromInputDate } from "@/shared/utils/dates";

export default function EditTankerModal({ open, onClose, value, onSave, onDelete }) {
  const isEdit = !!value?.id;

  const handleSubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    onSave?.({
      id: value?.id,
      type: "tanker", // маркираме го като цистерна
      number: f.number.value.trim(),
      insuranceExpiry: f.ins.value ? fromInputDate(f.ins.value) : "",
      adrExpiry: f.adr.value ? fromInputDate(f.adr.value) : "",
      inspectionExpiry: f.inspection.value ? fromInputDate(f.inspection.value) : "",
    });
  };

  const handleDelete = () => {
    if (!isEdit) return;
    if (confirm("Сигурни ли сте, че искате да изтриете тази цистерна?")) {
      onDelete?.(value.id, "tanker");
      onClose?.();
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">
        {isEdit ? "Редакция на цистерна" : "Нова цистерна"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="number"
          className="input"
          placeholder="Рег. номер"
          defaultValue={value?.number || ""}
          required
        />

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500">ГО валидна до</label>
            <input
              type="date"
              name="ins"
              className="input"
              defaultValue={toInputDate(value?.insuranceExpiry || "")}
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
          <div>
            <label className="text-xs text-slate-500">Год. преглед валиден до</label>
            <input
              type="date"
              name="inspection"
              className="input"
              defaultValue={toInputDate(value?.inspectionExpiry || "")}
            />
          </div>
        </div>

        <div className="flex justify-between items-center gap-2 pt-1">
          <div>
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
