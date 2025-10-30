// src/features/tehnika/TehnikaTab.jsx
import React, { useMemo, useState } from "react";
import EditTruckModal from "./EditTruckModal.jsx";
import EditTankerModal from "./EditTankerModal.jsx";
import { checkExpiry } from "@/shared/utils/dates";
import { useTehnika } from "./tehnika.store.jsx";
import Tabs from "@/shared/components/Tabs.jsx"; // ⬅️ ново: табове SG/Подизпълнители

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
function Table({ title, items, onEdit, dense = true, showCompany = false }) {
  const rows = useMemo(() => {
    return (items || []).map((t, i) => {
      const kind = t.type || title || "item";
      const key = t.id ? String(t.id) : `${kind}:${t.number || "—"}:${i}`;
      return {
        key,
        number: t.number || "—",
        company: t.company || "SG",
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
            {showCompany && <th className={thCls}>Фирма</th>}
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
              {showCompany && <td className={`${tdCls} text-sm`}>{r.company}</td>}
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
              <td colSpan={showCompany ? 6 : 5} className="text-center text-slate-400 py-6">Няма записи.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function TehnikaTab() {
  const {
    trucks,
    tankers,
    upsertTruck,
    upsertTanker,
    removeTruck,
    removeTanker,
  } = useTehnika();

  const [active, setActive] = useState("sg"); // "sg" | "sub"
  const [q, setQ] = useState("");
  const [modal, setModal] = useState({ open: false, value: null, kind: "truck" });

  const openNew = (kind) => setModal({ open: true, value: null, kind });
  const openEditTruck = (value) => setModal({ open: true, value: { ...value, type: "truck" }, kind: "truck" });
  const openEditTanker = (value) => setModal({ open: true, value: { ...value, type: "tanker" }, kind: "tanker" });
  const close = () => setModal({ open: false, value: null, kind: "truck" });

  const handleSave = async (data) => {
    const kind = modal.kind || data?.type || "truck";
    if (kind === "tanker") await upsertTanker(data);
    else await upsertTruck(data);
    close();
  };
  const handleDelete = async (id, type) => {
    if (!id) return;
    if (type === "tanker") await removeTanker(id);
    else await removeTruck(id);
    close();
  };

  const filterQ = (arr) =>
    arr.filter((x) =>
      !q ||
      (x.number || "").toLowerCase().includes(q.toLowerCase()) ||
      (x.company || "SG").toLowerCase().includes(q.toLowerCase())
    );

  // Разделение SG / Подизпълнители
  const sgTrucks   = useMemo(() => filterQ((trucks || []).filter(t => (t.company || "SG") === "SG")), [trucks, q]);
  const sgTankers  = useMemo(() => filterQ((tankers || []).filter(t => (t.company || "SG") === "SG")), [tankers, q]);
  const subTrucks  = useMemo(() => filterQ((trucks || []).filter(t => (t.company || "SG") !== "SG")), [trucks, q]);
  const subTankers = useMemo(() => filterQ((tankers || []).filter(t => (t.company || "SG") !== "SG")), [tankers, q]);

  // Групиране по фирма за подизпълнители
  const subGrouped = useMemo(() => {
    const acc = {};
    [...subTrucks, ...subTankers].forEach((item) => {
      const key = item.company || "—";
      (acc[key] ||= []).push(item);
    });
    Object.keys(acc).forEach((k) => {
      acc[k].sort((a, b) => (a.number || "").localeCompare(b.number || "", "bg"));
    });
    return acc;
  }, [subTrucks, subTankers]);

  return (
    <div className="space-y-4">
      {/* Заглавие + действия */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold">Техника</div>
        <div className="flex items-center gap-2">
          <input
            className="input w-64"
            placeholder="Търсене (номер, фирма)…"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
          />
          <button className="btn btn-ghost"   onClick={() => openNew("truck")}>+ Влекач</button>
          <button className="btn btn-primary" onClick={() => openNew("tanker")}>+ Цистерна</button>
        </div>
      </div>

      {/* Табове SG / Подизпълнители */}
      <Tabs
        active={active}
        onChange={setActive}
        items={[
          { key: "sg",  label: "SG" },
          { key: "sub", label: "Подизпълнители" },
        ]}
      />

      {active === "sg" ? (
        <div className="grid md:grid-cols-2 gap-6">
          <Table title="SG Влекачи"  items={sgTrucks}  onEdit={openEditTruck}  dense />
          <Table title="SG Цистерни" items={sgTankers} onEdit={openEditTanker} dense />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(subGrouped).sort((a,b)=>a.localeCompare(b,"bg")).map((company) => {
            const items = subGrouped[company];
            const trucksOnly  = items.filter(i => i.type === "truck");
            const tankersOnly = items.filter(i => i.type === "tanker");
            return (
              <div key={company} className="space-y-3">
                <h3 className="text-lg font-bold">
                  {company} <span className="text-sm text-slate-500">({items.length})</span>
                </h3>
                {!!trucksOnly.length && (
                  <Table title="Влекачи" items={trucksOnly} onEdit={openEditTruck} dense showCompany />
                )}
                {!!tankersOnly.length && (
                  <Table title="Цистерни" items={tankersOnly} onEdit={openEditTanker} dense showCompany />
                )}
                {!trucksOnly.length && !tankersOnly.length && (
                  <div className="card text-center text-slate-400">Няма техника.</div>
                )}
              </div>
            );
          })}
          {!Object.keys(subGrouped).length && <div className="card text-center text-slate-400">Няма подизпълнители.</div>}
        </div>
      )}

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
          type="truck"
        />
      )}
    </div>
  );
}
