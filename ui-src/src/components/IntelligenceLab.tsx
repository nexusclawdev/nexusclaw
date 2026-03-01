/**
 * Nexus Intelligence Lab
 * Premium dashboard section for Time-Travel Debugging and Skill Fusion monitoring.
 * All interactions call real backend API endpoints with proper error handling.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../api";
import type { Timeline, TimelineEvent, SkillTransfer, FusionSession, Agent } from "../types";
import {
    History, Zap, Clock, Play, Rewind, GitFork, Cpu, Share2,
    Search, Activity, AlertCircle, ChevronRight, RefreshCw, CheckCircle,
    X, Info
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Toast = { id: string; message: string; type: "success" | "error" | "info" };

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeJson<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; }
    catch { return fallback; }
}

function classifyEvent(type: string): "llm" | "tool" | "error" | "other" {
    if (type === "llm_call" || type === "llm_response") return "llm";
    if (type === "tool_call" || type === "tool_result") return "tool";
    if (type === "error" || type === "security_block") return "error";
    return "other";
}

function getEventIcon(type: string) {
    switch (type) {
        case "llm_call": return <Cpu className="w-4 h-4" />;
        case "llm_response": return <Zap className="w-4 h-4" />;
        case "tool_call": return <Play className="w-4 h-4" />;
        case "tool_result": return <CheckCircle className="w-4 h-4" />;
        case "error": return <AlertCircle className="w-4 h-4" />;
        case "security_block": return <AlertCircle className="w-4 h-4" />;
        case "state_snapshot": return <Clock className="w-4 h-4" />;
        case "fork": return <GitFork className="w-4 h-4" />;
        default: return <Activity className="w-4 h-4" />;
    }
}

function colorForEventClass(cls: ReturnType<typeof classifyEvent>) {
    switch (cls) {
        case "llm": return "border-cyan-500/40 text-cyan-400";
        case "tool": return "border-amber-500/40 text-amber-400";
        case "error": return "border-red-500/40 text-red-400";
        default: return "border-slate-500/40 text-slate-400";
    }
}

function renderData(val: unknown): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val.slice(0, 1000);
    return JSON.stringify(val, null, 2)?.slice(0, 2000) ?? '';
}

// ── Toast Component ──────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
    return (
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold border shadow-2xl backdrop-blur-xl animate-in slide-in-from-right ${t.type === "success" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" :
                        t.type === "error" ? "bg-red-500/20 border-red-500/30 text-red-300" :
                            "bg-cyan-500/20 border-cyan-500/30 text-cyan-300"
                        }`}
                >
                    {t.type === "success" && <CheckCircle className="w-4 h-4" />}
                    {t.type === "error" && <AlertCircle className="w-4 h-4" />}
                    {t.type === "info" && <Info className="w-4 h-4" />}
                    <span>{t.message}</span>
                    <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
                </div>
            ))}
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function IntelligenceLab({ agents }: { agents: Agent[] }) {
    const [activeTab, setActiveTab] = useState<"time-travel" | "skill-fusion">("time-travel");
    const [timelines, setTimelines] = useState<Timeline[]>([]);
    const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null);
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [fusionStatus, setFusionStatus] = useState<{
        activeTransfers: SkillTransfer[];
        activeSessions: FusionSession[];
    }>({ activeTransfers: [], activeSessions: [] });

    const [loadingEvents, setLoadingEvents] = useState(false);
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [replayMode, setReplayMode] = useState(false);
    const [replayEvents, setReplayEvents] = useState<TimelineEvent[]>([]);
    const [replayIndex, setReplayIndex] = useState(0);
    const replayTimer = useRef<number | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const toast = useCallback((message: string, type: Toast["type"] = "info") => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        setToasts(p => [...p, { id, message, type }]);
        setTimeout(() => {
            if (mountedRef.current) setToasts(p => p.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const dismissToast = useCallback((id: string) => setToasts(p => p.filter(t => t.id !== id)), []);

    const fetchData = useCallback(async () => {
        try {
            if (activeTab === "time-travel") {
                const tl = await api.getTimelines(30);
                if (mountedRef.current) setTimelines(Array.isArray(tl) ? tl : []);
            } else {
                const status = await api.getSkillFusionStatus();
                if (mountedRef.current) setFusionStatus({
                    activeTransfers: Array.isArray(status.activeTransfers) ? status.activeTransfers : [],
                    activeSessions: Array.isArray(status.activeSessions) ? status.activeSessions : [],
                });
            }
        } catch (e) {
            // Don't crash on network errors
        }
    }, [activeTab]);

    useEffect(() => {
        fetchData();
        const iv = setInterval(fetchData, 5000);
        return () => clearInterval(iv);
    }, [fetchData]);

    const handleSelectTimeline = useCallback(async (tl: Timeline) => {
        setLoadingEvents(true);
        setSelectedTimeline(tl);
        setEvents([]);
        setReplayMode(false);
        try {
            const evs = await api.getTimelineEvents(tl.id, 200);
            if (mountedRef.current) setEvents(Array.isArray(evs) ? evs : []);
        } catch {
            if (mountedRef.current) toast("Failed to load timeline events.", "error");
        } finally {
            if (mountedRef.current) setLoadingEvents(false);
        }
    }, [toast]);

    // ── Action: Fork ─────────────────────────────────────────────────────────
    const handleFork = useCallback(async (ev: TimelineEvent) => {
        if (!selectedTimeline || actionInProgress) return;
        setActionInProgress("fork");
        try {
            const result = await api.forkTimeline(selectedTimeline.id, ev.sequence, `Fork from event #${ev.sequence}`);
            toast(`✅ Forked at event #${ev.sequence} → new session: ${result.timeline_id}`, "success");
            await fetchData(); // Refresh timeline list
        } catch (e) {
            toast(`Fork failed: ${e instanceof Error ? e.message : "Unknown error"}`, "error");
        } finally {
            if (mountedRef.current) setActionInProgress(null);
        }
    }, [selectedTimeline, actionInProgress, toast, fetchData]);

    // ── Action: Rewind ────────────────────────────────────────────────────────
    const handleRewind = useCallback(async (ev: TimelineEvent) => {
        if (!selectedTimeline || actionInProgress) return;
        setActionInProgress("rewind");
        try {
            await api.rewindTimeline(selectedTimeline.id, ev.sequence);
            const refreshed = events.slice(0, ev.sequence);
            setEvents(refreshed);
            setSelectedTimeline(p => p ? { ...p, status: "rewound", event_count: ev.sequence } : p);
            toast(`⏪ Rewound to event #${ev.sequence}`, "success");
        } catch (e) {
            toast(`Rewind failed: ${e instanceof Error ? e.message : "Unknown error"}`, "error");
        } finally {
            if (mountedRef.current) setActionInProgress(null);
        }
    }, [selectedTimeline, actionInProgress, events, toast]);

    // ── Action: Global Rewind ─────────────────────────────────────────────────
    const handleGlobalRewind = useCallback(async () => {
        if (!selectedTimeline || actionInProgress) return;
        setActionInProgress("global-rewind");
        try {
            await api.rewindTimeline(selectedTimeline.id, 0);
            setEvents([]);
            setSelectedTimeline(p => p ? { ...p, status: "rewound", event_count: 0 } : p);
            toast("⏪ Full rewind to session start.", "success");
        } catch (e) {
            toast(`Rewind failed: ${e instanceof Error ? e.message : "Unknown error"}`, "error");
        } finally {
            if (mountedRef.current) setActionInProgress(null);
        }
    }, [selectedTimeline, actionInProgress, toast]);

    // ── Action: Replay ────────────────────────────────────────────────────────
    const handleReplay = useCallback(async (ev?: TimelineEvent) => {
        if (!selectedTimeline || actionInProgress) return;
        setActionInProgress("replay");
        try {
            const result = await api.replayTimeline(selectedTimeline.id, 1, ev?.sequence);
            if (!mountedRef.current) return;
            setReplayEvents(Array.isArray(result.replay?.events) ? result.replay.events : []);
            setReplayIndex(0);
            setReplayMode(true);
            toast("▶ Replay started. Events will animate.", "info");
            // Animate replay
            let i = 0;
            const step = () => {
                if (!mountedRef.current) return;
                i++;
                setReplayIndex(i);
                if (i < (result.replay?.events?.length ?? 0)) {
                    replayTimer.current = window.setTimeout(step, 400);
                }
            };
            replayTimer.current = window.setTimeout(step, 400);
        } catch (e) {
            toast(`Replay failed: ${e instanceof Error ? e.message : "Unknown error"}`, "error");
        } finally {
            if (mountedRef.current) setActionInProgress(null);
        }
    }, [selectedTimeline, actionInProgress, toast]);

    const stopReplay = useCallback(() => {
        if (replayTimer.current) clearTimeout(replayTimer.current);
        setReplayMode(false);
    }, []);

    // Filtered timelines
    const filteredTimelines = timelines.filter(tl =>
        !search || tl.id.includes(search) || tl.agent_id.includes(search) || tl.model?.includes(search)
    );

    const agentName = useCallback((id: string) =>
        agents.find(a => a.id === id)?.name || id, [agents]);

    const agentEmoji = useCallback((id: string) =>
        agents.find(a => a.id === id)?.avatar_emoji || "🤖", [agents]);

    const displayEvents = replayMode ? replayEvents.slice(0, replayIndex + 1) : events;

    return (
        <div className="flex flex-col h-full bg-[var(--nexus-bg)] overflow-hidden">
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* HEADER */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--nexus-border)] bg-[var(--nexus-surface)]/60 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/10 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.15)] border border-cyan-500/20">
                        <Cpu className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[var(--nexus-text-primary)] tracking-tight">Nexus Intelligence Lab</h1>
                        <p className="text-xs text-[var(--nexus-text-secondary)] mt-0.5">Extreme cognitive features: Time-Travel Debugging & Skill Fusion Engine</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2 text-[var(--nexus-text-muted)] hover:text-[var(--nexus-text-primary)] transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <div className="flex gap-1 p-1 bg-[var(--nexus-surface-elevated)] rounded-xl border border-[var(--nexus-border)]">
                        {(["time-travel", "skill-fusion"] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab
                                    ? "bg-[var(--nexus-surface)] text-cyan-400 shadow-lg border border-[var(--nexus-border)]"
                                    : "text-[var(--nexus-text-secondary)] hover:text-[var(--nexus-text-primary)]"
                                    }`}
                            >
                                {tab === "time-travel" ? <><History className="w-4 h-4" />Time-Travel</> : <><Zap className="w-4 h-4" />Skill Fusion</>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {activeTab === "time-travel" ? (
                    /* ── TIME TRAVEL VIEW ────────────────────────────────────────── */
                    <div className="flex-1 flex overflow-hidden">
                        {/* TIMELINE SIDEBAR */}
                        <div className="w-[380px] shrink-0 border-r border-[var(--nexus-border)] flex flex-col bg-[var(--nexus-surface)]/10">
                            <div className="p-3 border-b border-[var(--nexus-border)] bg-[var(--nexus-surface)]/40">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--nexus-text-muted)]" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Filter by session ID or agent..."
                                        className="w-full bg-[var(--nexus-bg)] border border-[var(--nexus-border)] rounded-lg pl-10 pr-4 py-2 text-[12px] outline-none focus:ring-1 focus:ring-cyan-500"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {filteredTimelines.length === 0 && (
                                    <div className="p-8 text-center text-[var(--nexus-text-muted)] text-xs">
                                        <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                        <p>No sessions recorded yet.<br />Run a task to begin.</p>
                                    </div>
                                )}
                                {filteredTimelines.map(tl => (
                                    <button
                                        key={tl.id}
                                        onClick={() => handleSelectTimeline(tl)}
                                        className={`w-full text-left p-3.5 rounded-xl transition-all border relative overflow-hidden ${selectedTimeline?.id === tl.id
                                            ? "bg-[var(--nexus-surface-elevated)] border-cyan-500/40"
                                            : "bg-transparent border-transparent hover:bg-[var(--nexus-surface-elevated)]/50 hover:border-[var(--nexus-border)]"
                                            }`}
                                    >
                                        {selectedTimeline?.id === tl.id && <div className="absolute left-0 top-0 w-0.5 h-full bg-cyan-400" />}
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-bold text-cyan-400 tracking-wider font-mono">{tl.id}</span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ml-1 shrink-0 ${tl.status === "recording" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                tl.status === "forked" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                    tl.status === "rewound" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                }`}>{tl.status}</span>
                                        </div>
                                        <div className="text-[13px] font-semibold text-[var(--nexus-text-primary)] mb-2 truncate">
                                            {agentEmoji(tl.agent_id)} {agentName(tl.agent_id)}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-[10px] text-[var(--nexus-text-secondary)]">
                                            <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{tl.event_count ?? 0} events</span>
                                            <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{tl.parent_id ? "Fork" : "Root"}</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{((tl.total_duration ?? 0) / 1000).toFixed(1)}s</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* EVENT REPLAY VIEWER */}
                        <div className="flex-1 bg-[var(--nexus-bg)] overflow-y-auto custom-scrollbar p-8">
                            {selectedTimeline ? (
                                <div className="max-w-4xl mx-auto space-y-8">
                                    {/* Timeline header + global actions */}
                                    <div className="flex flex-wrap justify-between items-center gap-4 border-b border-[var(--nexus-border)] pb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-[var(--nexus-text-primary)] font-mono">
                                                Session: <span className="text-cyan-400">{selectedTimeline.id}</span>
                                            </h2>
                                            <p className="text-sm text-[var(--nexus-text-secondary)] mt-1">
                                                {selectedTimeline.model || "unknown model"} &bull; {new Date(selectedTimeline.created_at ?? 0).toLocaleString()} &bull;
                                                <span className="font-semibold text-[var(--nexus-text-primary)]"> {displayEvents.length}</span> events shown
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            {replayMode ? (
                                                <button
                                                    onClick={stopReplay}
                                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all"
                                                >
                                                    <X className="w-3 h-3" /> Stop Replay
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleReplay()}
                                                    disabled={!!actionInProgress || events.length === 0}
                                                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <Play className="w-3 h-3" /> Replay All
                                                </button>
                                            )}
                                            <button
                                                onClick={handleGlobalRewind}
                                                disabled={!!actionInProgress}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {actionInProgress === "global-rewind" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Rewind className="w-3 h-3" />}
                                                Global Rewind
                                            </button>
                                        </div>
                                    </div>

                                    {replayMode && (
                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-bold flex items-center gap-2">
                                            <Play className="w-4 h-4 animate-pulse" />
                                            Replaying event {replayIndex + 1} / {replayEvents.length}…
                                        </div>
                                    )}

                                    {/* Loading state */}
                                    {loadingEvents && (
                                        <div className="flex items-center justify-center py-16 gap-3 text-[var(--nexus-text-muted)]">
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            <span className="text-sm">Loading events…</span>
                                        </div>
                                    )}

                                    {/* Event timeline */}
                                    {!loadingEvents && displayEvents.length === 0 && (
                                        <div className="py-16 text-center text-[var(--nexus-text-muted)] text-sm">
                                            <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                            No events recorded in this session.
                                        </div>
                                    )}

                                    <div className="relative space-y-4 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-cyan-500/60 before:via-[var(--nexus-border)] before:to-transparent">
                                        {displayEvents.map(ev => {
                                            const cls = classifyEvent(ev.type);
                                            const colorClass = colorForEventClass(cls);
                                            const data = typeof ev.data === "string" ? safeJson<Record<string, unknown>>(ev.data, {}) : (ev.data ?? {});
                                            const isActive = replayMode && ev.sequence === displayEvents[displayEvents.length - 1]?.sequence;
                                            return (
                                                <div key={`${ev.id}_${ev.sequence}`} className={`relative pl-12 group ${isActive ? "scale-[1.01]" : ""} transition-transform`}>
                                                    <div className={`absolute left-0 top-1 w-9 h-9 rounded-full border bg-[var(--nexus-surface)] flex items-center justify-center z-10 shadow-lg ${colorClass}`}>
                                                        {getEventIcon(ev.type)}
                                                    </div>
                                                    <div className={`bg-[var(--nexus-surface-elevated)] border rounded-2xl p-4 shadow-lg transition-all ${isActive ? "border-cyan-400/50 shadow-cyan-500/10" : "border-[var(--nexus-border)] hover:border-cyan-500/20"
                                                        }`}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--nexus-text-secondary)]">
                                                                #{ev.sequence} &bull; {ev.type}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-[var(--nexus-text-muted)]">
                                                                {new Date(ev.timestamp ?? 0).toLocaleTimeString()}
                                                            </span>
                                                        </div>

                                                        {ev.type === "tool_call" && (
                                                            <div>
                                                                <div className="text-sm font-bold text-[var(--nexus-text-primary)] mb-2">
                                                                    Executing <code className="text-amber-400">{String(data.toolName || "unknown")}</code>
                                                                </div>
                                                                {!!data.toolArgs && (
                                                                    <pre className="bg-black/40 p-3 rounded-xl text-[11px] font-mono text-cyan-300 overflow-auto max-h-40">
                                                                        {renderData(data.toolArgs)}
                                                                    </pre>
                                                                )}
                                                            </div>
                                                        )}
                                                        {ev.type === "tool_result" && (
                                                            <div>
                                                                <div className="text-xs text-emerald-400 font-bold mb-1">Result: {String(data.toolName || "")}</div>
                                                                <pre className="bg-black/30 p-3 rounded-xl text-[11px] font-mono text-slate-300 overflow-auto max-h-32 opacity-80">
                                                                    {String(data.toolResult ?? "").slice(0, 800)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {(ev.type === "llm_response" || ev.type === "llm_call") && !!data.content && (
                                                            <p className="text-sm leading-relaxed text-[var(--nexus-text-primary)] bg-[var(--nexus-bg)]/50 p-3 rounded-xl border-l-4 border-cyan-500">
                                                                {renderData(data.content).slice(0, 500)}
                                                            </p>
                                                        )}
                                                        {(ev.type === "error" || ev.type === "security_block") && (
                                                            <div className="flex gap-3 p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
                                                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                                <div className="text-sm font-medium">{String(data.error ?? data.blockedAction ?? "Unknown error")}</div>
                                                            </div>
                                                        )}
                                                        {ev.type === "state_snapshot" && (
                                                            <p className="text-xs text-[var(--nexus-text-secondary)]">
                                                                Snapshot: {Number(data.messageCount ?? 0)} messages in context (hash: <code className="text-cyan-400">{String(data.messageHash ?? "")}</code>)
                                                            </p>
                                                        )}

                                                        {/* Per-event action buttons */}
                                                        <div className="mt-3 pt-3 border-t border-[var(--nexus-border)]/40 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleReplay(ev)}
                                                                disabled={!!actionInProgress}
                                                                className="text-[10px] font-bold px-3 py-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all disabled:opacity-40 flex items-center gap-1"
                                                            >
                                                                {actionInProgress === "replay" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                                                REPLAY TO HERE
                                                            </button>
                                                            <button
                                                                onClick={() => handleFork(ev)}
                                                                disabled={!!actionInProgress}
                                                                className="text-[10px] font-bold px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-all disabled:opacity-40 flex items-center gap-1"
                                                            >
                                                                {actionInProgress === "fork" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <GitFork className="w-3 h-3" />}
                                                                FORK HERE
                                                            </button>
                                                            <button
                                                                onClick={() => handleRewind(ev)}
                                                                disabled={!!actionInProgress}
                                                                className="text-[10px] font-bold px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-40 flex items-center gap-1"
                                                            >
                                                                {actionInProgress === "rewind" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Rewind className="w-3 h-3" />}
                                                                REWIND TO HERE
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <History className="w-16 h-16 text-[var(--nexus-text-muted)] opacity-10 mb-6" />
                                    <h3 className="text-xl font-bold text-[var(--nexus-text-primary)]">Select a Session</h3>
                                    <p className="text-sm text-[var(--nexus-text-secondary)] max-w-xs mt-2">
                                        Choose a recorded session from the left panel to inspect its full decision timeline.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ── SKILL FUSION VIEW ─────────────────────────────────────── */
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                        <div className="max-w-6xl mx-auto space-y-10">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-6">
                                {[
                                    { label: "Active Swarms", value: fusionStatus.activeSessions.length, icon: Cpu, color: "text-cyan-400" },
                                    { label: "Borrowed Skills", value: fusionStatus.activeTransfers.length, icon: Share2, color: "text-amber-400" },
                                    { label: "Total Agents", value: agents.length, icon: Activity, color: "text-emerald-400" },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-[var(--nexus-surface)] border border-[var(--nexus-border)] rounded-2xl p-6 flex items-center justify-between shadow-lg">
                                        <div>
                                            <div className="text-[10px] font-bold text-[var(--nexus-text-secondary)] uppercase tracking-[0.2em] mb-2">{stat.label}</div>
                                            <div className="text-3xl font-bold text-[var(--nexus-text-primary)]">{stat.value}</div>
                                        </div>
                                        <stat.icon className={`w-8 h-8 ${stat.color} opacity-70`} />
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                {/* Active Swarms */}
                                <div className="space-y-4">
                                    <h3 className="text-base font-bold text-[var(--nexus-text-primary)] flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-amber-400" /> Active Swarm Sessions
                                    </h3>
                                    {fusionStatus.activeSessions.length === 0 ? (
                                        <div className="p-10 border-2 border-dashed border-[var(--nexus-border)] rounded-3xl text-center opacity-40">
                                            <Share2 className="w-10 h-10 mx-auto mb-4" />
                                            <p className="text-sm font-medium">No multi-agent fusions active</p>
                                        </div>
                                    ) : (
                                        fusionStatus.activeSessions.map(session => {
                                            const participants = safeJson<string[]>(session.participating_agents, []);
                                            const mergedSkills = safeJson<string[]>(session.merged_skills, []);
                                            return (
                                                <div key={session.id} className="bg-[var(--nexus-surface-elevated)] border border-amber-500/20 rounded-2xl p-6 shadow-xl">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">
                                                                {session.id?.slice(0, 14) ?? "unknown"}
                                                            </div>
                                                            <h4 className="text-lg font-bold text-[var(--nexus-text-primary)]">Hybrid Cognitive Unit</h4>
                                                        </div>
                                                        <span className="bg-amber-500/20 text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-500/30">ACTIVE</span>
                                                    </div>
                                                    <div className="flex gap-3 mb-4">
                                                        {participants.map(id => (
                                                            <div key={id} className="flex flex-col items-center gap-1">
                                                                <div className="w-10 h-10 rounded-xl bg-[var(--nexus-surface)] border border-[var(--nexus-border)] flex items-center justify-center text-xl">
                                                                    {agentEmoji(id)}
                                                                </div>
                                                                <span className="text-[10px] font-bold text-[var(--nexus-text-secondary)]">{agentName(id).split(" ")[0]}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {mergedSkills.length > 0 && (
                                                        <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                                                            <div className="text-[10px] font-bold text-amber-400/60 uppercase tracking-widest mb-2">MERGED SKILLS</div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {mergedSkills.map(s => (
                                                                    <span key={s} className="text-[10px] font-mono text-amber-200/70 bg-amber-500/5 border border-amber-500/10 rounded px-2 py-0.5">{s}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Active Transfers */}
                                <div className="space-y-4">
                                    <h3 className="text-base font-bold text-[var(--nexus-text-primary)] flex items-center gap-2">
                                        <Share2 className="w-5 h-5 text-cyan-400" /> Dynamic Skill Injections
                                    </h3>
                                    {fusionStatus.activeTransfers.length === 0 ? (
                                        <div className="p-10 border-2 border-dashed border-[var(--nexus-border)] rounded-3xl text-center opacity-40">
                                            <Zap className="w-10 h-10 mx-auto mb-4" />
                                            <p className="text-sm font-medium">No active skill transfers</p>
                                        </div>
                                    ) : (
                                        fusionStatus.activeTransfers.map(transfer => (
                                            <div key={transfer.id} className="bg-[var(--nexus-surface)]/50 border border-[var(--nexus-border)] rounded-xl p-4 flex items-center gap-4 hover:bg-[var(--nexus-surface)] transition-all">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--nexus-bg)] flex items-center justify-center text-lg">
                                                        {agentEmoji(transfer.source_agent_id)}
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-[var(--nexus-text-muted)]" />
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--nexus-bg)] flex items-center justify-center text-lg">
                                                        {agentEmoji(transfer.target_agent_id)}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-[var(--nexus-text-primary)] uppercase truncate">{transfer.skill_name}</div>
                                                    <div className="text-[10px] text-[var(--nexus-text-secondary)]">
                                                        {agentName(transfer.source_agent_id)} → {agentName(transfer.target_agent_id)}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-mono text-cyan-400 animate-pulse">LIVE</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
