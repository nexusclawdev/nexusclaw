import React from 'react';
import { Agent, Task } from '../types';
import AgentAvatar from './AgentAvatar';

interface TacticalGridProps {
    agents: Agent[];
    tasks: Task[];
}

const STATUS_Map: Record<string, { dot: string; label: string }> = {
    working: { dot: 'nexus-dot-working', label: 'Active' },
    idle: { dot: 'nexus-dot-online', label: 'Ready' },
    break: { dot: 'nexus-dot-offline', label: 'Break' },
    offline: { dot: 'nexus-dot-offline', label: 'Offline' },
    meeting: { dot: 'nexus-dot-working', label: 'Meeting' },
};

export const TacticalGrid: React.FC<TacticalGridProps> = ({ agents, tasks }) => {
    return (
        <div aria-label="Tactical Grid" className="nexus-panel flex flex-col h-auto">
            <div className="nexus-panel-header">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--nexus-text-primary)] text-sm tracking-wide">Agents Overview</span>
                </div>
                <div className="flex gap-4 text-xs font-medium text-[var(--nexus-text-secondary)]">
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[var(--nexus-success)]" />{agents.filter(a => a.status !== 'offline').length} Online</span>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[var(--nexus-accent)] animate-pulse" />{tasks.filter(t => t.status === 'in_progress').length} Active</span>
                </div>
            </div>

            <div className="p-5">
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
                    {agents.map((agent, idx) => {
                        const currentTask = tasks.find(t => t.id === agent.current_task_id);
                        const style = STATUS_Map[agent.status] || STATUS_Map.offline;
                        // Use actual DB fields: xp (total XP points), level, tasks_completed
                        const xpRaw = (agent as any).xp ?? (agent as any).stats_xp ?? 0;
                        const levelRaw = (agent as any).level ?? Math.floor(xpRaw / 100) + 1;
                        const tasksRaw = (agent as any).tasks_completed ?? (agent as any).stats_tasks_done ?? 0;
                        // XP progress within current level (each level needs 100 XP)
                        const xpInLevel = xpRaw % 100;
                        const xpPct = Math.min(xpInLevel, 100);
                        return (
                            <div key={agent.id} className="nexus-card p-5 animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                                <div className="flex items-start justify-between mb-5">
                                    <div className="flex gap-3 items-center">
                                        <AgentAvatar agent={agent} agents={agents} size={44} rounded="full" className="border-2 border-[var(--nexus-border)] shadow-sm" />
                                        <div>
                                            <div className="text-sm font-semibold text-[var(--nexus-text-primary)]">{agent.name}</div>
                                            <div className="text-[10px] text-[var(--nexus-text-muted)] font-medium uppercase tracking-widest mt-0.5">{agent.role.replace('_', ' ')}</div>
                                        </div>
                                    </div>
                                    <div className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${agent.status === 'working' ? 'border-[var(--nexus-accent)]/30 text-[var(--nexus-accent)] bg-[var(--nexus-accent)]/10 shadow-[0_0_8px_rgba(0,122,255,0.25)]'
                                        : agent.status === 'idle' ? 'border-[var(--nexus-success)]/30 text-[var(--nexus-success)] bg-[var(--nexus-success)]/10 shadow-[0_0_8px_rgba(34,197,94,0.25)]'
                                            : 'border-slate-700/50 text-slate-400 bg-[var(--nexus-surface-elevated)] shadow-none'
                                        }`}>
                                        <div className={`${style.dot} ${agent.status !== 'offline' ? 'animate-pulse' : ''}`} />
                                        {style.label}
                                    </div>
                                </div>

                                <div className="space-y-2 mb-5">
                                    <div className="text-[10px] font-medium text-[var(--nexus-text-muted)] uppercase tracking-wider">Current Task</div>
                                    <div className="p-3 bg-[var(--nexus-surface-elevated)] border border-[var(--nexus-border)] rounded-md text-xs text-[var(--nexus-text-secondary)] min-h-[44px] flex items-center shadow-inner">
                                        {currentTask ? currentTask.title : <span className="opacity-50">Awaiting assignment...</span>}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[var(--nexus-border)]">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-medium text-[var(--nexus-text-muted)] uppercase tracking-wider">Lv.{levelRaw} Progress</span>
                                        <span className="text-[10px] font-semibold text-[var(--nexus-text-primary)] tabular-nums">{xpPct}%</span>
                                    </div>
                                    <div className="nexus-meter">
                                        <div
                                            className="nexus-meter-fill"
                                            style={{ width: `${xpPct}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
