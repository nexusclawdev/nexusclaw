import React from 'react';
import { NexusMetrics } from '../types';

interface DepartmentAnalyticsProps {
    analytics: NexusMetrics['departmentAnalytics'];
}

const DEPT_COLORS: Record<string, { gradient: string; text: string }> = {
    planning: { gradient: 'from-blue-500 to-blue-600', text: 'text-blue-400' },
    development: { gradient: 'from-cyan-500 to-cyan-600', text: 'text-cyan-400' },
    design: { gradient: 'from-pink-500 to-rose-500', text: 'text-pink-400' },
    research: { gradient: 'from-amber-500 to-orange-500', text: 'text-amber-400' },
    operations: { gradient: 'from-emerald-500 to-green-600', text: 'text-emerald-400' },
};

export const DepartmentAnalytics: React.FC<DepartmentAnalyticsProps> = ({ analytics }) => {
    return (
        <div className="nexus-panel flex flex-col">
            <div className="nexus-panel-header">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/[0.08] flex items-center justify-center text-emerald-400">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
                        </svg>
                    </div>
                    <span className="font-bold text-slate-200 text-sm uppercase tracking-wider">Departments</span>
                </div>
            </div>

            <div className="p-3 space-y-2 custom-scrollbar overflow-y-auto">
                {analytics.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 opacity-30">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600 mb-2">
                            <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
                        </svg>
                        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">No departments active</p>
                    </div>
                )}
                {analytics.map((dept) => {
                    const colors = DEPT_COLORS[dept.id] || { gradient: 'from-cyan-500 to-blue-500', text: 'text-cyan-400' };
                    const loadPct = Math.min((dept.tasksActive / Math.max(dept.agentCount, 1)) * 100, 100);

                    return (
                        <div key={dept.id} className="group bg-white/[0.015] rounded-xl p-3.5 border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-xs font-black border border-white/[0.06] ${colors.text}`}>
                                        {dept.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-[12px] font-semibold text-slate-200">{dept.name}</div>
                                        <div className="text-[9px] text-slate-600 font-medium">{dept.agentCount} agents</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="nexus-badge-info text-[8px]">{dept.tasksActive} active</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-[8px] font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                                    <span>Workload</span>
                                    <span className="text-cyan-400 tabular-nums">{Math.round(loadPct)}%</span>
                                </div>
                                <div className="h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full transition-all duration-1000 ease-out`}
                                        style={{ width: `${loadPct}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
