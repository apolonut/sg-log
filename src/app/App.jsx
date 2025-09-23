// src/app/App.jsx
import React, { useEffect, useState } from "react";
import Shell from "../shared/components/Shell.jsx";
import { Routes } from "./routes.jsx";

const NAV = [
  { key: "dashboard", label: "Дашборд",   icon: "dashboard" },
  { key: "schedule",  label: "График",    icon: "calendar"  },
  { key: "drivers",   label: "Шофьори",   icon: "drivers"   },
  { key: "tehnika",   label: "Техника",   icon: "truck"     },
  { key: "settings",  label: "Настройки", icon: "settings"  },
];

export default function App() {
  const [active, setActive] = useState("dashboard");
  const current = NAV.find((n) => n.key === active);

  // ⬇️ НОВО: глобална навигация през CustomEvent
  useEffect(() => {
    const onNav = (e) => {
      const tab = e?.detail?.tab;
      if (!tab) return;
      setActive(tab); // напр. "schedule"
    };
    window.addEventListener("app:navigate", onNav);
    return () => window.removeEventListener("app:navigate", onNav);
  }, []);

  return (
    <Shell
      navItems={NAV}
      activeKey={active}
      onNavChange={setActive}
      title={current?.label || "SG Logistics"}
    >
      <div className="p-4 md:p-6 lg:p-8">
        <Routes active={active} />
      </div>
    </Shell>
  );
}
