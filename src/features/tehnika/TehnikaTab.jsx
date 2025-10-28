// src/features/tehnika/TehnikaTab.jsx
import React, { useMemo, useState } from "react";
import EditTruckModal from "./EditTruckModal.jsx";
import EditTankerModal from "./EditTankerModal.jsx";
import { checkExpiry } from "@/shared/utils/dates";
import { useTehnika } from "./tehnika.store.js";

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
  const {
    trucks, tankers,
    upsertTruck, upsertTanker,
    removeTruck, removeTanker,
  } = useTehnika();

  const [modal, setModal] = useState({ open: false, value: null, kind: "truck" }); // "truck" | "tanker"

  // Нов запис (празни полета)
  const openNew = (kind) => setModal({ open: true, value: null, kind });

  // Редакция – подаваме type в value (само за удобство на модалите)
  const openEditTruck = (value) => setModal({ open: true, value: { ...value, type: "truck" },  kind: "truck"  });
  const openEditTanker = (value) => setModal({ open: true, value: { ...value, type: "tanker" }, kind: "tanker" });

  const close = () => setModal({ open: false, value: null, kind: "truck" });

  // Save/Delete → МИНАВАТ ПРЕЗ FIRESTORE CRUD
  const handleSave = async (data) => {
    const kind = modal.kind || data?.type || "truck";
    try {
      if (kind === "tanker") {
        await upsertTanker({
          ...(modal.value?.id ? { id: modal.value.id } : {}),
          number: data.number,
          insuranceExpiry: data.insuranceExpiry || "",
          inspectionExpiry: data.inspectionExpiry || "",
          adrExpiry: data.adrExpiry || "",
          type: "tanker",
        });
      } else {
        await upsertTruck({
          ...(modal.value?.id ? { id: modal.value.id } : {}),
          number: data.number,
          insuranceExpiry: data.insuranceExpiry || "",
          inspectionExpiry: data.inspectionExpiry || "",
          adrExpiry: data.adrExpiry || "",
          type: "truck",
        });
      }
      close();
    } catch (e) {
      console.error("[TehnikaTab] save error:", e);
      alert("Грешка при запис. Виж конзолата.");
    }
  };

  const handleDelete = async (id, type) => {
    if (!id) return;
    try {
      if (type === "tanker") await removeTanker(id);
      else                   await removeTruck(id);
      close();
    } catch (e) {
      console.error("[TehnikaTab] delete error:", e);
      alert("Грешка при изтриване. Виж конзолата.");
    }
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
          value={modal.value}
          onClose={close}
          onSave={handleSave}
          onDelete={(id) => handleDelete(id, "tanker")}
        />
      ) : (
        <EditTruckModal
          open={modal.open}
          value={modal.value}
          onClose={close}
          onSave={handleSave}
          onDelete={(id) => handleDelete(id, "truck")}
        />
      )}
    </div>
  );
}
