import React, { useState, useEffect } from "react";
import { Layers, Settings, Terminal, Sparkles, Rocket, Cpu } from "lucide-react";
import type { View } from "./Sidebar";

interface TopBarProps {
    currentView: View;
    onChangeView: (v: View) => void;
    onRefreshCli?: () => void;
    onCreateTask?: () => void;
}

const VIEW_CONFIG: Record<View, { title: string; icon: string; IconComponent?: React.ElementType }> = {
    dashboard: { title: "Dashboard", icon: "📊", IconComponent: Layers },
    office: { title: "Office View", icon: "🏢", IconComponent: Layers },
    tasks: { title: "Task Board", icon: "📋", IconComponent: Layers },
    skills: { title: "Skill Library", icon: "📚", IconComponent: Layers },
    settings: { title: "Settings Configuration", icon: "⚙️", IconComponent: Settings },
    "mission-control": { title: "Mission Control", icon: "🚀", IconComponent: Rocket },
    intelligence: { title: "Nexus Intelligence", icon: "🔬", IconComponent: Cpu },
};

export const TopBar: React.FC<TopBarProps> = ({ currentView, onChangeView, onRefreshCli, onCreateTask }) => {
    const config = VIEW_CONFIG[currentView];
    const Icon = config.IconComponent; // Get the IconComponent from config

    return (
        <header className="flex items-center justify-between px-6 py-4 bg-[#050505] border-b border-slate-800/80 shrink-0">
            {/* LEFT: TITLE */}
            <div className="flex items-center gap-3">
                {Icon ? <Icon className="w-5 h-5 text-slate-400" /> : <Layers className="w-5 h-5 text-slate-400" />}
                <h2 className="text-lg font-bold tracking-widest uppercase text-slate-200">{config.title}</h2>
            </div>

            {/* RIGHT: ACTIONS */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onChangeView('skills')}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold tracking-widest uppercase transition-all border
                   bg-[#050505] text-slate-300 border-slate-700/50 hover:bg-[#1a1f2e] hover:text-white hover:border-slate-500 active:scale-95"
                    title="Open Skill Library"
                >
                    <Settings className="w-3.5 h-3.5" />
                    Script
                </button>
                <button
                    onClick={() => {
                        onRefreshCli?.();
                        onChangeView('settings');
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold tracking-widest uppercase transition-all border
                   bg-[#050505] text-slate-300 border-slate-700/50 hover:bg-[#1a1f2e] hover:text-white hover:border-slate-500 active:scale-95"
                    title="Refresh CLI Status & Settings"
                >
                    <Terminal className="w-3.5 h-3.5 text-[var(--nexus-accent)]" />
                    Idle CLI
                </button>
                <button
                    onClick={() => {
                        onChangeView('tasks');
                        onCreateTask?.();
                    }}
                    className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold tracking-widest uppercase transition-all border
                   bg-[var(--nexus-accent)] text-[#050505] border-[var(--nexus-accent)] hover:opacity-90 active:scale-95 shadow-[0_0_15px_rgba(0,255,170,0.3)]"
                >
                    New Task <Sparkles className="w-3.5 h-3.5" />
                </button>
            </div>
        </header>
    );
};
