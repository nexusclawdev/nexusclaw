import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../api';
import type { LeaderMetrics, LeaderProject, PipelinePhaseData } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';

// ── Phase Config ─────────────────────────────────────────────────────────────
const PHASES = ['research', 'validate', 'build', 'qa', 'deploy'] as const;
const PHASE_META: Record<string, { icon: string; label: string; color: string }> = {
    research: { icon: '🔬', label: 'Research', color: '#06b6d4' },
    validate: { icon: '✅', label: 'Validate', color: '#8b5cf6' },
    build: { icon: '⚒️', label: 'Build', color: '#f59e0b' },
    qa: { icon: '🧪', label: 'QA', color: '#10b981' },
    deploy: { icon: '🚀', label: 'Deploy', color: '#ec4899' },
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    completed: { label: 'Shipped', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    failed: { label: 'Failed', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    aborted: { label: 'Aborted', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function LeaderDashboard() {
    const [metrics, setMetrics] = useState<LeaderMetrics | null>(null);
    const [projects, setProjects] = useState<LeaderProject[]>([]);
    const [expandedProject, setExpandedProject] = useState<string | null>(null);
    const [projectDetail, setProjectDetail] = useState<any>(null);
    const [directive, setDirective] = useState('');
    const [launching, setLaunching] = useState(false);
    const [progressLog, setProgressLog] = useState<Array<{ ts: number; msg: string }>>([]);
    const logEndRef = useRef<HTMLDivElement>(null);
    const { on } = useWebSocket();

    // Fetch data
    const fetchData = useCallback(async () => {
        try {
            const [m, p] = await Promise.all([
                api.getLeaderMetrics(),
                api.getLeaderProjects(),
            ]);
            setMetrics(m);
            setProjects(p);
        } catch (err) {
            console.error('[LeaderDashboard] Fetch error:', err);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Real-time updates via WebSocket
    useEffect(() => {
        if (!on) return;
        const unsubs = [
            on('sheldon_progress', (payload: any) => {
                setProgressLog(prev => [...prev.slice(-99), { ts: Date.now(), msg: `[${payload.phase}] ${payload.message}` }]);
                fetchData(); // Refresh data on progress
            }),
            on('sheldon_project_launched', () => fetchData()),
            on('sheldon_project_aborted', () => fetchData()),
            on('agent_status', () => fetchData()),
        ];
        return () => unsubs.forEach(u => u());
    }, [on, fetchData]);

    // Auto-scroll progress log
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [progressLog]);

    // Launch a new project
    const handleLaunch = async () => {
        if (!directive.trim() || launching) return;
        setLaunching(true);
        try {
            const result = await api.launchLeaderProject(directive.trim());
            setProgressLog(prev => [...prev, { ts: Date.now(), msg: `🧠 ${result.message}` }]);
            setDirective('');
            fetchData();
        } catch (err) {
            setProgressLog(prev => [...prev, { ts: Date.now(), msg: `❌ Launch failed: ${err instanceof Error ? err.message : String(err)}` }]);
        } finally {
            setLaunching(false);
        }
    };

    // Expand project for one-pager
    const handleExpand = async (id: string) => {
        if (expandedProject === id) {
            setExpandedProject(null);
            setProjectDetail(null);
            return;
        }
        setExpandedProject(id);
        try {
            const detail = await api.getLeaderProject(id);
            setProjectDetail(detail);
        } catch {
            setProjectDetail(null);
        }
    };

    // Abort project
    const handleAbort = async (id: string) => {
        try {
            await api.abortLeaderProject(id);
            fetchData();
        } catch (err) {
            console.error('[LeaderDashboard] Abort failed:', err);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto custom-scrollbar">
            {/* ── HEADER ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center text-2xl border border-cyan-500/20">
                        🧠
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[var(--nexus-text-primary)] tracking-tight">
                            Sheldon Command Center
                        </h1>
                        <p className="text-xs text-[var(--nexus-text-muted)] mt-0.5">
                            Supreme Hierarchical Orchestration & Delegation Engine
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--nexus-surface-elevated)] border border-[var(--nexus-border)] text-[var(--nexus-text-secondary)] hover:text-[var(--nexus-text-primary)] transition-all"
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {/* ── METRIC CARDS ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Active Pipelines', value: metrics?.activeProjects ?? 0, icon: '⚡', gradient: 'from-cyan-500/10 to-cyan-600/5', border: 'border-cyan-500/20', text: 'text-cyan-400' },
                    { label: 'Shipped Apps', value: metrics?.shippedApps ?? 0, icon: '🚀', gradient: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
                    { label: 'In Queue', value: metrics?.queueLength ?? 0, icon: '📋', gradient: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-500/20', text: 'text-amber-400' },
                    { label: 'Attention Needed', value: metrics?.attentionNeeded ?? 0, icon: '⚠️', gradient: 'from-red-500/10 to-red-600/5', border: 'border-red-500/20', text: 'text-red-400' },
                ].map(card => (
                    <div key={card.label} className={`rounded-xl p-5 bg-gradient-to-br ${card.gradient} border ${card.border} transition-all hover:scale-[1.02]`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl">{card.icon}</span>
                        </div>
                        <div className={`text-3xl font-bold tracking-tight tabular-nums ${card.text}`}>
                            {card.value}
                        </div>
                        <div className="text-[11px] font-medium text-[var(--nexus-text-muted)] mt-1 uppercase tracking-wider">
                            {card.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── LAUNCH PANEL ── */}
            <div className="rounded-xl border border-[var(--nexus-border)] bg-[var(--nexus-surface)] p-5">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🎯</span>
                    <h2 className="text-sm font-bold text-[var(--nexus-text-primary)] uppercase tracking-wider">
                        CEO Directive
                    </h2>
                </div>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={directive}
                        onChange={(e) => setDirective(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLaunch()}
                        placeholder="Build a SaaS todo app with auth, dark mode, and Stripe billing..."
                        className="flex-1 rounded-lg px-4 py-3 bg-[var(--nexus-bg)] border border-[var(--nexus-border)] text-[var(--nexus-text-primary)] text-sm placeholder:text-[var(--nexus-text-muted)] focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                    />
                    <button
                        onClick={handleLaunch}
                        disabled={!directive.trim() || launching}
                        className="px-6 py-3 rounded-lg font-bold text-sm bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20"
                    >
                        {launching ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Launching...
                            </span>
                        ) : '🚀 Launch Pipeline'}
                    </button>
                </div>
            </div>

            {/* ── PIPELINE PROJECTS ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg">📦</span>
                    <h2 className="text-sm font-bold text-[var(--nexus-text-primary)] uppercase tracking-wider">
                        Pipeline Projects ({projects.length})
                    </h2>
                </div>

                {projects.length === 0 && (
                    <div className="rounded-xl border border-dashed border-[var(--nexus-border)] p-12 text-center">
                        <div className="text-4xl mb-3">🧠</div>
                        <div className="text-sm text-[var(--nexus-text-muted)]">
                            No projects yet. Enter a directive above and let Sheldon take over.
                        </div>
                    </div>
                )}

                {projects.map(project => (
                    <div key={project.id} className="rounded-xl border border-[var(--nexus-border)] bg-[var(--nexus-surface)] overflow-hidden transition-all">
                        {/* Project Header */}
                        <div
                            className="p-4 cursor-pointer hover:bg-[var(--nexus-surface-elevated)] transition-all"
                            onClick={() => handleExpand(project.id)}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${STATUS_BADGE[project.status]?.className || 'bg-zinc-800 text-zinc-400'}`}>
                                        {STATUS_BADGE[project.status]?.label || project.status}
                                    </div>
                                    <span className="text-sm font-semibold text-[var(--nexus-text-primary)] truncate">
                                        {project.directive}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {project.qualityScore > 0 && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-[var(--nexus-text-muted)]">Quality</span>
                                            <span className={`text-sm font-bold tabular-nums ${project.qualityScore >= 7 ? 'text-emerald-400' : project.qualityScore >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                                                {project.qualityScore}/10
                                            </span>
                                        </div>
                                    )}
                                    {project.status === 'active' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAbort(project.id); }}
                                            className="px-2 py-1 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                                        >
                                            ABORT
                                        </button>
                                    )}
                                    <span className="text-[var(--nexus-text-muted)] text-xs">{expandedProject === project.id ? '▲' : '▼'}</span>
                                </div>
                            </div>

                            {/* Phase Stepper */}
                            <div className="flex items-center gap-1">
                                {PHASES.map((phase, i) => {
                                    const phaseData = project.phases[phase];
                                    const meta = PHASE_META[phase];
                                    const isActive = project.phase === phase && project.status === 'active';
                                    const isDone = phaseData?.status === 'done';
                                    const isFailed = phaseData?.status === 'failed';

                                    return (
                                        <div key={phase} className="flex items-center flex-1">
                                            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all w-full justify-center
                        ${isDone ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                    : isFailed ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                                                        : isActive ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 animate-pulse'
                                                            : 'bg-zinc-800/50 text-zinc-600 border border-zinc-700/30'}`}
                                            >
                                                <span>{isDone ? '✓' : isFailed ? '✗' : meta.icon}</span>
                                                <span className="hidden sm:inline">{meta.label}</span>
                                            </div>
                                            {i < PHASES.length - 1 && (
                                                <div className={`w-4 h-[2px] mx-0.5 shrink-0 ${isDone ? 'bg-emerald-500/40' : 'bg-zinc-700/40'}`} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Expanded One-Pager */}
                        {expandedProject === project.id && (
                            <div className="border-t border-[var(--nexus-border)] p-5 bg-[var(--nexus-bg)] space-y-4 animate-in">
                                {projectDetail ? (
                                    <>
                                        {/* Progress bar */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-bold text-[var(--nexus-text-muted)] uppercase tracking-wider">Progress</span>
                                                <span className="text-xs font-bold text-cyan-400 tabular-nums">{projectDetail.progress}%</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
                                                    style={{ width: `${projectDetail.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Phase Results */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {PHASES.map(phase => {
                                                const phaseData = project.phases[phase] as PipelinePhaseData | undefined;
                                                if (!phaseData || phaseData.status === 'pending') return null;
                                                const onePagerData = projectDetail.onePager?.[phase];
                                                const meta = PHASE_META[phase];

                                                return (
                                                    <div key={phase} className="rounded-lg border border-[var(--nexus-border)] bg-[var(--nexus-surface)] p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <span>{meta.icon}</span>
                                                            <span className="text-xs font-bold text-[var(--nexus-text-primary)] uppercase tracking-wider">{meta.label}</span>
                                                            {phaseData.duration > 0 && (
                                                                <span className="ml-auto text-[10px] text-[var(--nexus-text-muted)] tabular-nums">
                                                                    {(phaseData.duration / 1000).toFixed(1)}s
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-[var(--nexus-text-secondary)] leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
                                                            {onePagerData ? (
                                                                <OnePagerSection data={onePagerData} />
                                                            ) : phaseData.status === 'running' ? (
                                                                <span className="text-cyan-400 animate-pulse">Processing...</span>
                                                            ) : (
                                                                <span className="text-zinc-600">No data</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-6 text-[var(--nexus-text-muted)]">
                                        <span className="animate-pulse">Loading project details...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ── LIVE PROGRESS LOG ── */}
            {progressLog.length > 0 && (
                <div className="rounded-xl border border-[var(--nexus-border)] bg-[var(--nexus-surface)]">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--nexus-border)]">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            <span className="text-xs font-bold text-[var(--nexus-text-primary)] uppercase tracking-wider">Live Progress</span>
                        </div>
                        <button
                            onClick={() => setProgressLog([])}
                            className="text-[10px] text-[var(--nexus-text-muted)] hover:text-[var(--nexus-text-primary)] transition-all"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-3 space-y-1 custom-scrollbar font-mono">
                        {progressLog.map((entry, i) => (
                            <div key={i} className="text-[11px] text-[var(--nexus-text-secondary)] leading-relaxed">
                                <span className="text-[var(--nexus-text-muted)] tabular-nums mr-2">
                                    {new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                {entry.msg}
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ── One-Pager Section Renderer ───────────────────────────────────────────────
function OnePagerSection({ data }: { data: any }) {
    if (!data) return null;

    // Handle raw string output
    if (typeof data === 'string') {
        return <pre className="whitespace-pre-wrap text-[11px] break-words">{data.slice(0, 500)}</pre>;
    }
    if (data.raw) {
        return <pre className="whitespace-pre-wrap text-[11px] break-words">{String(data.raw).slice(0, 500)}</pre>;
    }

    // Render structured data
    const renderValue = (val: unknown): string => {
        if (val === null || val === undefined) return '-';
        if (typeof val === 'string') return val;
        if (typeof val === 'number') return String(val);
        if (typeof val === 'boolean') return val ? '✓' : '✗';
        if (Array.isArray(val)) return val.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ');
        return JSON.stringify(val);
    };

    const entries = Object.entries(data).filter(([k]) => !k.startsWith('_'));

    return (
        <div className="space-y-1.5">
            {entries.slice(0, 10).map(([key, value]) => (
                <div key={key}>
                    <span className="text-[10px] font-semibold text-[var(--nexus-text-muted)] uppercase">{key.replace(/_/g, ' ')}:</span>
                    <div className="text-[11px] text-[var(--nexus-text-secondary)] mt-0.5 break-words">
                        {renderValue(value)}
                    </div>
                </div>
            ))}
            {data._quality_score && (
                <div className="mt-2 pt-2 border-t border-[var(--nexus-border)]">
                    <span className="text-[10px] font-semibold text-[var(--nexus-text-muted)]">Quality: </span>
                    <span className={`text-xs font-bold ${data._quality_score >= 7 ? 'text-emerald-400' : data._quality_score >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                        {data._quality_score}/10
                    </span>
                </div>
            )}
        </div>
    );
}
