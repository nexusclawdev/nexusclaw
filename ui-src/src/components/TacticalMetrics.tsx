import React from 'react';
import { NexusMetrics } from '../types';

interface TacticalMetricsProps {
    metrics: NexusMetrics | null;
}

const IconCpu = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" /></svg>;
const IconUsers = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const IconZap = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>;
const IconShield = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>;

const METRICS_CONFIG = [
    { key: 'load', label: 'System Load', Icon: IconCpu },
    { key: 'agents', label: 'Active Units', Icon: IconUsers },
    { key: 'exp', label: 'Experience', Icon: IconZap },
    { key: 'uptime', label: 'System Status', Icon: IconShield },
];

export const TacticalMetrics: React.FC<TacticalMetricsProps> = ({ metrics }) => {
    if (!metrics) return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 hover:cursor-default">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[120px] bg-[var(--nexus-surface)] rounded-xl border border-[var(--nexus-border)] animate-pulse" />
            ))}
        </div>
    );

    const loadPct = Math.round((metrics.completedTasks / (metrics.totalTasks || 1)) * 100);

    const values = [
        { value: `${loadPct}%`, sub: `${metrics.completedTasks}/${metrics.totalTasks} Tasks`, progress: loadPct },
        { value: metrics.activeAgents.toString(), sub: 'Operational Units', progress: 100 },
        { value: metrics.totalExperience.toLocaleString(), sub: 'Total XP', progress: undefined },
        { value: '99.9%', sub: 'System Uptime', progress: 99.9 },
    ];

    return (
        <div aria-label="Tactical Metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {METRICS_CONFIG.map((cfg, i) => {
                const v = values[i];
                return (
                    <div key={cfg.key} className="nexus-card flex flex-col justify-between animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-medium text-[var(--nexus-text-secondary)] uppercase tracking-wider">{cfg.label}</span>
                            <div className="text-[var(--nexus-text-muted)]">
                                <cfg.Icon />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-semibold tracking-tight text-[var(--nexus-text-primary)]">{v.value}</span>
                            </div>
                            <span className="text-[11px] font-medium text-[var(--nexus-text-muted)] uppercase tracking-widest mt-1 block">{v.sub}</span>
                        </div>

                        {v.progress !== undefined && (
                            <div className="mt-4">
                                <div className="nexus-meter">
                                    <div
                                        className="nexus-meter-fill"
                                        style={{ width: `${v.progress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
