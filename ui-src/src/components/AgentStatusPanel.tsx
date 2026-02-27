import { useEffect, useState, useCallback } from 'react';
import type { Agent } from '../types';
import type { ActiveAgentInfo, CliProcessInfo } from '../api';
import type { UiLanguage } from '../i18n';
import { pickLang } from '../i18n';
import { getActiveAgents, getCliProcesses, killCliProcess, stopTask } from '../api';
import AgentAvatar from './AgentAvatar';

interface AgentStatusPanelProps {
  agents: Agent[];
  uiLanguage: UiLanguage;
  onClose: () => void;
}

function fmtElapsed(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '-';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function fmtTime(ts: number | null | undefined): string {
  if (!ts) return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function displayCliProvider(provider: CliProcessInfo['provider']): string {
  if (provider === 'claude') return 'Claude';
  if (provider === 'codex') return 'Codex';
  if (provider === 'gemini') return 'Gemini';
  if (provider === 'node') return 'Node';
  if (provider === 'python') return 'Python';
  return 'OpenCode';
}

export default function AgentStatusPanel({ agents, uiLanguage, onClose }: AgentStatusPanelProps) {
  const t = (text: { ko: string; en: string; ja?: string; zh?: string }) => pickLang(uiLanguage, text);
  const [activeAgents, setActiveAgents] = useState<ActiveAgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [killing, setKilling] = useState<Set<string>>(new Set());
  const [inspectorMode, setInspectorMode] = useState<'idle_cli' | 'script' | null>(null);
  const [cliProcesses, setCliProcesses] = useState<CliProcessInfo[]>([]);
  const [cliLoading, setCliLoading] = useState(false);
  const [killingCliPids, setKillingCliPids] = useState<Set<number>>(new Set());

  const refresh = useCallback(() => {
    getActiveAgents()
      .then(setActiveAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const refreshCli = useCallback(() => {
    setCliLoading(true);
    getCliProcesses()
      .then(setCliProcesses)
      .catch(console.error)
      .finally(() => setCliLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    let interval: ReturnType<typeof setInterval>;
    function start() { interval = setInterval(refresh, 5000); }
    function onVis() { clearInterval(interval); if (!document.hidden) { refresh(); start(); } }
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis); };
  }, [refresh]);

  useEffect(() => {
    if (!inspectorMode) return;
    refreshCli();
    let interval: ReturnType<typeof setInterval>;
    function start() { interval = setInterval(refreshCli, 5000); }
    function onVis() { clearInterval(interval); if (!document.hidden) { refreshCli(); start(); } }
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis); };
  }, [inspectorMode, refreshCli]);

  const handleKill = async (taskId: string) => {
    if (!taskId || killing.has(taskId)) return;
    setKilling((prev) => new Set(prev).add(taskId));
    try {
      await stopTask(taskId);
      setTimeout(refresh, 1000);
    } catch (e) {
      console.error('Failed to stop task:', e);
    } finally {
      setKilling((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleKillCliProcess = async (pid: number) => {
    if (!Number.isFinite(pid) || pid <= 0 || killingCliPids.has(pid)) return;
    setKillingCliPids((prev) => new Set(prev).add(pid));
    try {
      await killCliProcess(pid);
      setTimeout(refreshCli, 600);
      setTimeout(refresh, 800);
    } catch (e) {
      console.error('Failed to kill CLI process:', e);
    } finally {
      setKillingCliPids((prev) => {
        const next = new Set(prev);
        next.delete(pid);
        return next;
      });
    }
  };

  const visibleCliProcesses = inspectorMode === 'script'
    ? cliProcesses.filter((proc) => proc.provider === 'node' || proc.provider === 'python')
    : cliProcesses.filter((proc) => proc.provider !== 'node' && proc.provider !== 'python');

  return (
    <div aria-label="Status Panel" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div
        className={`nexus-panel mx-4 w-full flex flex-col overflow-hidden max-h-[80vh] ${inspectorMode ? 'max-w-4xl' : 'max-w-2xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="nexus-panel-header">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#162a35] flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-base uppercase tracking-widest">Operation Pulse</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{activeAgents.length} Linked Units</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nextMode = inspectorMode === 'script' ? null : 'script';
                setInspectorMode(nextMode);
              }}
              className={`px-3 py-1 rounded text-[8px] font-black uppercase tracking-widest border transition-all ${inspectorMode === 'script' ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-black/40 text-slate-500 border-white/5 hover:border-white/20'}`}
            >
              Scripts
            </button>
            <button
              onClick={() => {
                const nextMode = inspectorMode === 'idle_cli' ? null : 'idle_cli';
                setInspectorMode(nextMode);
              }}
              className={`px-3 py-1 rounded text-[8px] font-black uppercase tracking-widest border transition-all ${inspectorMode === 'idle_cli' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-black/40 text-slate-500 border-white/5 hover:border-white/20'}`}
            >
              Idle CLI
            </button>
            <div className="w-px h-4 bg-white/5 mx-1" />
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {inspectorMode && (
            <div className="bg-black/20 rounded border border-cyan-500/20 p-4 space-y-3">
              <div className="flex justify-between items-center bg-cyan-950/20 px-3 py-1.5 rounded -mx-1 -mt-1">
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">
                  {inspectorMode === 'script' ? 'Script Process Inspector' : 'Idle Resource Monitor'}
                </span>
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{visibleCliProcesses.length} Items Indexed</span>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {visibleCliProcesses.map((proc) => (
                  <div key={proc.pid} className="nexus-card bg-black/40 border-white/5 flex items-center justify-between gap-4 py-2 px-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[7px] font-black bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/20 uppercase">
                          {displayCliProvider(proc.provider)}
                        </span>
                        <span className="text-[8px] font-mono text-slate-500">PID {proc.pid}</span>
                        {proc.is_idle && <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest">Idle</span>}
                      </div>
                      <div className="text-[10px] text-slate-300 font-bold truncate opacity-80">{proc.command || proc.executable}</div>
                    </div>
                    <button
                      onClick={() => handleKillCliProcess(proc.pid)}
                      className="w-6 h-6 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all text-xs"
                    >
                      💀
                    </button>
                  </div>
                ))}
                {visibleCliProcesses.length === 0 && <div className="text-center py-4 text-[9px] font-black text-slate-700 uppercase tracking-widest">Scan Result: Zero</div>}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10 opacity-20 animate-pulse text-[10px] font-black uppercase tracking-widest">Indexing Activity...</div>
            ) : activeAgents.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl opacity-20 mb-4">🛸</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">All Units Standing By</div>
              </div>
            ) : (
              activeAgents.map((ag) => {
                const fullAgent = agents.find((a) => a.id === ag.id);
                const isKilling = ag.task_id ? killing.has(ag.task_id) : false;

                return (
                  <div key={ag.id} className="nexus-card bg-black/20 border-white/5 flex items-center gap-4">
                    <div className="relative">
                      <AgentAvatar agent={fullAgent as any} agents={agents} size={40} rounded="xl" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black bg-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-wide">{uiLanguage === 'ko' ? (ag.name_ko || ag.name) : ag.name}</span>
                        <span className="text-[8px] font-black text-slate-600 uppercase bg-black/40 px-1.5 py-0.5 rounded border border-white/5">{uiLanguage === 'ko' ? (ag.dept_name_ko || ag.dept_name) : ag.dept_name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5 opacity-60 italic">"{ag.task_title || 'Autonomous execution'}"</div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5 min-w-[80px]">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-widest ${ag.has_active_process ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10' : 'text-slate-600 border-white/5'}`}>
                        {ag.has_active_process ? 'Executing' : 'Standby'}
                      </span>
                      <div className="text-[7px] font-black text-slate-700 uppercase">Idle: {ag.idle_seconds !== null ? fmtElapsed(ag.idle_seconds) : '-'}</div>
                    </div>
                    {ag.task_id && (
                      <button
                        onClick={() => handleKill(ag.task_id!)}
                        disabled={isKilling}
                        className="w-8 h-8 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                      >
                        {isKilling ? "..." : "🛑"}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="nexus-panel-header border-t border-white/5 py-3 !bg-black/40">
          <div className="flex items-center gap-4 text-[8px] font-black text-slate-700 uppercase tracking-widest">
            <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" /> Link Active</span>
            <span className="opacity-40 italic">v1.1.0-nexus-pulse</span>
          </div>
          <button onClick={onClose} className="nexus-btn text-[8px] py-1 px-4 opacity-80 hover:opacity-100">Dismiss Monitor</button>
        </div>
      </div>
    </div>
  );
}
