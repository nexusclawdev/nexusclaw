import React, { useState, useEffect } from 'react';
import { Search, Layers, Calendar, Edit3, Plus, X } from 'lucide-react';
import type { Agent, Task, Project, Message, NexusMetrics, CompanySettings } from '../types';

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

interface Priority {
    id: string;
    text: string;
    completed: boolean;
}

interface MCState {
    priorities: Priority[];
    notes: string;
}

const DEFAULT_STATE: MCState = {
    priorities: [
        { id: 'p1', text: 'Review Architecture Plan', completed: false }
    ],
    notes: '# Daily Scratchpad\n\nStart typing...'
};

export const MissionControl: React.FC<MissionControlProps> = ({
    agents, tasks, projects, messages, metrics, settings,
    onCreateTask, onUpdateTask, onDeleteTask, onCreateProject
}) => {
    const [state, setState] = useState<MCState>(DEFAULT_STATE);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'timeline' | 'notes'>('dashboard');
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [addingToColumn, setAddingToColumn] = useState<'inbox' | 'planned' | 'in_progress' | 'done' | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    // Use settings or fallback to defaults
    const ceoName = settings?.ceoName || 'Nexus Admin';
    const companyName = settings?.companyName || 'NexusClaw';
    const accentColor = '#00ffaa';
    const mainGoal = 'Achieve AGI Sandbox';
    const goalDeadline = '2026-12-31';

    useEffect(() => {
        fetchState();
    }, []);

    const fetchState = async () => {
        try {
            const res = await fetch('http://localhost:3100/api/mission-control');
            const data = await res.json();
            if (data.state) {
                setState(prev => ({ ...prev, ...data.state }));
            }
        } catch (error) {
            console.error('Failed to load Mission Control state:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveState = async (newState: MCState) => {
        setSaveStatus('saving');
        try {
            await fetch('http://localhost:3100/api/mission-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: newState })
            });
            setSaveStatus('saved');
        } catch (error) {
            console.error('Failed to save state:', error);
            setSaveStatus('error');
        }
    };

    const updateState = (updater: (prev: MCState) => MCState) => {
        setState(prev => {
            const next = updater(prev);
            saveState(next);
            return next;
        });
    };

    // Derived Metrics linking internal NexusClaw tasks with MissionControl tasks
    const activeProjectsCount = projects.length;
    const tasksTodayCount = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length;
    const completedTasksCount = metrics?.completedTasks || tasks.filter(t => t.status === 'done').length;

    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const daysToDeadline = Math.ceil(Math.abs(new Date(goalDeadline).getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));

    if (loading) {
        return <div className="flex items-center justify-center h-full text-[#8b949e]">Initializing Mission Control Sandbox...</div>;
    }

    return (
        <div className="flex flex-col h-full overflow-hidden text-[#ffffff] bg-[#050508]" style={{ '--accent': accentColor } as React.CSSProperties}>
            {/* Header */}
            <header className="flex justify-between items-center p-4 border-b border-white/5 bg-white/5 backdrop-blur-md z-10 sticky top-0">
                <div className="flex items-center gap-2 font-bold text-lg">
                    <span style={{ color: accentColor }}>⬡</span> Mission<span>Control</span>
                </div>

                <nav className="flex gap-2">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: Layers },
                        { id: 'projects', label: 'Projects', icon: Layers },
                        { id: 'timeline', label: 'Timeline', icon: Calendar },
                        { id: 'notes', label: 'Notes', icon: Edit3 }
                    ].map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-[#00ffaa]/10 text-[#00ffaa]' : 'text-[#8b949e] hover:text-white hover:bg-white/5'}`}
                            >
                                <Icon size={16} /> {tab.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={14} />
                        <input
                            type="text"
                            placeholder="Search system... (⌘K)"
                            className="bg-black/30 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-[#00ffaa] transition-all w-64"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#8b949e]">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}></div>
                        {saveStatus === 'saving' ? 'Syncing...' : 'Online'}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-8 max-w-[1600px] mx-auto w-full">

                {activeTab === 'dashboard' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-end mb-10">
                            <div>
                                <h1 className="text-3xl font-bold mb-1">Good {currentTime.getHours() < 12 ? 'morning' : currentTime.getHours() < 17 ? 'afternoon' : 'evening'}, {ceoName}</h1>
                                <p className="text-[#8b949e]">Primary Objective: <span className="text-white font-medium">{mainGoal}</span> by <span>{new Date(goalDeadline).toLocaleDateString()}</span></p>
                            </div>
                            <div className="text-xl text-[#8b949e] font-mono">{currentTime.toLocaleTimeString('en-US', { hour12: false })}</div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                            {[
                                { label: "Success Rate", val: metrics ? `${Math.round((metrics.completedTasks / (metrics.totalTasks || 1)) * 100)}%` : "0%", trend: "Efficiency score", color: accentColor },
                                { label: "Active Projects", val: activeProjectsCount, trend: "Currently in rotation", color: "#60a5fa" },
                                { label: "Tasks Open", val: tasksTodayCount, trend: "Awaiting execution", color: "#facc15" },
                                { label: "Completed", val: completedTasksCount, trend: "Historical milestones", color: "#2dd4bf" }
                            ].map((m, i) => (
                                <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-xl relative overflow-hidden group hover:-translate-y-1 transition-transform">
                                    <div className="absolute top-0 left-0 right-0 h-1 opacity-80" style={{ backgroundColor: m.color }}></div>
                                    <div className="flex justify-between text-[#8b949e] text-sm font-medium mb-3">
                                        {m.label}
                                    </div>
                                    <div className="text-4xl font-bold mb-2 tracking-tight">{m.val}</div>
                                    <div className="text-xs text-[#8b949e]">{m.trend}</div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Priorities */}
                            <div className="lg:col-span-2 bg-white/5 border border-white/5 rounded-xl p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-semibold">Top Priorities</h3>
                                    <span className="text-sm text-[#8b949e]">Must do today</span>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {state.priorities.map(p => (
                                        <div key={p.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-transparent hover:border-white/10 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={p.completed}
                                                onChange={() => updateState(s => ({ ...s, priorities: s.priorities.map(x => x.id === p.id ? { ...x, completed: !x.completed } : x) }))}
                                                className="w-5 h-5 rounded border border-[#8b949e] appearance-none checked:bg-[#00ffaa] cursor-pointer"
                                            />
                                            <input
                                                value={p.text}
                                                onChange={e => updateState(s => ({ ...s, priorities: s.priorities.map(x => x.id === p.id ? { ...x, text: e.target.value } : x) }))}
                                                className={`flex-1 bg-transparent border-none outline-none ${p.completed ? 'line-through opacity-50' : ''}`}
                                            />
                                            <button
                                                onClick={() => updateState(s => ({ ...s, priorities: s.priorities.filter(x => x.id !== p.id) }))}
                                                className="text-[#8b949e] hover:text-red-400"
                                            ><X size={16} /></button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => updateState(s => ({ ...s, priorities: [...s.priorities, { id: 'p' + Date.now(), text: '', completed: false }] }))}
                                        className="mt-2 w-full py-3 border border-dashed border-white/10 rounded-lg text-[#8b949e] flex items-center justify-center gap-2 hover:bg-[#00ffaa]/10 hover:border-[#00ffaa] hover:text-[#00ffaa] transition-all"
                                    >
                                        <Plus size={16} /> Add Priority
                                    </button>
                                </div>
                            </div>

                            {/* Activity Feed */}
                            <div className="bg-white/5 border border-white/5 rounded-xl p-6">
                                <h3 className="text-lg font-semibold mb-6">System Log</h3>
                                <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {messages.slice(0, 20).map(msg => (
                                        <div key={msg.id} className="border-l-2 border-white/10 pl-4 py-1 hover:border-[#00ffaa] transition-colors group">
                                            <div className="text-xs text-[#8b949e] uppercase tracking-wider mb-1 flex justify-between">
                                                <span>{msg.sender_type}</span>
                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="text-sm text-slate-200 line-clamp-2">{msg.content}</div>
                                        </div>
                                    ))}
                                    {messages.length === 0 && <div className="text-sm text-[#8b949e]">No recent activity...</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'projects' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                        <h2 className="text-2xl font-bold mb-8">Task Operations</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 min-h-0">
                            {(['inbox', 'planned', 'in_progress', 'done'] as const).map(col => (
                                <div key={col} className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col">
                                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                                        <span className="font-semibold capitalize text-sm">{col.replace('_', ' ')}</span>
                                        <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] text-[#8b949e]">
                                            {tasks.filter(t => t.status === col).length}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
                                        {tasks.filter(t => t.status === col).map(task => (
                                            <div key={task.id} className="bg-white/5 border border-white/5 p-4 rounded-lg group hover:border-white/20 transition-all cursor-move active:scale-95">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${task.priority >= 3 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : task.priority >= 2 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                                        P{task.priority}
                                                    </span>
                                                    <button
                                                        onClick={() => onDeleteTask(task.id)}
                                                        className="text-[#8b949e] opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                                                    ><X size={14} /></button>
                                                </div>
                                                <div className="font-medium mb-1 text-sm text-slate-100 truncate">{task.title}</div>
                                                <div className="text-[#8b949e] text-xs mb-3 line-clamp-2 leading-relaxed">{task.description || "No description provided."}</div>
                                                <div className="flex justify-between items-center text-[#8b949e] text-[10px] pt-2 border-t border-white/5">
                                                    <div className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#00ffaa]"></span>
                                                        {task.id.slice(-4).toUpperCase()}
                                                    </div>
                                                    <span>{new Date(task.updated_at).toLocaleDateString()}</span>
                                                </div>

                                                {/* Status mover shortcuts */}
                                                <div className="mt-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {['inbox', 'planned', 'in_progress', 'done'].filter(s => s !== col).map(targetStatus => (
                                                        <button
                                                            key={targetStatus}
                                                            onClick={() => onUpdateTask(task.id, { status: targetStatus })}
                                                            className="flex-1 bg-white/5 hover:bg-white/10 text-[9px] py-1 rounded border border-white/5 transition-colors capitalize"
                                                        >
                                                            {targetStatus.split('_')[0]}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {addingToColumn === col ? (
                                            <div className="flex flex-col gap-2 p-3 bg-white/5 border border-[#00ffaa]/30 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={newTaskTitle}
                                                    onChange={e => setNewTaskTitle(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Escape') {
                                                            setAddingToColumn(null);
                                                            setNewTaskTitle('');
                                                        } else if (e.key === 'Enter' && newTaskTitle.trim()) {
                                                            onCreateTask({ title: newTaskTitle.trim(), status: col });
                                                            setAddingToColumn(null);
                                                            setNewTaskTitle('');
                                                        }
                                                    }}
                                                    placeholder="Task title..."
                                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#00ffaa] text-white"
                                                />
                                                <div className="flex justify-end gap-2 mt-1">
                                                    <button
                                                        onClick={() => {
                                                            setAddingToColumn(null);
                                                            setNewTaskTitle('');
                                                        }}
                                                        className="text-xs text-[#8b949e] hover:text-white px-2 py-1"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (newTaskTitle.trim()) {
                                                                onCreateTask({ title: newTaskTitle.trim(), status: col });
                                                                setAddingToColumn(null);
                                                                setNewTaskTitle('');
                                                            }
                                                        }}
                                                        className="bg-[#00ffaa]/20 text-[#00ffaa] hover:bg-[#00ffaa]/30 px-3 py-1 rounded text-xs font-medium transition-colors"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setAddingToColumn(col)}
                                                className="w-full py-2 border border-dashed border-white/10 rounded text-sm text-[#8b949e] hover:bg-white/5 hover:text-white transition-colors"
                                            >
                                                + Add Task
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
                        <h2 className="text-2xl font-bold mb-2">Strategic Roadmap</h2>
                        <p className="text-[#8b949e] mb-12">Path to {mainGoal}</p>

                        <div className="relative border-l-2 border-white/10 pl-8 ml-4">
                            {[
                                { date: 'Phase 1 - Q1', title: 'Foundation & Setup', status: 'done', ms: [{ t: 'Infrastructure provisioning', d: true }, { t: 'Core API design', d: true }] },
                                { date: 'Phase 2 - Q2', title: 'Beta Development', status: 'active', ms: [{ t: 'Frontend MVP integration', d: true }, { t: 'User testing cohort A', d: false }, { t: 'Security Audit', d: false }] },
                                { date: 'Phase 3 - Q3', title: 'Platform Launch', status: 'pending', ms: [{ t: 'Scale databases', d: false }, { t: 'Public marketing push', d: false }] }
                            ].map((phase, i) => (
                                <div key={i} className="mb-10 relative">
                                    <div className={`absolute -left-[39px] top-1 w-4 h-4 rounded-full border-2 bg-[#050508] ${phase.status === 'active' ? 'border-[#00ffaa] shadow-[0_0_10px_rgba(0,255,170,0.5)] bg-[#00ffaa]' : 'border-[#8b949e]'}`}></div>
                                    <div className={`bg-white/5 border rounded-xl p-6 ${phase.status === 'active' ? 'border-[#00ffaa]/40 shadow-[0_0_20px_rgba(0,255,170,0.1)]' : 'border-white/5'}`}>
                                        <div className="text-[#00ffaa] text-xs font-bold uppercase tracking-wider mb-2">{phase.date}</div>
                                        <div className="text-lg font-bold mb-4">{phase.title}</div>
                                        <ul className="flex flex-col gap-2">
                                            {phase.ms.map((m, j) => (
                                                <li key={j} className={`flex items-start gap-2 text-sm ${m.d ? 'text-[#8b949e] line-through' : 'text-white'}`}>
                                                    <span className={m.d ? 'text-[#00ffaa] no-underline' : 'text-[#8b949e] mt-0.5 text-xs'}>{m.d ? '✓' : '○'}</span>
                                                    <span>{m.t}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                        <div className="flex justify-between items-end mb-6">
                            <h2 className="text-2xl font-bold">Scratchpad</h2>
                            <div className="flex gap-4 text-sm text-[#8b949e]">
                                <span>{state.notes.length} characters</span>
                                <span>{saveStatus === 'saving' ? 'Saving...' : 'All changes saved.'}</span>
                            </div>
                        </div>
                        <textarea
                            value={state.notes}
                            onChange={(e) => updateState(s => ({ ...s, notes: e.target.value }))}
                            className="flex-1 bg-black/20 border border-white/5 rounded-xl p-6 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:border-white/20 transition-colors w-full"
                            placeholder="Start typing... Auto-saves on every keystroke."
                        />
                    </div>
                )}
            </main>
        </div>
    );
};
