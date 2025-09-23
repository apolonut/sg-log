import React from "react";
import NotificationsBell from "./NotificationsBell.jsx";
import GlobalSearch from "./GlobalSearch.jsx";

export default function Header({ title = "SG Logistics", onGlobalPick }) {
  return (
    <header className="toolbar-sticky">
      <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center gap-3">
        <div className="font-semibold text-slate-700">{title}</div>
        <div className="flex-1" />
        <GlobalSearch onPick={onGlobalPick} />
        <NotificationsBell />
      </div>
    </header>
  );
}
