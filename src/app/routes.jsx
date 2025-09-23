// src/app/routes.jsx
import React, { Suspense, lazy } from "react";

// Ленива загрузка на табовете
const DashboardTab = lazy(() => import("@/features/dashboard/DashboardTab.jsx"));
const DriversTab   = lazy(() => import("@/features/drivers/DriversTab.jsx"));
const ScheduleTab  = lazy(() => import("@/features/schedule/ScheduleTab.jsx"));
const TehnikaTab   = lazy(() => import("@/features/tehnika/TehnikaTab.jsx"));
const SettingsTab  = lazy(() => import("@/features/settings/SettingsTab.jsx"));

// Провайдъри (Firestore-backed)
import { DriversProvider }   from "@/features/drivers/drivers.store.jsx";
import { SettingsProvider }  from "@/features/settings/settings.store.jsx";
import { SchedulesProvider } from "@/features/schedule/schedule.store.jsx";
import { TehnikaProvider }   from "@/features/tehnika/tehnika.store.jsx"; // ⬅️ ново

// Auth (Login gate)
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider.jsx";
import LoginPage from "@/features/auth/LoginPage.jsx";

// Gate показва LoginPage ако няма потребител
function Gate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="card">Зареждане…</div>;
  if (!user)   return <LoginPage />;
  return children;
}

export function Routes({ active }) {
  return (
    <AuthProvider>
      <DriversProvider>
        <SettingsProvider>
          <TehnikaProvider>{/* ⬅️ добавено */}
            <SchedulesProvider>
              <Gate>
                <Suspense fallback={<div className="card">Зареждане…</div>}>
                  {active === "dashboard" && <DashboardTab />}
                  {active === "drivers"   && <DriversTab />}
                  {active === "schedule"  && <ScheduleTab />}
                  {active === "tehnika"   && <TehnikaTab />}
                  {active === "settings"  && <SettingsTab />}
                </Suspense>
              </Gate>
            </SchedulesProvider>
          </TehnikaProvider>
        </SettingsProvider>
      </DriversProvider>
    </AuthProvider>
  );
}
