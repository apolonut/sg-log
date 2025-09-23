import React, { useEffect, useMemo, useState } from "react";
import Tabs from "@/shared/components/Tabs.jsx";
import { useLocalStorage } from "@/shared/hooks/useLocalStorage";
import { parseBGDate, checkExpiry } from "@/shared/utils/dates";
import EditDriverModal from "@/features/drivers/EditDriverModal.jsx";

// SG списък (маркираме автоматично)
const SG_NAMES = [
  "Борислав Георгиев",
  "Валери Върбанов",
  "Иван Ангелов",
  "Милен Иванов",
  "Моньо Монев",
  "Панайот Кокалджиев",
  "Станимир Инджов",
  "Стоян Кокалджиев",
  "Тодор Йовчев",
];

// helper: копиране в клипборда
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
};

// мини компоненти
function DocBadge({ label, date }) {
  const x = checkExpiry(date);
  const cls =
    x.status === "expired" ? "bg-red-100 text-red-700" :
    x.status === "expiring-soon" ? "bg-yellow-100 text-yellow-700" :
    x.status === "valid" ? "bg-green-100 text-green-700" :
    "bg-slate-100 text-slate-700";
  const text =
    x.status === "expired" ? `${label}: изтекъл` :
    x.status === "expiring-soon" ? `${label}: ${x.days} дни` :
    x.status === "valid" ? `${label}: ок` :
    `${label}: н/д`;
  return <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>{text}</span>;
}

function StatusDot({ busy }) {
  return (
    <span title={busy ? "Зает" : "Свободен"} className={`inline-block w-2.5 h-2.5 rounded-full ${busy ? "bg-orange-500" : "bg-green-500"}`} />
  );
}

// иконки (inline SVG)
const IconClipboard = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 2a2 2 0 0 0-2 2H6a2 2 0 0 0-2 2v12a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V6a2 2 0 0 0-2-2h-1a2 2 0 0 0-2-2H9Zm0 2h6v2H9V4Z"/>
  </svg>
);

const IconBuilding = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 3h10a2 2 0 0 1 2 2v4h2a2 2 0 0 1 2 2v8h-3v-3h-2v3H5v-3H3v-8a2 2 0 0 1 2-2h2V5a2 2 0 0 1 2-2ZM7 7v2h2V7H7Zm0 4v2h2v-2H7Zm0 4v2h2v-2H7Zm6-8v2h2V7h-2Zm0 4v2h2v-2h-2Z"/>
  </svg>
);

function DriverRow({ d, busy, onEdit, onCopyDriver, onCopyCompany }) {
  return (
    <tr className="border-b hover:bg-slate-50">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <StatusDot busy={busy} />
          <span className="font-medium">{d.name}</span>
          {d.company ? <span className="text-slate-500 text-sm">/{d.company}/</span> : null}
        </div>
      </td>
      <td className="p-3 text-sm">{d.tractor || "—"}</td>
      <td className="p-3 text-sm">{d.tanker || "—"}</td>
      <td className="p-3 text-sm">
        <div className="flex flex-wrap gap-1">
          <DocBadge label="Ш.К." date={d.driverCardExpiry} />
          <DocBadge label="ADR"  date={d.adrExpiry} />
        </div>
      </td>
      {/* ЕГН + Телефон */}
      <td className="p-3 text-sm">{d.egn || "—"}</td>
      <td className="p-3 text-sm">{d.contact || "—"}</td>
      <td className="p-3">
        <div className="flex items-center justify-end gap-2">
          <button className="btn btn-ghost px-2 py-1 text-xs" title="Копирай шофьор" onClick={() => onCopyDriver(d)}>
            <IconClipboard />
          </button>
          <button className="btn btn-ghost px-2 py-1 text-xs" title="Копирай фирма" onClick={() => onCopyCompany(d)}>
            <IconBuilding />
          </button>
          <button className="text-xs underline text-slate-600" onClick={() => onEdit(d)}>редакция</button>
        </div>
      </td>
    </tr>
  );
}

export default function DriversTab() {
  const [drivers, setDrivers] = useLocalStorage("drivers", []);
  const [schedules] = useLocalStorage("schedules", []);
  const [subcontractors] = useLocalStorage("subcontractors", []); // за „копирай фирма“
  const [active, setActive] = useState("sg");
  const [q, setQ] = useState("");

  // toast
  const [toast, setToast] = useState("");

  // еднократна миграция → маркира SG шофьорите
  useEffect(() => {
    let changed = false;
    const next = drivers.map((d) => {
      if (typeof d.isOwn === "boolean") return d;
      if (SG_NAMES.includes(d.name)) {
        changed = true;
        return { ...d, isOwn: true };
      }
      return { ...d, isOwn: false };
    });
    if (changed) setDrivers(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const isBusy = (driverName) =>
    schedules.some((s) => {
      if (s.driver !== driverName) return false;
      const st = parseBGDate(s.date), en = parseBGDate(s.unloadDate);
      return st && en && today >= st && today <= en;
    });

  const matches = (d) =>
    !q ||
    d.name.toLowerCase().includes(q.toLowerCase()) ||
    (d.company || "").toLowerCase().includes(q.toLowerCase()) ||
    (d.tractor || "").toLowerCase().includes(q.toLowerCase()) ||
    (d.tanker || "").toLowerCase().includes(q.toLowerCase());

  const sgDrivers   = useMemo(() => drivers.filter((d) => d.isOwn && matches(d)), [drivers, q]);
  const subDrivers  = useMemo(() => drivers.filter((d) => !d.isOwn && matches(d)), [drivers, q]);

  const sgBusy   = useMemo(() => sgDrivers.filter((d) => isBusy(d.name)).length, [sgDrivers, schedules]);
  const sgFree   = sgDrivers.length - sgBusy;

  const subByCompany = useMemo(() => {
    const acc = {};
    subDrivers.forEach((d) => {
      const key = d.company || "—";
      (acc[key] ||= []).push(d);
    });
    Object.keys(acc).forEach((k) => acc[k].sort((a, b) => a.name.localeCompare(b.name, "bg")));
    return acc;
  }, [subDrivers]);

  // форматери за копиране — използваме ВЛЕКАЧ и ЦИСТЕРНА
  const formatDriverLine = (d) => {
    const egn  = (d.egn || "").trim() || "—";
    const tr   = (d.tractor || "").trim() || "—";
    const tn   = (d.tanker  || "").trim() || "—";
    return `${d.name} ЕГН: ${egn} - ${tr} / ${tn}`;
  };
  const findSubcontractor = (name) =>
    subcontractors.find((c) => (c.name || "").trim().toLowerCase() === (name || "").trim().toLowerCase());
  const formatCompanyBlock = (c, fallbackName) => {
    const name = (c?.name || fallbackName || "—").toString();
    const eik = (c?.eik || "—").toString();
    const address = (c?.address || "—").toString();
    const mol = (c?.mol || "—").toString();
    return `Фирма: ${name}
ЕИК: ${eik}
Адрес: ${address}
МОЛ: ${mol}`;
  };

  const notify = (msg) => {
    setToast(msg);
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setToast(""), 1600);
  };

  const handleCopyDriver = async (d) => {
    await copyText(formatDriverLine(d));
    notify("Копирано");
  };
  const handleCopyCompany = async (d) => {
    const comp = findSubcontractor(d.company);
    await copyText(formatCompanyBlock(comp, d.company));
    notify("Копирано");
  };

  // модал нов/редакция
  const [modal, setModal] = useState({ open: false, value: null });
  const openModal  = (value = null) => setModal({ open: true, value });
  const closeModal = () => setModal({ open: false, value: null });

  const upsertDriver = (item) =>
    setDrivers((prev) => {
      if (item.id && prev.some((x) => x.id === item.id)) return prev.map((x) => (x.id === item.id ? { ...x, ...item } : x));
      return [{ id: `${Date.now()}${Math.random().toString(36).slice(2)}`, ...item }, ...prev];
    });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Tabs
          active={active}
          onChange={setActive}
          items={[
            { key: "sg",  label: "SG" },
            { key: "sub", label: "Подизпълнители" },
          ]}
        />
        <div className="flex items-center gap-2">
          <input
            className="input w-64"
            placeholder="Търсене (име, фирма, композиция)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => openModal(null)}>+ Нов шофьор</button>
        </div>
      </div>

      {/* SG */}
      {active === "sg" && (
        <div className="space-y-4">
          <div className="card">
            <div className="text-sm text-slate-600">SG шофьори</div>
            <div className="mt-1 text-xl font-bold">{sgDrivers.length}</div>
            <div className="text-sm mt-1">
              <span className="text-green-600 font-semibold">{sgFree}</span> свободни ·{" "}
              <span className="text-orange-500 font-semibold">{sgBusy}</span> заети
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full table">
              <thead>
                <tr className="bg-slate-50">
                  <th>Шофьор</th>
                  <th>Влекач</th>
                  <th>Цистерна</th>
                  <th>Документи</th>
                  <th>ЕГН</th>
                  <th>Телефон</th>
                  <th className="text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {sgDrivers.map((d) => (
                  <DriverRow
                    key={d.id || d.name}
                    d={d}
                    busy={isBusy(d.name)}
                    onEdit={openModal}
                    onCopyDriver={handleCopyDriver}
                    onCopyCompany={handleCopyCompany}
                  />
                ))}
              </tbody>
            </table>
            {!sgDrivers.length && <div className="text-center text-slate-400 py-6">Няма SG шофьори.</div>}
          </div>
        </div>
      )}

      {/* Подизпълнители */}
      {active === "sub" && (
        <div className="space-y-6">
          {Object.keys(subByCompany).sort((a,b)=>a.localeCompare(b,"bg")).map((company) => {
            const arr = subByCompany[company];
            return (
              <div className="card overflow-x-auto" key={company}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold">{company}</h3>
                  <span className="text-sm text-slate-500">Общо: {arr.length}</span>
                </div>
                <table className="w-full table">
                  <thead>
                    <tr className="bg-slate-50">
                      <th>Шофьор</th>
                      <th>Влекач</th>
                      <th>Цистерна</th>
                      <th>Документи</th>
                      <th>ЕГН</th>
                      <th>Телефон</th>
                      <th className="text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arr.map((d) => (
                      <DriverRow
                        key={d.id || d.name}
                        d={d}
                        busy={isBusy(d.name)}
                        onEdit={openModal}
                        onCopyDriver={handleCopyDriver}
                        onCopyCompany={handleCopyCompany}
                      />
                    ))}
                  </tbody>
                </table>
                {!arr.length && <div className="text-center text-slate-400 py-6">Няма шофьори.</div>}
              </div>
            );
          })}
          {!Object.keys(subByCompany).length && <div className="card text-center text-slate-400">Няма подизпълнители.</div>}
        </div>
      )}

      {/* модал */}
      <EditDriverModal
        open={modal.open}
        value={modal.value}
        onClose={closeModal}
        onSave={(data) => {
          const isOwn = SG_NAMES.includes(data.name) ? true : (typeof data.isOwn === "boolean" ? data.isOwn : false);
          upsertDriver({ ...data, isOwn });
          closeModal();
        }}
      />

      {/* toast */}
      {!!toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-2 rounded shadow">
          {toast}
        </div>
      )}
    </>
  );
}
