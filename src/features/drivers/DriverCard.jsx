import React from "react";
import { checkExpiry } from "@/shared/utils/dates";
import { StatusDot } from "@/shared/utils/status.jsx";

export default function DriverCard({ driver, onClick, busy }) {
  const dc = checkExpiry(driver.driverCardExpiry).status;
  const adr = checkExpiry(driver.adrExpiry).status;
  return (
    <div className="card cursor-pointer hover:shadow-lg transition" onClick={onClick}>
      <div className="flex items-start gap-3">
        <span className={`w-3 h-3 rounded-full mt-2 ${busy ? "bg-orange-500" : "bg-green-500"}`} />
        <div className="text-3xl" aria-hidden>👤</div>
        <div className="flex-1">
          <div className="text-xl font-bold">{driver.name}{driver.company ? <span className="text-slate-500 font-normal"> /{driver.company}/</span> : ""}</div>
          <div className="text-sm text-slate-500">{driver.contact}</div>
        </div>
        <div className="flex gap-2 text-xl"><StatusDot status={dc} /><StatusDot status={adr} /></div>
      </div>
      <div className="mt-3 text-sm text-slate-700 space-y-1">
        <div><b>Влекач:</b> {driver.tractor || "N/A"}</div>
        <div><b>Цистерна:</b> {driver.tanker || "N/A"}</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className={`p-3 rounded-md ${dc==="expired"?"bg-red-50 border-l-4 border-red-500":dc==="expiring-soon"?"bg-yellow-50 border-l-4 border-yellow-500":""}`}>
          <div className="text-slate-500 text-xs">Ш.К.</div><div className="font-medium">{driver.driverCardExpiry || "N/A"}</div>
        </div>
        <div className={`p-3 rounded-md ${adr==="expired"?"bg-red-50 border-l-4 border-red-500":adr==="expiring-soon"?"bg-yellow-50 border-l-4 border-yellow-500":""}`}>
          <div className="text-slate-500 text-xs">ADR</div><div className="font-medium">{driver.adrExpiry || "N/A"}</div>
        </div>
      </div>
    </div>
  );
}
