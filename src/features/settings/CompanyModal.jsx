// src/features/settings/CompanyModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/shared/components/Modal.jsx";

export default function CompanyModal({
  open,
  onClose,
  value,            // { id?, name, eik, address, mol }
  kind = "client",  // 'client' | 'sub'  (за заглавие/копче/надпис)
  onSave,
  onDelete,
  // по желание можеш да подадеш масив за проверка на дублиращи имена:
  existingNames = [], // ['ACME', 'Some Client'...] - не е задължително
}) {
  const isEdit = !!value?.id;

  // локално състояние
  const [name, setName]       = useState("");
  const [eik, setEik]         = useState("");
  const [address, setAddress] = useState("");
  const [mol, setMol]         = useState("");

  const nameInputRef = useRef(null);

  // hydrate при отваряне
  useEffect(() => {
    if (!open) return;
    setName(value?.name || "");
    setEik(value?.eik || "");
    setAddress(value?.address || "");
    setMol(value?.mol || "");
    // фокус
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [open, value]);

  // валидации
  const nameError = useMemo(() => !name.trim() ? "Въведи име." : "", [name]);

  const eikNormalized = (eik || "").replace(/\s+/g, "");
  const eikLooksValid =
    eikNormalized.length === 0 || /^[0-9]{9}$/.test(eikNormalized) || /^[0-9]{13}$/.test(eikNormalized);
  const eikError = useMemo(() => (eikLooksValid ? "" : "EIK трябва да е 9 или 13 цифри."), [eikLooksValid]);

  const duplicateWarning = useMemo(() => {
    if (!name.trim() || !existingNames?.length) return "";
    const n = name.trim().toLowerCase();
    return existingNames.some(x => String(x).trim().toLowerCase() === n)
      ? "Има съществуващ запис със същото име."
      : "";
  }, [name, existingNames]);

  const canSave = !nameError && eikLooksValid;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSave) return;

    onSave?.({
      id: value?.id,
      name: name.trim(),
      eik: eikNormalized,
      address: address.trim(),
      mol: mol.trim(),
    });
  };

  const handleDelete = () => {
    if (!isEdit) return;
    if (confirm("Сигурни ли сте, че искате да изтриете този запис?")) {
      onDelete?.(value.id);
    }
  };

  if (!open) return null;

  const title = isEdit
    ? (kind === "sub" ? "Редакция на подизпълнител" : "Редакция на клиент")
    : (kind === "sub" ? "Нов подизпълнител" : "Нова фирма (клиент)");

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">{title}</h2>

      <form onSubmit={handleSubmit} className="space-y-3" onKeyDown={(e) => {
        if (e.key === "Escape") onClose?.();
      }}>
        <div>
          <label className="text-xs text-slate-500">Име *</label>
          <input
            ref={nameInputRef}
            className={`input mt-1 ${nameError ? "border-red-300" : ""}`}
            placeholder="Име на фирма"
            value={name}
            onChange={(e)=>setName(e.target.value)}
            required
          />
          {nameError && <div className="text-xs text-red-600 mt-1">{nameError}</div>}
          {!nameError && duplicateWarning && (
            <div className="text-xs text-amber-600 mt-1">{duplicateWarning}</div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">ЕИК</label>
            <input
              className={`input mt-1 ${eikError ? "border-amber-300" : ""}`}
              placeholder="9 или 13 цифри"
              value={eik}
              onChange={(e)=>setEik(e.target.value)}
            />
            {eikError && <div className="text-xs text-amber-600 mt-1">{eikError}</div>}
          </div>
          <div>
            <label className="text-xs text-slate-500">МОЛ</label>
            <input
              className="input mt-1"
              placeholder="Име на МОЛ"
              value={mol}
              onChange={(e)=>setMol(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500">Адрес</label>
          <input
            className="input mt-1"
            placeholder="Адрес на управление"
            value={address}
            onChange={(e)=>setAddress(e.target.value)}
          />
        </div>

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
