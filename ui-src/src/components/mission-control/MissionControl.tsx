import React, { useState, useEffect } from 'react';
import { Search, Layers, Calendar, Edit3, Plus, X, Video, BookOpen, Users, LayoutDashboard } from 'lucide-react';
import type { Agent, Task, Project, Message, NexusMetrics, CompanySettings } from '../types';

// Mission Control Modules
import { TasksBoard } from './mission-control/TasksBoard';
import { ContentPipeline } from './mission-control/ContentPipeline';
import { CalendarView } from './mission-control/CalendarView';
import { MemoryLog } from './mission-control/MemoryLog';
import { TeamStructure } from './mission-control/TeamStructure';

interface MissionControlProps {
    agents: Agent[];
    tasks: Task[];
    projects: Project[];
    messages: Message[];
    metrics: NexusMetrics | null;
    settings: CompanySettings | null;
    onCreateTask: (input: any) => Promise<void>;
    onUpdateTask: (id: string, data: any) => Promise<void>;
    onDeleteTask: (id: string) => Promise<void>;
    onCreateProject: (input: any) => Promise<void>;
}

type MCTab = 'dashboard' | 'tasks' | 'pipeline' | 'calendar' | 'memory' | 'team';

export const MissionControl: React.FC<MissionControlProps> = ({
    agents, tasks, projects, messages, metrics, settings,
    onCreateTask, onUpdateTask, onDeleteTask, onCreateProject
}) => {
    const [activeTab, setActiveTab] = useState<MCTab>('dashboard');
    const [currentTime, setCurrentTime] = useState(new Date());

    const ceoName = settings?.ceoName || 'Nexus Admin';
    const accentColor = '#00ffaa';

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-end mb-10">
                            <div>
                                <h1 className="text-4xl font-extrabold mb-1 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent tracking-tight">
                                    Good {currentTime.getHours() < 12 ? 'morning' : currentTime.getHours() < 17 ? 'afternoon' : 'evening'}, {ceoName}
                                </h1>
                                <p className="text-[#8b949e] font-medium tracking-wide">
                                    COMMAND CENTER • <span className="text-[#00ffaa] shadow-[0_0_8px_#00ffaa44]">CONNECTED TO NEURAL GRID</span>
                                </p>
                            </div>
                            <div className="text-xl text-white/30 font-mono tracking-widest">{currentTime.toLocaleTimeString('en-US', { hour12: false })}</div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                            {[
                                { label: "System Health", val: "STABLE", trend: "All nodes active", color: accentColor },
                                { label: "Neural Load", val: `${agents.length}`, trend: "Active sub-agents", color: "#60a5fa" },
                                { label: "Task Queue", val: tasks.filter(t => t.status !== 'done').length, trend: "Awaiting execution", color: "#facc15" },
                                { label: "Archived Context", val: "4.2 GB", trend: "Memory bank size", color: "#c084fc" }
                            ].map((m, i) => (
                                <div key={i} className="bg-white/[0.03] border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group hover:bg-white/[0.05] transition-all duration-500">
                                    <div className="absolute top-0 left-0 right-0 h-1 opacity-40 bg-gradient-to-r from-transparent via-[var(--m-color)] to-transparent" style={{ '--m-color': m.color } as any}></div>
                                    <div className="flex justify-between text-[#8b949e] text-[10px] font-bold uppercase tracking-widest mb-3">
                                        {m.label}
                                    </div>
                                    <div className="text-4xl font-black mb-2 tracking-tighter text-white/90">{m.val}</div>
                                    <div className="text-[10px] text-white/30 font-medium">{m.trend}</div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center py-20">
                                <Layers size={48} className="text-[#00ffaa] mb-4 animate-pulse" />
                                <h3 className="text-xl font-bold text-white mb-2">Nexus Engine v4.2</h3>
                                <p className="text-sm text-white/40 max-w-sm">Global synchronization in progress. All mission control tools are now connected via the Satori Real-time Layer.</p>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                                <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-6">Recent Command Log</h3>
                                <div className="flex flex-col gap-4">
                                    {messages.slice(0, 5).map(m => (
                                        <div key={m.id} className="flex gap-4 items-start">
                                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-[#00ffaa]"></div>
                                            <div>
                                                <div className="text-xs font-bold text-white/70">{m.sender_type.toUpperCase()} EXECUTION</div>
                                                <div className="text-xs text-white/40 line-clamp-1 italic">"{m.content}"</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'tasks':
                return <TasksBoard currentAgent={null} agents={agents} />;
            case 'pipeline':
                return <ContentPipeline />;
            case 'calendar':
                return <CalendarView />;
            case 'memory':
                return <MemoryLog />;
            case 'team':
                return <TeamStructure />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden text-[#ffffff] bg-[#050508] p-4 lg:p-8" style={{ '--accent': accentColor } as React.CSSProperties}>
            {/* Glossy Header / Navigator */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-12 bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-2 rounded-[2rem] sticky top-0 z-50">
                <div className="flex items-center gap-4 px-6">
                    <div className="w-10 h-10 rounded-2xl bg-[#00ffaa] flex items-center justify-center text-black shadow-[0_0_20px_rgba(0,255,170,0.5)]">
                        <Layers size={22} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-black tracking-tighter uppercase leading-none">Mission Control</span>
                        <span className="text-[10px] text-[#00ffaa] font-bold tracking-widest leading-none">OPERATIONAL SUITE</span>
                    </div>
                </div>

                <nav className="flex items-center gap-1 overflow-x-auto max-w-full no-scrollbar px-2">
                    {[
                        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
                        { id: 'tasks', label: 'Tasks Board', icon: Layers },
                        { id: 'pipeline', label: 'Pipeline', icon: Video },
                        { id: 'calendar', label: 'Calendar', icon: Calendar },
                        { id: 'memory', label: 'Memory', icon: BookOpen },
                        { id: 'team', label: 'Team', icon: Users },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 group ${isActive ? 'bg-white/10 text-[#00ffaa] shadow-[inset_0_0_10px_rgba(255,255,255,0.05)] border border-white/10' : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'}`}
                            >
                                <Icon size={16} className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                                {tab.label.toUpperCase()}
                            </button>
                        );
                    })}
                </nav>

                <div className="hidden lg:flex items-center gap-6 px-6">
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#00ffaa]">
                            <div className="w-2 h-2 rounded-full bg-[#00ffaa] animate-pulse"></div>
                            ENCRYPTION ACTIVE
                        </div>
                        <div className="text-[9px] text-white/20 font-mono">NODE: AP-NE-1_SHARD-4</div>
                    </div>
                </div>
            </div>

            {/* Main Application Logic */}
            <main className="flex-1 overflow-hidden">
                {renderTabContent()}
            </main>
        </div>
    );
};
