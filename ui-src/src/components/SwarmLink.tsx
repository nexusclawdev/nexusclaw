/**
 * SwarmLink — Minimal SVG-based real-time agent collaboration visualization.
 * 
 * Shows agents as glowing nodes, tasks as gravity hubs, and skill transfers
 * as animated energy flows — all in pure SVG + CSS without external libs.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as api from "../api";
import type { Agent, Task, Message, Department } from "../types";
import { Activity, Zap, Users, Network, RefreshCw, ChevronRight, X, Brain } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEPT_COLORS: Record<string, string> = {
    planning: "#3B82F6",
    development: "#10B981",
    design: "#F59E0B",
    qa: "#EF4444",
    devsecops: "#8B5CF6",
    operations: "#6366F1",
};

const TASK_ORBIT_RADIUS = 80;
const AGENT_NODE_RADIUS = 28;
const TASK_NODE_RADIUS = 36;

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeLayout(
    agents: Agent[],
    tasks: Task[],
    width: number,
    height: number,
): { agentPositions: Record<string, { x: number; y: number }>, taskPositions: Record<string, { x: number; y: number }> } {
    const cx = width / 2;
    const cy = height / 2;
    const agentPositions: Record<string, { x: number; y: number }> = {};
    const taskPositions: Record<string, { x: number; y: number }> = {};

    const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'collaborating' || t.status === 'review');

    // Task hubs distributed around viewport
    if (activeTasks.length === 0) {
        // No active tasks — agents in a ring
        agents.forEach((a, i) => {
            const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
            const r = Math.min(width, height) * 0.32;
            agentPositions[a.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
        });
        return { agentPositions, taskPositions };
    }

    const taskRadius = Math.min(width, height) * 0.28;
    activeTasks.forEach((t, i) => {
        const angle = (i / activeTasks.length) * Math.PI * 2 - Math.PI / 2;
        taskPositions[t.id] = {
            x: cx + taskRadius * Math.cos(angle),
            y: cy + taskRadius * Math.sin(angle),
        };
    });

    // Agents near their assigned task, or in inner ring if unassigned
    const unassigned = agents.filter(a => !a.current_task_id || !taskPositions[a.current_task_id]);
    const assigned = agents.filter(a => a.current_task_id && taskPositions[a.current_task_id]);

    // Agents in a task: orbit the task node
    const taskAgentCount: Record<string, number> = {};
    assigned.forEach(a => {
        const tid = a.current_task_id!;
        taskAgentCount[tid] = (taskAgentCount[tid] || 0) + 1;
    });
    const taskAgentIndex: Record<string, number> = {};
    assigned.forEach(a => {
        const tid = a.current_task_id!;
        const idx = taskAgentIndex[tid] ?? 0;
        taskAgentIndex[tid] = idx + 1;
        const total = taskAgentCount[tid];
        const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
        const tp = taskPositions[tid];
        agentPositions[a.id] = {
            x: tp.x + TASK_ORBIT_RADIUS * Math.cos(angle),
            y: tp.y + TASK_ORBIT_RADIUS * Math.sin(angle),
        };
    });

    // Unassigned agents in inner ring
    const innerR = Math.min(width, height) * 0.13;
    unassigned.forEach((a, i) => {
        const angle = (i / Math.max(unassigned.length, 1)) * Math.PI * 2 - Math.PI / 2;
        agentPositions[a.id] = {
            x: cx + innerR * Math.cos(angle),
            y: cy + innerR * Math.sin(angle),
        };
    });

    return { agentPositions, taskPositions };
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function cubicPath(a: { x: number; y: number }, b: { x: number; y: number }, curve = 0.3) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const cx1 = a.x + dx * 0.5 - dy * curve;
    const cy1 = a.y + dy * 0.5 + dx * curve;
    return `M ${a.x} ${a.y} Q ${cx1} ${cy1} ${b.x} ${b.y}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AgentNode({
    agent,
    x, y,
    color,
    isSelected,
    onClick,
}: {
    agent: Agent; x: number; y: number; color: string;
    isSelected: boolean; onClick: () => void;
}) {
    const status = agent.status;
    const glowColor = status === "working" ? color : status === "break" ? "#94a3b8" : "#475569";
    const pulseAnim = status === "working" ? "swarm-pulse" : "swarm-pulse-slow";

    return (
        <g
            transform={`translate(${x},${y})`}
            className="cursor-pointer group"
            onClick={onClick}
            role="button"
            aria-label={`Agent: ${agent.name}`}
        >
            {/* Outer glow ring */}
            {status === "working" && (
                <circle r={AGENT_NODE_RADIUS + 10} fill="none" stroke={glowColor} strokeWidth="1" opacity="0.3"
                    style={{ animation: `${pulseAnim} 2s ease-in-out infinite` }}
                />
            )}
            {/* Selection ring */}
            {isSelected && (
                <circle r={AGENT_NODE_RADIUS + 6} fill="none" stroke="#00ffaa" strokeWidth="2" opacity="0.9" />
            )}
            {/* Main node */}
            <circle r={AGENT_NODE_RADIUS} fill="#0d1117" stroke={glowColor} strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ filter: status === "working" ? `drop-shadow(0 0 8px ${glowColor}60)` : undefined }}
            />
            {/* Avatar text */}
            <text textAnchor="middle" dominantBaseline="central" fontSize={18} style={{ userSelect: "none" }}>
                {agent.avatar_emoji || "🤖"}
            </text>
            {/* Status dot */}
            <circle cx={AGENT_NODE_RADIUS - 6} cy={-AGENT_NODE_RADIUS + 6} r={5}
                fill={status === "working" ? "#10b981" : status === "break" ? "#f59e0b" : status === "offline" ? "#6b7280" : "#64748b"}
                stroke="#0d1117" strokeWidth="1.5"
            />
            {/* Name label */}
            <text y={AGENT_NODE_RADIUS + 14} textAnchor="middle" fill="#94a3b8" fontSize={10}
                fontWeight="600" fontFamily="monospace" style={{ userSelect: "none" }}>
                {agent.name}
            </text>
        </g>
    );
}

function TaskCore({
    task, x, y,
    onClick,
    isSelected,
}: { task: Task; x: number; y: number; onClick: () => void; isSelected: boolean }) {
    const statusColors: Record<string, string> = {
        in_progress: "#10b981",
        collaborating: "#f59e0b",
        review: "#3b82f6",
    };
    const color = statusColors[task.status] || "#475569";
    const label = task.title.length > 16 ? task.title.slice(0, 16) + "…" : task.title;

    return (
        <g transform={`translate(${x},${y})`} className="cursor-pointer" onClick={onClick}>
            {/* Outer ring */}
            <circle r={TASK_NODE_RADIUS + 14} fill="none" stroke={color} strokeWidth="1" opacity="0.15"
                style={{ animation: "swarm-pulse 3s ease-in-out infinite" }}
            />
            <circle r={TASK_NODE_RADIUS + 4} fill="none" stroke={color} strokeWidth="1" opacity="0.3"
                style={{ animation: "swarm-pulse 3s ease-in-out infinite 0.5s" }}
            />
            {/* Core */}
            <circle r={TASK_NODE_RADIUS} fill="#0d1117" stroke={color} strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ filter: `drop-shadow(0 0 12px ${color}50)` }}
            />
            {/* Priority badge */}
            <circle r={TASK_NODE_RADIUS - 5} fill={color} opacity="0.08" />
            <text textAnchor="middle" dominantBaseline="central" fontSize={11} fill={color}
                fontWeight="700" fontFamily="monospace" style={{ userSelect: "none" }}>
                TASK
            </text>
            <text y={TASK_NODE_RADIUS + 16} textAnchor="middle" fill="#94a3b8" fontSize={9}
                fontWeight="500" fontFamily="monospace" style={{ userSelect: "none" }}>
                {label}
            </text>
        </g>
    );
}

function FlowLine({ from, to, color, animated, delay = 0 }: {
    from: { x: number; y: number }; to: { x: number; y: number };
    color: string; animated?: boolean; delay?: number;
}) {
    const pathD = cubicPath(from, to, 0.2);
    const pathId = `path-${from.x.toFixed(0)}-${from.y.toFixed(0)}-${to.x.toFixed(0)}-${to.y.toFixed(0)}`;
    return (
        <g>
            <path d={pathD} fill="none" stroke={color} strokeWidth="1" opacity="0.25" />
            {animated && (
                <>
                    <path id={pathId} d={pathD} fill="none" stroke="none" />
                    <circle r="3.5" fill={color} opacity="0.9"
                        style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
                        <animateMotion dur="1.8s" repeatCount="indefinite" begin={`${delay}s`}>
                            <mpath href={`#${pathId}`} />
                        </animateMotion>
                    </circle>
                    <circle r="2" fill={color} opacity="0.5">
                        <animateMotion dur="1.8s" repeatCount="indefinite" begin={`${delay + 0.4}s`}>
                            <mpath href={`#${pathId}`} />
                        </animateMotion>
                    </circle>
                </>
            )}
        </g>
    );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function SwarmDetailPanel({
    agent, task, agents, messages, tasks, onClose, onChat,
}: {
    agent?: Agent | null;
    task?: Task | null;
    agents: Agent[];
    messages: Message[];
    tasks: Task[];
    onClose: () => void;
    onChat?: (agent: Agent) => void;
}) {
    if (!agent && !task) return null;

    if (agent) {
        const recentMessages = messages
            .filter(m => m.sender_id === agent.id || m.receiver_id === agent.id)
            .slice(-5).reverse();
        const agentTask = agent.current_task_id ? tasks.find(t => t.id === agent.current_task_id) : null;

        return (
            <div className="w-72 shrink-0 bg-[#0d1117] border-l border-slate-800/60 flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{agent.avatar_emoji || "🤖"}</span>
                        <div>
                            <div className="text-sm font-bold text-white tracking-wider font-mono">{agent.name}</div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">{agent.role}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {/* Status */}
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800/40">
                        <div className="text-[10px] tracking-widest uppercase text-slate-500 mb-2 font-mono">Status</div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${agent.status === "working" ? "bg-emerald-400" : agent.status === "break" ? "bg-amber-400" : "bg-slate-600"}`} />
                            <span className="text-sm text-white capitalize font-mono font-bold">{agent.status}</span>
                        </div>
                    </div>

                    {/* Current Task */}
                    {agentTask && (
                        <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800/40">
                            <div className="text-[10px] tracking-widest uppercase text-slate-500 mb-2 font-mono">Current Task</div>
                            <div className="text-xs text-emerald-400 font-mono font-semibold leading-snug">{agentTask.title}</div>
                            <div className={`mt-1 text-[10px] px-1.5 py-0.5 rounded inline-block font-mono uppercase tracking-wider
                                ${agentTask.status === "in_progress" ? "bg-emerald-900/50 text-emerald-400" : "bg-amber-900/50 text-amber-400"}`}>
                                {agentTask.status.replace("_", " ")}
                            </div>
                        </div>
                    )}

                    {/* XP / Level */}
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800/40">
                        <div className="text-[10px] tracking-widest uppercase text-slate-500 mb-2 font-mono">Performance</div>
                        <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-400">XP</span>
                            <span className="text-cyan-400 font-bold">{agent.stats_xp || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono mt-1">
                            <span className="text-slate-400">Tasks Done</span>
                            <span className="text-emerald-400 font-bold">{agent.stats_tasks_done || 0}</span>
                        </div>
                    </div>

                    {/* Recent Messages */}
                    {recentMessages.length > 0 && (
                        <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800/40">
                            <div className="text-[10px] tracking-widest uppercase text-slate-500 mb-2 font-mono">Recent Activity</div>
                            <div className="space-y-2">
                                {recentMessages.map(m => (
                                    <div key={m.id} className="text-[11px] text-slate-400 font-mono line-clamp-2 leading-snug border-l-2 border-slate-700 pl-2">
                                        {m.content.slice(0, 80)}{m.content.length > 80 ? "…" : ""}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {onChat && (
                    <div className="p-4 border-t border-slate-800/60">
                        <button
                            onClick={() => onChat(agent)}
                            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold font-mono tracking-widest uppercase rounded-lg transition-all"
                        >
                            <Zap className="w-3.5 h-3.5" /> Open Chat
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (task) {
        const assignedAgent = task.assigned_agent_id ? agents.find(a => a.id === task.assigned_agent_id) : null;
        return (
            <div className="w-72 shrink-0 bg-[#0d1117] border-l border-slate-800/60 flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Task Core</div>
                        <div className="text-sm font-bold text-white tracking-wide font-mono line-clamp-2">{task.title}</div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 ml-2 shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800/40 space-y-2">
                        <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-400">Status</span>
                            <span className={`font-bold capitalize ${task.status === "in_progress" ? "text-emerald-400" : task.status === "review" ? "text-blue-400" : "text-amber-400"}`}>
                                {task.status.replace("_", " ")}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-400">Priority</span>
                            <span className="text-orange-400 font-bold">{task.priority}</span>
                        </div>
                        {assignedAgent && (
                            <div className="flex justify-between text-xs font-mono">
                                <span className="text-slate-400">Assigned</span>
                                <span className="text-white font-bold">{assignedAgent.avatar_emoji} {assignedAgent.name}</span>
                            </div>
                        )}
                    </div>
                    {task.description && (
                        <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800/40">
                            <div className="text-[10px] tracking-widest uppercase text-slate-500 mb-2 font-mono">Description</div>
                            <div className="text-xs text-slate-400 font-mono leading-relaxed">{task.description}</div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}

// ── Stats Bar (top strip) ─────────────────────────────────────────────────────

function SwarmStats({ agents, tasks, messages }: { agents: Agent[]; tasks: Task[]; messages: Message[] }) {
    const activeAgents = agents.filter(a => a.status === "working").length;
    const activeTasks = tasks.filter(t => t.status === "in_progress" || t.status === "collaborating").length;
    const recentMessages = messages.filter(m => Date.now() - m.created_at < 60_000).length;

    const stats = [
        { label: "Active Agents", value: activeAgents, icon: <Activity className="w-3.5 h-3.5" />, color: "text-emerald-400" },
        { label: "Live Tasks", value: activeTasks, icon: <Zap className="w-3.5 h-3.5" />, color: "text-amber-400" },
        { label: "Total Agents", value: agents.length, icon: <Users className="w-3.5 h-3.5" />, color: "text-cyan-400" },
        { label: "Messages (1m)", value: recentMessages, icon: <Network className="w-3.5 h-3.5" />, color: "text-blue-400" },
    ];

    return (
        <div className="flex items-center gap-6 px-6 py-3 border-b border-slate-800/50 bg-[#070b10] shrink-0">
            {stats.map(s => (
                <div key={s.label} className="flex items-center gap-2">
                    <span className={`${s.color} opacity-60`}>{s.icon}</span>
                    <span className={`text-lg font-black font-mono ${s.color}`}>{s.value}</span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-600 font-mono">{s.label}</span>
                </div>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Live</span>
            </div>
        </div>
    );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
    return (
        <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 bg-black/60 border border-slate-800/60 rounded-lg px-3 py-2.5 backdrop-blur-sm">
            <div className="text-[9px] text-slate-600 uppercase tracking-widest font-mono mb-1">Legend</div>
            {[
                { color: "#10b981", label: "Working / In-Progress" },
                { color: "#f59e0b", label: "Collaborating" },
                { color: "#3b82f6", label: "In Review" },
                { color: "#475569", label: "Idle" },
            ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color, boxShadow: `0 0 5px ${l.color}80` }} />
                    <span className="text-[10px] text-slate-500 font-mono">{l.label}</span>
                </div>
            ))}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface SwarmLinkProps {
    agents: Agent[];
    tasks: Task[];
    messages: Message[];
    departments: Department[];
    onChatAgent?: (agent: Agent) => void;
}

export default function SwarmLink({ agents, tasks, messages, departments, onChatAgent }: SwarmLinkProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [tick, setTick] = useState(0);

    // Measure container
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Animate ticks for live feel
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 2000);
        return () => clearInterval(id);
    }, []);

    const { width, height } = dimensions;
    const activeTasks = useMemo(() =>
        tasks.filter(t => t.status === "in_progress" || t.status === "collaborating" || t.status === "review"),
        [tasks]);

    const { agentPositions, taskPositions } = useMemo(
        () => computeLayout(agents, activeTasks, width, height),
        [agents, activeTasks, width, height, tick]
    );

    const handleAgentClick = useCallback((agent: Agent) => {
        setSelectedTask(null);
        setSelectedAgent(prev => prev?.id === agent.id ? null : agent);
    }, []);

    const handleTaskClick = useCallback((task: Task) => {
        setSelectedAgent(null);
        setSelectedTask(prev => prev?.id === task.id ? null : task);
    }, []);

    const closeDetail = useCallback(() => {
        setSelectedAgent(null);
        setSelectedTask(null);
    }, []);

    const deptColorOf = (agent: Agent) =>
        DEPT_COLORS[agent.department_id] || "#64748b";

    // Build edge lines
    const edges: { from: { x: number; y: number }; to: { x: number; y: number }; color: string; animated: boolean; delay: number; key: string }[] = [];

    // Agent → Task tether lines
    agents.forEach(a => {
        const ap = agentPositions[a.id];
        if (!ap || !a.current_task_id) return;
        const tp = taskPositions[a.current_task_id];
        if (!tp) return;
        const color = deptColorOf(a);
        edges.push({ from: ap, to: tp, color, animated: a.status === "working", delay: edges.length * 0.3, key: `tether-${a.id}` });
    });

    // Agent → Agent (recent message flows)
    const recentMsgs = messages.filter(m => m.sender_id && m.receiver_id && Date.now() - m.created_at < 120_000);
    recentMsgs.slice(-8).forEach((m, i) => {
        const from = agentPositions[m.sender_id!];
        const to = agentPositions[m.receiver_id!];
        if (!from || !to) return;
        edges.push({ from, to, color: "#00ffaa", animated: true, delay: i * 0.2, key: `msg-${m.id}` });
    });

    return (
        <div className="flex flex-col h-full bg-[#070b10]">
            {/* Stats Bar */}
            <SwarmStats agents={agents} tasks={activeTasks} messages={messages} />

            {/* Main layout: SVG + Side Panel */}
            <div className="flex flex-1 min-h-0">
                {/* SVG Canvas */}
                <div ref={containerRef} className="flex-1 relative min-w-0 overflow-hidden">
                    {/* Dark grid background */}
                    <svg
                        width={width}
                        height={height}
                        viewBox={`0 0 ${width} ${height}`}
                        className="absolute inset-0"
                        style={{ background: "#070b10" }}
                    >
                        <defs>
                            {/* CSS keyframes via SVG style */}
                            <style>{`
                                @keyframes swarm-pulse {
                                    0%, 100% { opacity: 0.15; r: ${AGENT_NODE_RADIUS + 10}; }
                                    50% { opacity: 0.4; r: ${AGENT_NODE_RADIUS + 16}; }
                                }
                                @keyframes swarm-pulse-slow {
                                    0%, 100% { opacity: 0.1; }
                                    50% { opacity: 0.3; }
                                }
                            `}</style>

                            {/* Grid pattern */}
                            <pattern id="swarm-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a2035" strokeWidth="0.5" />
                            </pattern>

                            {/* Radial vignette */}
                            <radialGradient id="swarm-vignette" cx="50%" cy="50%" r="60%">
                                <stop offset="0%" stopColor="transparent" />
                                <stop offset="100%" stopColor="#070b10" />
                            </radialGradient>
                        </defs>

                        {/* Grid */}
                        <rect width={width} height={height} fill="url(#swarm-grid)" />

                        {/* Center pulse (HQ marker) */}
                        <circle cx={width / 2} cy={height / 2} r={12} fill="#00ffaa" opacity="0.04" />
                        <circle cx={width / 2} cy={height / 2} r={6} fill="#00ffaa" opacity="0.12" />
                        <circle cx={width / 2} cy={height / 2} r={3} fill="#00ffaa" opacity="0.6" />

                        {/* Edges */}
                        {edges.map(e => (
                            <FlowLine key={e.key} from={e.from} to={e.to} color={e.color} animated={e.animated} delay={e.delay} />
                        ))}

                        {/* Task Cores */}
                        {activeTasks.map(t => {
                            const pos = taskPositions[t.id];
                            if (!pos) return null;
                            return (
                                <TaskCore key={t.id} task={t} x={pos.x} y={pos.y}
                                    onClick={() => handleTaskClick(t)}
                                    isSelected={selectedTask?.id === t.id}
                                />
                            );
                        })}

                        {/* Agent Nodes */}
                        {agents.map(a => {
                            const pos = agentPositions[a.id];
                            if (!pos) return null;
                            const color = deptColorOf(a);
                            return (
                                <AgentNode key={a.id} agent={a} x={pos.x} y={pos.y}
                                    color={color}
                                    isSelected={selectedAgent?.id === a.id}
                                    onClick={() => handleAgentClick(a)}
                                />
                            );
                        })}

                        {/* Vignette */}
                        <rect width={width} height={height} fill="url(#swarm-vignette)" />
                    </svg>

                    {/* Legend */}
                    <Legend />

                    {/* Empty state */}
                    {agents.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-slate-600">
                                <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <div className="text-sm font-mono">No agents detected</div>
                            </div>
                        </div>
                    )}

                    {/* No active tasks hint */}
                    {activeTasks.length === 0 && agents.length > 0 && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 border border-slate-800/60 rounded-lg px-4 py-2 text-[11px] text-slate-600 font-mono uppercase tracking-widest backdrop-blur-sm">
                            No active tasks — agents in standby
                        </div>
                    )}
                </div>

                {/* Side Detail Panel */}
                {(selectedAgent || selectedTask) && (
                    <SwarmDetailPanel
                        agent={selectedAgent}
                        task={selectedTask}
                        agents={agents}
                        messages={messages}
                        tasks={tasks}
                        onClose={closeDetail}
                        onChat={onChatAgent}
                    />
                )}
            </div>
        </div>
    );
}
