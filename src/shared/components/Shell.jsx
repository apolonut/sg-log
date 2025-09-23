// src/shared/components/Shell.jsx
import React, { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

/**
 * Shell – базов layout.
 * 
 * Props:
 * - navItems: [{ key, label, icon? }]
 * - activeKey: string
 * - onNavChange: (key) => void
 * - title: string
 * - notifications: Array<any>  <-- НОВО (подава се към Topbar → NotificationsBell)
 * - children: ReactNode
 */
export default function Shell({
  navItems = [],
  activeKey,
  onNavChange,
  title,
  children,
  notifications = [], // <-- НОВО
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen brand-surface-1 text-slate-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden bg-[rgba(0,0,0,0.45)]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        items={navItems}
        activeKey={activeKey}
        onChange={(k) => {
          onNavChange?.(k);
          setSidebarOpen(false);
        }}
        open={sidebarOpen}
      />

      {/* Main area */}
      <div className="md:pl-64">
        <Topbar
          title={title}
          onHamburger={() => setSidebarOpen(true)}
          notifications={notifications} // <-- НОВО: подава нотификациите към камбанката
        />
        {/* фон на съдържанието леко различен от body за дълбочина */}
        <main className="p-0 md:p-0 brand-surface-2">
          {children}
        </main>
      </div>
    </div>
  );
}
