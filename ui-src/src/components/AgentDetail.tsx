import { useState, useMemo, useEffect, useCallback } from "react";
import type { Agent, Task, Department, SubTask } from "../types";
import * as api from "../api";
import type { OAuthStatus, OAuthAccountInfo } from "../api";
import AgentAvatar from "./AgentAvatar";

interface SubAgent {
  id: string;
  parentAgentId: string;
  task: string;
  status: "working" | "done";
}

interface AgentDetailProps {
  agent: Agent;
  agents: Agent[];
  department: Department | undefined;
  departments: Department[];
  tasks: Task[];
  subAgents: SubAgent[];
  subtasks: SubTask[];
  onClose: () => void;
  onChat: (agent: Agent) => void;
  onAssignTask: (agentId: string) => void;
  onOpenTerminal?: (taskId: string) => void;
  onAgentUpdated?: () => void;
}

type Locale = "ko" | "en" | "ja" | "zh";
type TFunction = (messages: Record<Locale, string>) => string;

const LANGUAGE_STORAGE_KEY = "nexusclaw.language";
const LOCALE_TAGS: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
};

function normalizeLocale(value: string | null | undefined): Locale | null {
  const code = (value ?? "").toLowerCase();
  if (code.startsWith("ko")) return "ko";
  if (code.startsWith("en")) return "en";
  if (code.startsWith("ja")) return "ja";
  if (code.startsWith("zh")) return "zh";
  return null;
}

function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  return (
    normalizeLocale(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)) ??
    normalizeLocale(window.navigator.language) ??
    "en"
  );
}

function useI18n(preferredLocale?: string) {
  const [locale, setLocale] = useState<Locale>(
    () => normalizeLocale(preferredLocale) ?? detectLocale()
  );

  useEffect(() => {
    const preferred = normalizeLocale(preferredLocale);
    if (preferred) setLocale(preferred);
  }, [preferredLocale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      setLocale(normalizeLocale(preferredLocale) ?? detectLocale());
    };
    window.addEventListener("storage", sync);
    window.addEventListener("nexusclaw-language-change", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(
        "nexusclaw-language-change",
        sync as EventListener
      );
    };
  }, [preferredLocale]);

  const t = useCallback(
    (messages: Record<Locale, string>) => messages[locale] ?? messages.en,
    [locale]
  );

  return { locale, localeTag: LOCALE_TAGS[locale], t };
}

function roleLabel(role: string, t: TFunction) {
  switch (role) {
    case "team_leader":
      return t({ ko: "팀장", en: "Team Leader", ja: "チームリーダー", zh: "组长" });
    case "senior":
      return t({ ko: "시니어", en: "Senior", ja: "시니어", zh: "高级" });
    case "junior":
      return t({ ko: "주니어", en: "Junior", ja: "ジュニア", zh: "初级" });
    case "intern":
      return t({ ko: "인턴", en: "Intern", ja: "インターン", zh: "实习生" });
    default:
      return role;
  }
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  idle: { label: "idle", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  working: { label: "working", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  break: { label: "break", color: "text-amber-400", bg: "bg-amber-500/10" },
  offline: {
    label: "offline",
    color: "text-slate-500",
    bg: "bg-white/5",
  },
};

const CLI_LABELS: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex CLI",
  gemini: "Gemini CLI",
  opencode: "OpenCode",
  copilot: "GitHub Copilot",
  antigravity: "Antigravity",
  api: "API Provider",
};

const SUBTASK_STATUS_ICON: Record<string, string> = {
  pending: '\u23F3',
  in_progress: '\uD83D\uDD28',
  done: '\u2705',
  blocked: '\uD83D\uDEAB',
};

function oauthAccountLabel(account: OAuthAccountInfo): string {
  return account.label || account.email || account.id.slice(0, 8);
}

function statusLabel(status: string, t: TFunction) {
  switch (status) {
    case "idle":
      return t({ ko: "대기중", en: "Idle", ja: "待機中", zh: "空闲" });
    case "working":
      return t({ ko: "근무중", en: "Working", ja: "作業中", zh: "工作中" });
    case "break":
      return t({ ko: "휴식중", en: "Break", ja: "休憩中", zh: "休息中" });
    case "offline":
      return t({ ko: "오프라인", en: "Offline", ja: "オフライン", zh: "离线" });
    default:
      return status;
  }
}

function taskStatusLabel(status: string, t: TFunction) {
  switch (status) {
    case "inbox":
      return t({ ko: "수신함", en: "Inbox", ja: "受信箱", zh: "收件箱" });
    case "planned":
      return t({ ko: "계획됨", en: "Planned", ja: "計画済み", zh: "已计划" });
    case "in_progress":
      return t({ ko: "진행 중", en: "In Progress", ja: "進行中", zh: "进行中" });
    case "review":
      return t({ ko: "검토", en: "Review", ja: "レビュー", zh: "审核" });
    case "done":
      return t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" });
    case "pending":
      return t({ ko: "보류", en: "Pending", ja: "保留", zh: "待处理" });
    case "cancelled":
      return t({ ko: "취소", en: "Cancelled", ja: "キャンセル", zh: "已取消" });
    default:
      return status;
  }
}

function taskTypeLabel(type: string, t: TFunction) {
  switch (type) {
    case "general":
      return t({ ko: "일반", en: "General", ja: "一般", zh: "通用" });
    case "development":
      return t({ ko: "개발", en: "Development", ja: "開発", zh: "开发" });
    case "design":
      return t({ ko: "디자인", en: "Design", ja: "デザイン", zh: "设计" });
    case "analysis":
      return t({ ko: "분석", en: "Analysis", ja: "分析", zh: "分析" });
    case "presentation":
      return t({ ko: "발표", en: "Presentation", ja: "プレゼン", zh: "演示" });
    case "documentation":
      return t({ ko: "문서화", en: "Documentation", ja: "ド큐メント", zh: "文档" });
    default:
      return type;
  }
}

export default function AgentDetail({
  agent,
  agents,
  department,
  departments,
  tasks,
  subAgents,
  subtasks,
  onClose,
  onChat,
  onAssignTask,
  onOpenTerminal,
  onAgentUpdated,
}: AgentDetailProps) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<"info" | "tasks" | "alba">("info");
  const [editingCli, setEditingCli] = useState(false);
  const [selectedCli, setSelectedCli] = useState(agent.cli_provider);
  const [selectedOAuthAccountId, setSelectedOAuthAccountId] = useState(agent.oauth_account_id ?? "");
  const [selectedApiProviderId, setSelectedApiProviderId] = useState(agent.api_provider_id ?? "");
  const [selectedApiModel, setSelectedApiModel] = useState(agent.api_model ?? "");
  const [savingCli, setSavingCli] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const agentTasks = tasks.filter((t) => t.assigned_agent_id === agent.id);

  const subtasksByTask = useMemo(() => {
    const map: Record<string, SubTask[]> = {};
    for (const st of subtasks) {
      if (!map[st.task_id]) map[st.task_id] = [];
      map[st.task_id].push(st);
    }
    return map;
  }, [subtasks]);

  const agentSubAgents = subAgents.filter(
    (s) => s.parentAgentId === agent.id
  );

  const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.idle;
  const oauthProviderKey = selectedCli === "copilot" ? "github-copilot" : selectedCli === "antigravity" ? "antigravity" : null;

  const activeOAuthAccounts = useMemo(() => {
    if (!oauthProviderKey || !oauthStatus) return [];
    return (oauthStatus.providers[oauthProviderKey]?.accounts ?? []).filter(
      (a) => a.active && a.status === "active",
    );
  }, [oauthProviderKey, oauthStatus]);

  const requiresOAuthAccount = selectedCli === "copilot" || selectedCli === "antigravity";
  const requiresApiProvider = selectedCli === "api";
  const canSaveCli = requiresApiProvider ? false : (!requiresOAuthAccount || Boolean(selectedOAuthAccountId));

  const xpLevel = Math.floor(agent.stats_xp / 100) + 1;
  const xpProgress = agent.stats_xp % 100;

  useEffect(() => {
    setSelectedCli(agent.cli_provider);
    setSelectedOAuthAccountId(agent.oauth_account_id ?? "");
    setSelectedApiProviderId(agent.api_provider_id ?? "");
    setSelectedApiModel(agent.api_model ?? "");
  }, [agent.id, agent.cli_provider, agent.oauth_account_id, agent.api_provider_id, agent.api_model]);

  useEffect(() => {
    if (!editingCli || !requiresOAuthAccount) return;
    setOauthLoading(true);
    api.getOAuthStatus()
      .then(setOauthStatus)
      .catch((err) => console.error("Failed to load OAuth status:", err))
      .finally(() => setOauthLoading(false));
  }, [editingCli, requiresOAuthAccount]);

  useEffect(() => {
    if (!requiresOAuthAccount) {
      if (selectedOAuthAccountId) setSelectedOAuthAccountId("");
      return;
    }
    if (activeOAuthAccounts.length === 0) return;
    if (!selectedOAuthAccountId || !activeOAuthAccounts.some((a) => a.id === selectedOAuthAccountId)) {
      setSelectedOAuthAccountId(activeOAuthAccounts[0].id);
    }
  }, [requiresOAuthAccount, activeOAuthAccounts, selectedOAuthAccountId]);

  return (
    <div aria-label="Agent Detail Modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div
        className="nexus-panel w-[calc(100vw-1.5rem)] max-w-[480px] max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="nexus-panel-header !border-b-0 !bg-transparent p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <AgentAvatar agent={agent} agents={agents} size={64} rounded="xl" />
              <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black ${statusCfg.bg.replace('10', '100')} ${statusCfg.color.replace('text-', 'bg-')}`} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-widest uppercase">
                {locale === "ko" ? agent.name_ko ?? agent.name : agent.name ?? agent.name_ko}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{department ? (locale === "ko" ? department.name_ko : department.name) : "Independent"}</span>
                <div className="w-1 h-1 rounded-full bg-slate-800" />
                <span className={`text-[8px] font-black uppercase tracking-widest ${statusCfg.color}`}>{statusLabel(statusCfg.label, t)}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Stats Row */}
        <div className="px-6 grid grid-cols-3 gap-3">
          <div className="bg-black/40 border border-white/5 p-3 rounded flex flex-col items-center">
            <span className="text-lg font-black text-white">{agent.stats_tasks_done}</span>
            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Tasks Done</span>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 rounded flex flex-col items-center">
            <span className="text-lg font-black text-cyan-400">{xpLevel}</span>
            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Level</span>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 rounded flex flex-col items-center">
            <span className="text-lg font-black text-rose-400">{agentSubAgents.length}</span>
            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Alba Units</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-black/40 border-b border-white/5 mt-6">
          {["info", "tasks", "alba"].map((id) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className={`flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${tab === id ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-600 hover:text-slate-400'}`}
            >
              {id}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {tab === "info" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Core Personality Directive</div>
                <div className="bg-black/40 p-4 rounded border border-white/5 italic text-sm text-slate-400 opacity-80 leading-relaxed font-medium">
                  "{agent.personality || "Standard operating procedure in effect."}"
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Executive Controls</div>
                <div className="flex gap-3">
                  <button onClick={() => onChat(agent)} className="nexus-btn flex-1 py-3 text-[10px]">Strategic Chat</button>
                  <button onClick={() => onAssignTask(agent.id)} className="nexus-btn-outline flex-1 py-3 text-[10px]">Direct Assignment</button>
                </div>
                {agent.status === "working" && agent.current_task_id && onOpenTerminal && (
                  <button onClick={() => onOpenTerminal(agent.current_task_id!)} className="w-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 py-3 text-[9px] font-black uppercase tracking-[0.2em] rounded hover:bg-cyan-500 hover:text-black transition-all">
                    Initialize Terminal Uplink
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === "tasks" && (
            <div className="space-y-3">
              {agentTasks.map(task => (
                <div key={task.id} className="nexus-card bg-black/20 border-white/5 p-3 flex items-center justify-between group">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">{task.title}</div>
                    <div className="text-[7px] font-black text-slate-600 uppercase tracking-widest mt-1">{task.status} // {task.task_type}</div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[8px] font-black uppercase tracking-widest ${task.status === 'done' ? 'text-emerald-500' : 'text-cyan-400'}`}>
                      {task.status === 'done' ? 'Success' : 'Active'}
                    </span>
                  </div>
                </div>
              ))}
              {agentTasks.length === 0 && <div className="text-center py-10 text-[9px] font-black text-slate-700 uppercase">Registry Empty</div>}
            </div>
          )}

          {tab === "alba" && (
            <div className="space-y-3">
              {agentSubAgents.map(sa => (
                <div key={sa.id} className="nexus-card bg-black/20 border-white/5 p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-black/40 flex items-center justify-center text-lg">{sa.status === 'working' ? '🔨' : '✅'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-black text-white/80 truncate uppercase tracking-widest">{sa.task}</div>
                    <div className="text-[7px] font-black text-slate-600 uppercase tracking-tighter mt-0.5">{sa.status} // ALBA_UNIT</div>
                  </div>
                </div>
              ))}
              {agentSubAgents.length === 0 && <div className="text-center py-10 text-[9px] font-black text-slate-700 uppercase">No Sub-Activity Found</div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/60 border-t border-white/5 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-slate-700 uppercase tracking-widest">Unit Access Key</span>
            <span className="text-[9px] font-mono text-slate-500">{agent.id}</span>
          </div>
          <span className="text-[7px] font-black text-slate-800 uppercase tracking-widest italic opacity-50">NexusClaw // Tactical HUD v4.0</span>
        </div>
      </div>
    </div>
  );
}
