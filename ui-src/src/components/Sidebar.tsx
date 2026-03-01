import { useState } from "react";
import React from "react";
import { Activity } from "lucide-react";
import { useI18n } from "../i18n";
import type { Department, Agent, CompanySettings } from "../types";

export type View = "office" | "dashboard" | "tasks" | "skills" | "settings" | "mission-control" | "intelligence" | "swarm" | "leader";

interface SidebarProps {
  currentView: View;
  onChangeView: (v: View) => void;
  departments: Department[];
  agents: Agent[];
  settings: CompanySettings;
  connected: boolean;
}

/* ─── SVG ICON COMPONENTS ─── */
const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IconOffice = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />
  </svg>
);
const IconTasks = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="m9 11 3 3L22 4" />
  </svg>
);
const IconSkillLibrary = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </svg>
);
const IconCliOAuth = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);
const IconIntelligence = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v8" /><path d="m4.93 10.93 1.41 1.41" /><path d="M2 18h2" /><path d="M20 18h2" /><path d="m19.07 10.93-1.41 1.41" /><path d="M22 22H2" /><path d="m8 22 4-10 4 10" /><circle cx="12" cy="5" r="3" />
  </svg>
);
const IconSwarm = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="12" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="19" cy="19" r="2" />
    <path d="M7 12h10M17 5l-6 5M17 19l-6-5" />
  </svg>
);
const IconLeader = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a4 4 0 0 0-4 4c0 2 1.5 3.5 4 5 2.5-1.5 4-3 4-5a4 4 0 0 0-4-4z" />
    <path d="M12 11v4" /><path d="M8 15h8" />
    <path d="M6 19l2-4" /><path d="M18 19l-2-4" />
    <circle cx="12" cy="5" r="1.5" fill="currentColor" />
  </svg>
);

const NAV_ITEMS: { view: View; Icon: () => React.ReactElement; label: string }[] = [
  { view: "leader", Icon: IconLeader, label: "🧠 Sheldon" },
  { view: "dashboard", Icon: IconDashboard, label: "Active Agents" },
  { view: "swarm", Icon: IconSwarm, label: "Swarm Link" },
  { view: "office", Icon: IconOffice, label: "Office View" },
  { view: "tasks", Icon: IconTasks, label: "Task Board" },
  { view: "settings", Icon: IconCliOAuth, label: "CLI & OAuth" },
  { view: "intelligence", Icon: IconIntelligence, label: "Nexus Intelligence" },
  { view: "mission-control", Icon: IconDashboard, label: "Mission Control" },
];

export default function Sidebar({
  currentView,
  onChangeView,
  departments,
  agents,
  connected,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useI18n();

  return (
    <aside
      className={`flex flex-col h-full bg-[var(--nexus-surface)] border-r border-[var(--nexus-border)] transition-all duration-300 shrink-0 select-none
        ${collapsed ? "w-20" : "w-64"}
      `}
    >
      {/* BRANDING LOGO */}
      <div className="h-[64px] flex items-center px-5 shrink-0 border-b border-transparent">
        <div
          className="flex items-center gap-3 cursor-pointer transition-opacity hover:opacity-80 overflow-hidden"
          onClick={() => onChangeView("dashboard")}
        >
          <img
            src="/logo-pixel.png"
            alt="NexusClaw Logo"
            className={`transition-all duration-300 ${collapsed ? "w-8 h-8 object-cover object-left rounded-md" : "h-14 w-auto object-contain"}`}
          />
        </div>
      </div>

      {/* COLLAPSE TOGGLE (Optional/Hidden for cleaner look, or moved to bottom) */}

      {/* NAVIGATION */}
      <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onChangeView(item.view)}
              className={`flex items-center w-full gap-3 px-3 py-2.5 transition-all duration-100 outline-none group border rounded-md
                  ${isActive
                  ? "bg-[var(--nexus-surface-elevated)] text-[var(--nexus-text-primary)] border-[var(--nexus-border)]"
                  : "bg-transparent text-[var(--nexus-text-secondary)] border-transparent hover:bg-[var(--nexus-surface-elevated)] hover:text-[var(--nexus-text-primary)]"
                } ${collapsed ? "justify-center" : "justify-start"}`}
              title={collapsed ? item.label : undefined}
            >
              <div className={`flex items-center justify-center shrink-0 ${isActive ? "text-[var(--nexus-accent)]" : "text-[var(--nexus-text-muted)] group-hover:text-[var(--nexus-text-primary)]"}`}>
                <item.Icon />
              </div>
              {!collapsed && (
                <span className="text-[13.5px] font-medium tracking-wide">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* DEPARTMENT TELEMETRY */}
      {!collapsed && (
        <div className="px-4 py-5 space-y-3 border-t border-white/[0.04]">
          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em]">Departments</div>
          <div className="space-y-3">
            {departments.map(dept => {
              const deptAgents = agents.filter(a => a.department_id === dept.id);
              const working = deptAgents.filter(a => a.status === 'working').length;
              const pct = (working / (deptAgents.length || 1)) * 100;
              return (
                <div key={dept.id} className="group">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[11px] font-medium text-[var(--nexus-text-secondary)] truncate pr-2">{dept.name}</span>
                    <span className="text-[10px] font-semibold text-[var(--nexus-text-primary)] tabular-nums shrink-0">{working}/{deptAgents.length}</span>
                  </div>
                  <div className="nexus-meter">
                    <div
                      className="nexus-meter-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONNECTION STATUS */}
      <div className={`p-4 border-t border-[var(--nexus-border)] ${collapsed ? "flex flex-col items-center gap-3" : ""}`}>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full shrink-0 ${connected ? "bg-[var(--nexus-success)]" : "bg-[var(--nexus-danger)]"}`} />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-[var(--nexus-text-primary)]">
                Gateway v0.1.0 Live
              </span>
              <span className="text-[10px] font-medium text-[var(--nexus-text-secondary)] mt-0.5">
                {agents.filter(a => a.status === 'working').length}/{agents.length} agents working
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
