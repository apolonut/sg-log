// src/app/App.jsx
import React, { useEffect, useState } from "react";
import Shell from "../shared/components/Shell.jsx";
import { Routes } from "./routes.jsx";
import { NotificationsProvider } from "@/features/notifications/notifications.store.jsx";

// ⬇️ ВАЖНО: увиваме приложението с провайдърите
import { DriversProvider } from "@/features/drivers/drivers.store.jsx";
import { TehnikaProvider } from "@/features/tehnika/tehnika.store.jsx";
import { SettingsProvider } from "@/features/settings/settings.store.jsx";
import { SchedulesProvider } from "@/features/schedule/schedule.store.jsx";
import { CountersProvider } from "@/features/counters/counters.store.jsx";

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

  // Глобална навигация през CustomEvent
  useEffect(() => {
    const onNav = (e) => {
      const tab = e?.detail?.tab;
      if (!tab) return;
      setActive(tab);
    };
    window.addEventListener("app:navigate", onNav);
    return () => window.removeEventListener("app:navigate", onNav);
  }, []);

  return (
    <SettingsProvider>
      <DriversProvider>
        <TehnikaProvider>
          <SchedulesProvider>
            <CountersProvider>
              <NotificationsProvider>
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
              </NotificationsProvider>
            </CountersProvider>
          </SchedulesProvider>
        </TehnikaProvider>
      </DriversProvider>
    </SettingsProvider>
  );
}
