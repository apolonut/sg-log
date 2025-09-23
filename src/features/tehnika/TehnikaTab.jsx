// src/features/tehnika/TehnikaTab.jsx
import React, { useMemo, useState } from "react";
import { useLocalStorage } from "../../shared/hooks/useLocalStorage";
import EditTruckModal from "./EditTruckModal.jsx";
import EditTankerModal from "./EditTankerModal.jsx";
import { checkExpiry } from "../../shared/utils/dates";

// Малък бейдж за статус по дата
const StatusBadge = ({ date }) => {
  const x = checkExpiry(date);
  const cls =
    x.status === "expired" ? "bg-red-100 text-red-700" :
    x.status === "expiring-soon" ? "bg-yellow-100 text-yellow-700" :
    x.status === "valid" ? "bg-green-100 text-green-700" :
    "bg-slate-100 text-slate-600";
  const txt =
    x.status === "expired" ? "изтекъл" :
    x.status === "expiring-soon" ? `след ${x.days} дни` :
    x.status === "valid" ? "валиден" :
    "н/д";
  return <span className={`text-[11px] px-1.5 py-0.5 rounded ${cls}`}>{txt}</span>;
};

// Универсална таблица (за влекачи и цистерни)
function Table({ title, items, onEdit, dense = true }) {
  const rows = useMemo(() => {
    return (items || []).map((t, i) => {
      // Уникален и стабилен ключ: предпочитаме id; иначе комбинираме тип/заглавие + номер + индекс
      const kind = t.type || title || "item";
      const key = t.id ? String(t.id) : `${kind}:${t.number || "—"}:${i}`;
      return {
        key,
        number: t.number || "—",
        adrExpiry: t.adrExpiry || "",
        insurance: t.insuranceExpiry || t.goExpiry || "",
        inspection: t.inspectionExpiry || t.techExpiry || "",
        raw: t,
      };
    });
  }, [items, title]);

  const thCls = dense ? "px-2 py-2" : "p-3";
  const tdCls = dense ? "px-2 py-1.5" : "p-3";

  return (
    <div className="card overflow-x-auto">
      <div className="font-semibold mb-2">{title}</div>
      <table className="table w-full">
        <thead>
          <tr className="bg-slate-50 text-sm">
            <th className={thCls}>Номер</th>
            <th className={thCls}>ГО</th>
            <th className={thCls}>Преглед</th>
            <th className={thCls}>ADR</th>
            <th className={`${thCls} text-right`}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="hover:bg-slate-50">
              <td className={`${tdCls} font-medium whitespace-nowrap`}>{r.number}</td>
              <td className={`${tdCls} text-sm`}>
                <div className="flex items-center gap-2">
                  <StatusBadge date={r.insurance} />
                  <span className="text-slate-600 whitespace-nowrap">{r.insurance || "—"}</span>
                </div>
              </td>
              <td className={`${tdCls} text-sm`}>
                <div className="flex items-center gap-2">
                  <StatusBadge date={r.inspection} />
                  <span className="text-slate-600 whitespace-nowrap">{r.inspection || "—"}</span>
                </div>
              </td>
              <td className={`${tdCls} text-sm`}>
                <div className="flex items-center gap-2">
                  <StatusBadge date={r.adrExpiry} />
                  <span className="text-slate-600 whitespace-nowrap">{r.adrExpiry || "—"}</span>
                </div>
              </td>
              <td className={`${tdCls} text-right`}>
                <button
                  className="text-xs underline text-slate-600"
                  onClick={() => onEdit(r.raw)}
                >
                  редакция
                </button>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={5} className="text-center text-slate-400 py-6">Няма записи.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function TehnikaTab() {
  const [trucks, setTrucks]   = useLocalStorage("trucks", []);
  const [tankers, setTankers] = useLocalStorage("tankers", []);

  const [modal, setModal] = useState({ open: false, value: null, kind: "truck" }); // "truck" | "tanker"

  // Гарантиране на id за стари записи (преди да отворим модала)
  const ensureWithId = (item, setArr) => {
    if (item?.id) return item;
    const withId = { ...item, id: `${Date.now()}${Math.random().toString(36).slice(2)}` };
    setArr(prev => {
      const idx = prev.findIndex(x => x.number === item.number);
      if (idx >= 0) {
        const clone = prev.slice();
        clone[idx] = { ...withId };
        return clone;
      }
      return [withId, ...prev];
    });
    return withId;
  };

  // Нов запис (празни полета)
  const openNew = (kind) => setModal({ open: true, value: null, kind });

  // Редакция – подсигуряваме id + подаваме type в value
  const openEditTruck = (value) => {
    const v = ensureWithId(value, setTrucks);
    setModal({ open: true, value: { ...v, type: "truck" }, kind: "truck" });
  };
  const openEditTanker = (value) => {
    const v = ensureWithId(value, setTankers);
    setModal({ open: true, value: { ...v, type: "tanker" }, kind: "tanker" });
  };

  const close = () => setModal({ open: false, value: null, kind: "truck" });

  // upsert
  const upsert = (setArr) => (item) =>
    setArr(prev => {
      if (item.id && prev.some(x => x.id === item.id)) {
        return prev.map(x => (x.id === item.id ? { ...x, ...item } : x));
      }
      return [{ id: `${Date.now()}${Math.random().toString(36).slice(2)}`, ...item }, ...prev];
    });

  const upsertTruck  = upsert(setTrucks);
  const upsertTanker = upsert(setTankers);

  // Save/Delete
  const handleSave = (data) => {
    const kind = modal.kind || data?.type || "truck";
    // ако редактираме, пазим съществуващото id
    const payload = { ...(modal.value?.id ? { id: modal.value.id } : {}), ...data, type: kind };
    if (kind === "tanker") upsertTanker(payload);
    else                   upsertTruck(payload);
    close();
  };

  const handleDelete = (id, type) => {
    if (!id) return;
    if (type === "tanker") setTankers(prev => prev.filter(x => x.id !== id));
    else                   setTrucks(prev => prev.filter(x => x.id !== id));
    close();
  };

  return (
    <div className="space-y-4">
      {/* Заглавие + действия */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold">Техника</div>
        <div className="flex gap-2">
          <button className="btn btn-ghost"   onClick={() => openNew("truck")}>+ Влекач</button>
          <button className="btn btn-primary" onClick={() => openNew("tanker")}>+ Цистерна</button>
        </div>
      </div>

      {/* Две колони */}
      <div className="grid md:grid-cols-2 gap-6">
        <Table title="Влекачи"  items={trucks}  onEdit={openEditTruck}  dense />
        <Table title="Цистерни" items={tankers} onEdit={openEditTanker} dense />
      </div>

      {/* Рендер на правилния модал */}
      {modal.kind === "tanker" ? (
        <EditTankerModal
          open={modal.open}
          value={modal.value}            // null → „Нова цистерна“, има id → „Редакция“
          onClose={close}
          onSave={handleSave}
          onDelete={(id) => handleDelete(id, "tanker")}
        />
      ) : (
        <EditTruckModal
          open={modal.open}
          value={modal.value}            // null → „Нов влекач“, има id → „Редакция“
          onClose={close}
          onSave={handleSave}
          onDelete={(id) => handleDelete(id, "truck")}
        />
      )}
    </div>
  );
}
