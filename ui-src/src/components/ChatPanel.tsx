import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Agent, Message, Project } from '../types';
import MessageContent from './MessageContent';
import AgentAvatar, { buildSpriteMap } from './AgentAvatar';
import { useI18n } from '../i18n';
import type { LangText } from '../i18n';
import { createProject, getProjects } from '../api';

export interface StreamingMessage {
  message_id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  content: string;
}

interface ChatPanelProps {
  selectedAgent: Agent | null;
  messages: Message[];
  agents: Agent[];
  streamingMessage?: StreamingMessage | null;
  onSendMessage: (
    content: string,
    receiverType: 'agent' | 'department' | 'all',
    receiverId?: string,
    messageType?: string,
    projectMeta?: {
      project_id?: string;
      project_path?: string;
      project_context?: string;
    },
  ) => void;
  onSendAnnouncement: (content: string) => void;
  onSendDirective: (
    content: string,
    projectMeta?: {
      project_id?: string;
      project_path?: string;
      project_context?: string;
    },
  ) => void;
  onClearMessages?: (agentId?: string) => void;
  onClose: () => void;
}

type ChatMode = 'chat' | 'task' | 'announcement' | 'report';
type ProjectMetaPayload = {
  project_id?: string;
  project_path?: string;
  project_context?: string;
};

type PendingSendAction =
  | { kind: 'directive'; content: string }
  | { kind: 'announcement'; content: string }
  | { kind: 'task'; content: string; receiverId: string }
  | { kind: 'report'; content: string; receiverId: string }
  | { kind: 'chat'; content: string; receiverId: string }
  | { kind: 'broadcast'; content: string };

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-green-400',
  working: 'bg-blue-400',
  break: 'bg-yellow-400',
  offline: 'bg-gray-500',
};

const STATUS_LABELS: Record<string, LangText> = {
  idle: { ko: '대기중', en: 'Idle', ja: '待機中', zh: '待机中' },
  working: { ko: '작업중', en: 'Working', ja: '作業中', zh: '工作中' },
  break: { ko: '휴식', en: 'Break', ja: '休憩中', zh: '休息中' },
  offline: { ko: '오프라인', en: 'Offline', ja: 'オフライン', zh: '离线' },
};

const ROLE_LABELS: Record<string, LangText> = {
  team_leader: { ko: '팀장', en: 'Team Leader', ja: 'チームリーダー', zh: '组长' },
  senior: { ko: '시니어', en: 'Senior', ja: 'シニア', zh: '高级' },
  junior: { ko: '주니어', en: 'Junior', ja: 'ジュニア', zh: '初级' },
  intern: { ko: '인턴', en: 'Intern', ja: 'インターン', zh: '实习生' },
};

function formatTime(ts: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="flex items-center gap-1 bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-2">
        <span
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}

export function ChatPanel({
  selectedAgent,
  messages,
  agents,
  streamingMessage,
  onSendMessage,
  onSendAnnouncement,
  onSendDirective,
  onClearMessages,
  onClose,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ChatMode>(selectedAgent ? 'task' : 'announcement');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const spriteMap = useMemo(() => buildSpriteMap(agents), [agents]);
  const { t, locale } = useI18n();
  const isKorean = locale.startsWith('ko');

  const tr = (ko: string, en: string, ja = en, zh = en) =>
    t({ ko, en, ja, zh });

  const getAgentName = (agent: Agent | null | undefined) => {
    if (!agent) return '';
    return isKorean ? agent.name_ko || agent.name : agent.name || agent.name_ko;
  };

  const getRoleLabel = (role: string) => {
    const label = ROLE_LABELS[role];
    return label ? t(label) : role;
  };

  const getStatusLabel = (status: string) => {
    const label = STATUS_LABELS[status];
    return label ? t(label) : status;
  };

  const selectedDeptName = selectedAgent?.department
    ? isKorean
      ? selectedAgent.department.name_ko || selectedAgent.department.name
      : selectedAgent.department.name || selectedAgent.department.name_ko
    : selectedAgent?.department_id;
  const selectedTaskId = selectedAgent?.current_task_id;

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 스트리밍 중인 메시지가 현재 에이전트 것인지 판별
  const isStreamingForAgent = streamingMessage && selectedAgent && streamingMessage.agent_id === selectedAgent.id;

  // Auto-scroll to bottom on new messages or streaming delta
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage?.content]);

  // Switch mode when agent selection changes
  useEffect(() => {
    if (!selectedAgent) {
      setMode('announcement');
    } else if (mode === 'announcement') {
      setMode('task');
    }
  }, [selectedAgent]);

  // When switching to announcement mode, we should show all announcements
  useEffect(() => {
    if (mode === 'announcement') {
      console.log('[ChatPanel] Switched to announcement mode, messages:', messages.length);
    }
  }, [mode, messages]);

  const isDirectiveMode = input.trimStart().startsWith('$');
  const [pendingSend, setPendingSend] = useState<PendingSendAction | null>(null);
  const [projectFlowOpen, setProjectFlowOpen] = useState(false);
  const [projectFlowStep, setProjectFlowStep] = useState<'choose' | 'existing' | 'new' | 'confirm'>('choose');
  const [projectItems, setProjectItems] = useState<Project[]>([]);
  const [projectLoading, setProjectLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [existingProjectInput, setExistingProjectInput] = useState('');
  const [existingProjectError, setExistingProjectError] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPath, setNewProjectPath] = useState('');
  const [newProjectGoal, setNewProjectGoal] = useState('');
  const [projectSaving, setProjectSaving] = useState(false);
  const isDirectivePending = pendingSend?.kind === 'directive';

  const closeProjectFlow = () => {
    setProjectFlowOpen(false);
    setProjectFlowStep('choose');
    setPendingSend(null);
    // Don't reset selectedProject - keep it for future messages
    setExistingProjectInput('');
    setExistingProjectError('');
    setNewProjectName('');
    setNewProjectPath('');
    setNewProjectGoal('');
    setProjectItems([]);
  };

  const loadRecentProjects = useCallback(async () => {
    setProjectLoading(true);
    try {
      const res = await getProjects({ page: 1, page_size: 10 });
      setProjectItems(res.projects.slice(0, 10));
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setProjectLoading(false);
    }
  }, []);

  const resolveExistingProjectSelection = useCallback((raw: string): Project | null => {
    const trimmed = raw.trim();
    if (!trimmed || projectItems.length === 0) return null;

    if (/^\d+$/.test(trimmed)) {
      const idx = Number.parseInt(trimmed, 10);
      if (idx >= 1 && idx <= projectItems.length) {
        return projectItems[idx - 1];
      }
    }

    const query = trimmed.toLowerCase();
    const tokens = query.split(/\s+/).filter(Boolean);
    let best: { project: Project; score: number } | null = null;

    for (const p of projectItems) {
      const name = p.name.toLowerCase();
      const path = p.project_path.toLowerCase();
      const goal = p.core_goal.toLowerCase();
      let score = 0;

      if (name === query) score = Math.max(score, 100);
      if (name.startsWith(query)) score = Math.max(score, 90);
      if (name.includes(query)) score = Math.max(score, 80);
      if (path === query) score = Math.max(score, 75);
      if (path.includes(query)) score = Math.max(score, 65);
      if (goal.includes(query)) score = Math.max(score, 50);

      if (tokens.length > 0) {
        const tokenHits = tokens.filter((tk) => name.includes(tk) || path.includes(tk) || goal.includes(tk)).length;
        score = Math.max(score, tokenHits * 20);
      }

      if (!best || score > best.score) {
        best = { project: p, score };
      }
    }

    if (!best || best.score < 50) return null;
    return best.project;
  }, [projectItems]);

  const applyExistingProjectSelection = useCallback(() => {
    const picked = resolveExistingProjectSelection(existingProjectInput);
    if (!picked) {
      setExistingProjectError(tr('번호(1-10) 또는 프로젝트명을 다시 입력해주세요.', 'Please enter a number (1-10) or a project name.', '番号(1-10)またはプロジェクト名を入力してください。', '请输入编号(1-10)或项目名称。'));
      return;
    }
    setExistingProjectError('');
    setSelectedProject(picked);
    setProjectFlowStep('confirm');
  }, [existingProjectInput, resolveExistingProjectSelection]);

  const dispatchPending = useCallback((action: PendingSendAction, projectMeta?: ProjectMetaPayload) => {
    if (action.kind === 'directive') {
      onSendDirective(action.content, projectMeta);
      return;
    }
    if (action.kind === 'announcement') {
      onSendAnnouncement(action.content);
      return;
    }
    if (action.kind === 'task') {
      onSendMessage(action.content, 'agent', action.receiverId, 'task_assign', projectMeta);
      return;
    }
    if (action.kind === 'report') {
      onSendMessage(action.content, 'agent', action.receiverId, 'report', projectMeta);
      return;
    }
    if (action.kind === 'chat') {
      onSendMessage(action.content, 'agent', action.receiverId, 'chat', projectMeta);
      return;
    }
    onSendMessage(action.content, 'all', undefined, undefined, projectMeta);
  }, [onSendAnnouncement, onSendDirective, onSendMessage]);

  const handleConfirmProject = () => {
    if (!pendingSend || !selectedProject) return;
    const projectMeta: ProjectMetaPayload = {
      project_id: selectedProject.id,
      project_path: selectedProject.project_path,
      project_context: selectedProject.core_goal,
    };
    dispatchPending(pendingSend, projectMeta);
    setInput('');
    textareaRef.current?.focus();
    closeProjectFlow();
  };

  const handleCreateProject = async () => {
    const goal = isDirectivePending ? (pendingSend?.content ?? '').trim() : newProjectGoal.trim();
    if (!newProjectName.trim() || !newProjectPath.trim() || !goal || projectSaving) return;
    setProjectSaving(true);
    try {
      const created = await createProject({
        name: newProjectName.trim(),
        project_path: newProjectPath.trim(),
        core_goal: goal,
      });
      setSelectedProject(created);
      setProjectFlowStep('confirm');
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setProjectSaving(false);
    }
  };

  const openProjectBranch = (action: PendingSendAction) => {
    setPendingSend(action);
    setProjectFlowOpen(true);
    setProjectFlowStep('choose');
    setSelectedProject(null);
    setExistingProjectInput('');
    setExistingProjectError('');
    setProjectItems([]);
    setNewProjectGoal(action.kind === 'directive' ? action.content : '');
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    let action: PendingSendAction;
    if (trimmed.startsWith('$')) {
      const directiveContent = trimmed.slice(1).trim();
      if (!directiveContent) return;
      action = { kind: 'directive', content: directiveContent };
    } else if (mode === 'announcement') {
      action = { kind: 'announcement', content: trimmed };
    } else if (mode === 'task' && selectedAgent) {
      action = { kind: 'task', content: trimmed, receiverId: selectedAgent.id };
    } else if (mode === 'report' && selectedAgent) {
      action = {
        kind: 'report',
        content: `[${tr('보고 요청', 'Report Request', 'レポート依頼', '报告请求')}] ${trimmed}`,
        receiverId: selectedAgent.id,
      };
    } else if (selectedAgent) {
      action = { kind: 'chat', content: trimmed, receiverId: selectedAgent.id };
    } else {
      action = { kind: 'broadcast', content: trimmed };
    }

    const isTaskInstruction = action.kind === 'directive' || action.kind === 'task' || action.kind === 'report';
    // Ask project branch if no project selected yet, or allow using existing project
    const needsProjectBranch = isTaskInstruction && !selectedProject;

    if (needsProjectBranch) {
      openProjectBranch(action);
      return;
    }

    // Use selected project if available for task instructions
    const projectMeta = isTaskInstruction && selectedProject ? {
      project_id: selectedProject.id,
      project_path: selectedProject.project_path,
      project_context: selectedProject.core_goal,
    } : undefined;

    dispatchPending(action, projectMeta);
    setInput('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (!projectFlowOpen) return;
    if (projectFlowStep !== 'existing') return;
    void loadRecentProjects();
  }, [projectFlowOpen, projectFlowStep, loadRecentProjects]);

  const isAnnouncementMode = mode === 'announcement';

  // Filter messages relevant to current view (memoized to avoid re-filtering on every render)
  const selectedAgentId = selectedAgent?.id;
  const visibleMessages = useMemo(() => {
    console.log('[ChatPanel] Filtering messages. Total:', messages.length, 'Selected agent:', selectedAgentId, 'Mode:', mode);
    const filtered = messages.filter((msg) => {
      // In announcement mode, always show all announcements regardless of selected agent
      if (mode === 'announcement') {
        const show = msg.receiver_type === 'all' || msg.message_type === 'announcement' || msg.message_type === 'directive';
        if (show) console.log('[ChatPanel] Showing announcement/directive:', msg.id, msg.content.substring(0, 30));
        return show;
      }

      // If no agent selected, show announcements and directives
      if (!selectedAgentId) {
        return msg.receiver_type === 'all' || msg.message_type === 'announcement' || msg.message_type === 'directive';
      }

      // Agent selected - show messages for this agent + announcements
      if (selectedTaskId && msg.task_id === selectedTaskId) return true;
      return (
        (msg.sender_type === 'ceo' &&
          msg.receiver_type === 'agent' &&
          msg.receiver_id === selectedAgentId) ||
        (msg.sender_type === 'agent' &&
          msg.sender_id === selectedAgentId) ||
        msg.message_type === 'announcement' ||
        msg.message_type === 'directive' ||
        msg.receiver_type === 'all'
      );
    });
    console.log('[ChatPanel] Filtered messages:', filtered.length);
    // Reverse so newest messages appear at bottom
    return filtered.reverse();
  }, [messages, selectedAgentId, selectedTaskId, mode]);

  return (
    <div className="fixed inset-0 z-50 flex h-full w-full flex-col bg-gray-900 shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:w-96 lg:border-l lg:border-gray-700">
      {/* Header */}
      <div className="chat-header flex items-center gap-3 px-4 py-3 bg-gray-800 flex-shrink-0">
        {selectedAgent ? (
          <>
            {/* Agent avatar */}
            <div className="relative flex-shrink-0">
              <AgentAvatar agent={selectedAgent} spriteMap={spriteMap} size={40} />
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${STATUS_COLORS[selectedAgent.status] ?? 'bg-gray-500'
                  }`}
              />
            </div>

            {/* Agent info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm truncate">
                  {getAgentName(selectedAgent)}
                </span>
                <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded">
                  {getRoleLabel(selectedAgent.role)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-gray-400 truncate">
                  {selectedDeptName}
                </span>
                <span className="text-gray-600">·</span>
                <span className="text-xs text-gray-400">
                  {getStatusLabel(selectedAgent.status)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-xl flex-shrink-0">
              📢
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm">
                {tr('전사 공지', 'Company Announcement', '全体告知', '全员公告')}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {tr('모든 에이전트에게 전달됩니다', 'Sent to all agents', 'すべてのエージェントに送信されます', '将发送给所有代理')}
              </div>
            </div>
          </>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Clear messages */}
          {onClearMessages && visibleMessages.length > 0 && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    selectedAgent
                      ? tr(
                        `${getAgentName(selectedAgent)}와의 대화를 삭제하시겠습니까?`,
                        `Delete conversation with ${getAgentName(selectedAgent)}?`,
                        `${getAgentName(selectedAgent)}との会話を削除しますか？`,
                        `要删除与 ${getAgentName(selectedAgent)} 的对话吗？`
                      )
                      : tr(
                        '전사 공지 내역을 삭제하시겠습니까?',
                        'Delete announcement history?',
                        '全体告知履歴を削除しますか？',
                        '要删除全员公告记录吗？'
                      )
                  )
                ) {
                  onClearMessages(selectedAgent?.id);
                }
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
              title={tr('대화 내역 삭제', 'Clear message history', '会話履歴を削除', '清除消息记录')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
              </svg>
            </button>
          )}
          {/* Close button */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label={tr('닫기', 'Close', '閉じる', '关闭')}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Announcement mode banner */}
      {isAnnouncementMode && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/30 flex-shrink-0">
          <span className="text-yellow-400 text-sm font-medium">
            📢 {tr('전사 공지 모드 - 모든 에이전트에게 전달됩니다', 'Announcement mode - sent to all agents', '全体告知モード - すべてのエージェントに送信', '全员公告模式 - 将发送给所有代理')}
          </span>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {visibleMessages.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="text-6xl">💬</div>
            <div>
              <p className="text-gray-400 font-medium">
                {tr('대화를 시작해보세요! 👋', 'Start a conversation! 👋', '会話を始めましょう! 👋', '开始对话吧! 👋')}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                {selectedAgent
                  ? tr(
                    `${getAgentName(selectedAgent)}에게 메시지를 보내보세요`,
                    `Send a message to ${getAgentName(selectedAgent)}`,
                    `${getAgentName(selectedAgent)}にメッセージを送ってみましょう`,
                    `给 ${getAgentName(selectedAgent)} 发送一条消息吧`
                  )
                  : tr(
                    '전체 에이전트에게 공지를 보내보세요',
                    'Send an announcement to all agents',
                    'すべてのエージェントに告知を送ってみましょう',
                    '给所有代理发送一条公告吧'
                  )}
              </p>
            </div>
          </div>
        ) : (
          <>
            {visibleMessages.slice(-200).map((msg) => {
              const isCeo = msg.sender_type === 'ceo';
              const isDirective = msg.message_type === 'directive';
              const isAnnouncement = msg.message_type === 'announcement';
              const isSystem =
                msg.sender_type === 'system' || isAnnouncement || isDirective;

              // Resolve sender name
              const senderAgent =
                msg.sender_agent ??
                agents.find((a) => a.id === msg.sender_id);
              const senderName = isCeo
                ? tr('CEO', 'CEO')
                : isSystem
                  ? tr('시스템', 'System', 'システム', '系统')
                  : getAgentName(senderAgent) || tr('알 수 없음', 'Unknown', '不明', '未知');

              // Agent reply to announcements: show as left-aligned agent bubble
              if (msg.sender_type === 'agent' && msg.receiver_type === 'all') {
                return (
                  <div key={msg.id} className="flex items-end gap-2">
                    <AgentAvatar agent={senderAgent} spriteMap={spriteMap} size={28} />
                    <div className="flex flex-col gap-1 max-w-[75%]">
                      <span className="text-xs text-gray-500 px-1">{senderName}</span>
                      <div className="announcement-reply-bubble bg-gray-700/70 text-gray-100 text-sm rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-md border border-yellow-500/20">
                        <MessageContent content={msg.content} />
                      </div>
                      <span className="text-xs text-gray-600 px-1">
                        {formatTime(msg.created_at, locale)}
                      </span>
                    </div>
                  </div>
                );
              }

              // Announcements and directives - MUST come before isCeo check
              if (isAnnouncement || isDirective || msg.receiver_type === 'all') {
                // Center announcement / directive bubble
                return (
                  <div key={msg.id} className="flex flex-col items-center gap-1">
                    {isDirective && (
                      <span className="text-xs font-bold text-red-400 px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded-full">
                        {tr('업무지시', 'Directive', '業務指示', '业务指示')}
                      </span>
                    )}
                    {isAnnouncement && (
                      <span className="text-xs font-bold text-yellow-400 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                        {tr('공지', 'Announcement', '告知', '公告')}
                      </span>
                    )}
                    <div className={`max-w-[85%] text-sm rounded-2xl px-4 py-2.5 text-center shadow-sm ${isDirective
                        ? 'bg-red-500/15 border border-red-500/30 text-red-300'
                        : 'announcement-message-bubble bg-yellow-500/15 border border-yellow-500/30 text-yellow-300'
                      }`}>
                      <MessageContent content={msg.content} />
                    </div>
                    <span className="text-xs text-gray-600">
                      {formatTime(msg.created_at, locale)}
                    </span>
                  </div>
                );
              }

              if (isCeo) {
                // Right-aligned CEO bubble
                return (
                  <div key={msg.id} className="flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-500 px-1">
                      {tr('CEO', 'CEO')}
                    </span>
                    <div className="max-w-[80%] bg-blue-600 text-white text-sm rounded-2xl rounded-br-sm px-4 py-2.5 shadow-md">
                      <MessageContent content={msg.content} />
                    </div>
                    <span className="text-xs text-gray-600 px-1">
                      {formatTime(msg.created_at, locale)}
                    </span>
                  </div>
                );
              }

              // Left-aligned agent bubble
              return (
                <div key={msg.id} className="flex items-end gap-2">
                  <AgentAvatar agent={senderAgent} spriteMap={spriteMap} size={28} />
                  <div className="flex flex-col gap-1 max-w-[75%]">
                    <span className="text-xs text-gray-500 px-1">{senderName}</span>
                    <div className="bg-gray-700 text-gray-100 text-sm rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-md">
                      <MessageContent content={msg.content} />
                    </div>
                    <span className="text-xs text-gray-600 px-1">
                      {formatTime(msg.created_at, locale)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* 스트리밍 메시지 (API/OAuth 실시간 응답) */}
            {isStreamingForAgent && streamingMessage.content && (
              <div className="flex items-end gap-2">
                <AgentAvatar agent={selectedAgent} spriteMap={spriteMap} size={28} />
                <div className="flex flex-col gap-1 max-w-[75%]">
                  <span className="text-xs text-gray-500 px-1">{getAgentName(selectedAgent)}</span>
                  <div className="bg-gray-700 text-gray-100 text-sm rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-md border border-emerald-500/20">
                    <MessageContent content={streamingMessage.content} />
                    <span className="inline-block w-1.5 h-4 bg-emerald-400 rounded-sm animate-pulse ml-0.5 align-text-bottom" />
                  </div>
                </div>
              </div>
            )}

            {/* Typing indicator when selected agent is working (스트리밍 중이 아닐 때만) */}
            {selectedAgent && selectedAgent.status === 'working' && !isStreamingForAgent && (
              <div className="flex items-end gap-2">
                <AgentAvatar agent={selectedAgent} spriteMap={spriteMap} size={28} />
                <TypingIndicator />
              </div>
            )}
          </>
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick action buttons */}
      <div className="flex gap-2 px-4 pt-3 pb-1 flex-shrink-0 border-t border-gray-700/50">
        <button
          onClick={() => setMode(mode === 'task' ? 'chat' : 'task')}
          disabled={!selectedAgent}
          className={`flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors font-medium ${mode === 'task'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
        >
          <span>📋</span>
          <span>{tr('업무 지시', 'Task', 'タスク指示', '任务指示')}</span>
        </button>

        <button
          onClick={() => setMode(mode === 'announcement' ? 'chat' : 'announcement')}
          className={`flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors font-medium ${mode === 'announcement'
              ? 'bg-yellow-500 text-gray-900'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
        >
          <span>📢</span>
          <span>{tr('전사 공지', 'Announcement', '全体告知', '全员公告')}</span>
        </button>

        <button
          onClick={() => setMode(mode === 'report' ? 'chat' : 'report')}
          disabled={!selectedAgent}
          className={`flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors font-medium ${mode === 'report'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
        >
          <span>📊</span>
          <span>{tr('보고 요청', 'Report', 'レポート依頼', '报告请求')}</span>
        </button>
      </div>

      {/* Mode hint */}
      {(mode !== 'chat' || isDirectiveMode) && (
        <div className="px-4 py-1 flex-shrink-0">
          {isDirectiveMode ? (
            <p className="text-xs text-red-400 font-medium">
              {tr('업무지시 모드 — 기획팀이 자동으로 주관합니다', 'Directive mode - Planning team auto-coordinates', '業務指示モード — 企画チームが自動的に主管します', '业务指示模式 — 企划组自动主管')}
            </p>
          ) : (
            <>
              {mode === 'task' && (
                <p className="text-xs text-blue-400">
                  📋 {tr('업무 지시 모드 — 에이전트에게 작업을 할당합니다', 'Task mode - assign work to the agent', 'タスク指示モード — エージェントに作業を割り当てます', '任务指示模式 — 向代理分配工作')}
                </p>
              )}
              {mode === 'announcement' && (
                <p className="text-xs text-yellow-400">
                  📢 {tr('전사 공지 모드 — 모든 에이전트에게 전달됩니다', 'Announcement mode - sent to all agents', '全体告知モード — すべてのエージェントに送信', '全员公告模式 — 将发送给所有代理')}
                </p>
              )}
              {mode === 'report' && (
                <p className="text-xs text-emerald-400">
                  📊 {tr('보고 요청 모드 — 보고서/발표자료 작성 작업을 요청합니다', 'Report mode - request report/deck authoring', 'レポート依頼モード — レポート/資料作成を依頼します', '报告请求模式 — 请求撰写报告/演示资料')}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Project selector for task/report modes */}
      {(mode === 'task' || mode === 'report' || isDirectiveMode) && (
        <div className="px-4 pb-2 flex-shrink-0">
          {selectedProject ? (
            <div className="flex items-center gap-2 text-xs bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700">
              <span className="text-slate-400">📁 {tr('프로젝트:', 'Project:', 'プロジェクト:', '项目:')}</span>
              <span className="text-white font-medium flex-1 truncate">{selectedProject.name}</span>
              <button
                type="button"
                onClick={() => {
                  setProjectFlowOpen(true);
                  setProjectFlowStep('choose');
                }}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                {tr('변경', 'Change', '変更', '更改')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setProjectFlowOpen(true);
                setProjectFlowStep('choose');
              }}
              className="w-full text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg px-3 py-2 border border-blue-500/30 font-medium"
            >
              📁 {tr('프로젝트 선택', 'Select Project', 'プロジェクト選択', '选择项目')}
            </button>
          )}
        </div>
      )}

      {projectFlowOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">
                {tr('프로젝트 분기', 'Project Branch', 'プロジェクト分岐', '项目分支')}
              </h3>
              <button
                type="button"
                onClick={closeProjectFlow}
                className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 px-4 py-4 text-sm">
              {projectFlowStep === 'choose' && (
                <>
                  <p className="text-slate-200">
                    {tr(
                      '기존 프로젝트인가요? 신규 프로젝트인가요?',
                      'Is this an existing project or a new project?',
                      '既存プロジェクトですか？新規プロジェクトですか？',
                      '这是已有项目还是新项目？',
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProjectFlowStep('existing');
                        setExistingProjectInput('');
                        setExistingProjectError('');
                        void loadRecentProjects();
                      }}
                      className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500"
                    >
                      {tr('기존 프로젝트', 'Existing Project', '既存プロジェクト', '已有项目')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectFlowStep('new')}
                      className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
                    >
                      {tr('신규 프로젝트', 'New Project', '新規プロジェクト', '新项目')}
                    </button>
                  </div>
                </>
              )}

              {projectFlowStep === 'existing' && (
                <>
                  <p className="text-xs text-slate-400">
                    {tr(
                      '최근 프로젝트 10개를 보여드립니다. 번호(1-10) 또는 프로젝트명을 입력하세요.',
                      'Showing 10 recent projects. Enter a number (1-10) or project name.',
                      '最新プロジェクト10件を表示します。番号(1-10)またはプロジェクト名を入力してください。',
                      '显示最近 10 个项目。请输入编号(1-10)或项目名称。',
                    )}
                  </p>
                  {projectLoading ? (
                    <p className="text-xs text-slate-500">{tr('불러오는 중...', 'Loading...', '読み込み中...', '加载中...')}</p>
                  ) : projectItems.length === 0 ? (
                    <p className="text-xs text-slate-500">{tr('프로젝트가 없습니다', 'No projects', 'プロジェクトなし', '暂无项目')}</p>
                  ) : (
                    <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                      {projectItems.map((p, idx) => (
                        <div key={p.id} className="rounded-lg border border-slate-700 bg-slate-800/60 p-2">
                          <p className="text-xs font-medium text-slate-100">
                            <span className="mr-1 text-blue-300">{idx + 1}.</span>
                            {p.name}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">{p.project_path}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProject(p);
                              setExistingProjectInput(String(idx + 1));
                              setExistingProjectError('');
                              setProjectFlowStep('confirm');
                            }}
                            className="mt-2 rounded bg-blue-700 px-2 py-1 text-[11px] text-white hover:bg-blue-600"
                          >
                            {tr('선택', 'Select', '選択', '选择')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={existingProjectInput}
                      onChange={(e) => {
                        setExistingProjectInput(e.target.value);
                        if (existingProjectError) setExistingProjectError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyExistingProjectSelection();
                        }
                      }}
                      placeholder={tr(
                        '예: 1 또는 프로젝트명',
                        'e.g. 1 or project name',
                        '例: 1 またはプロジェクト名',
                        '例如：1 或项目名',
                      )}
                      className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-blue-500"
                    />
                    {existingProjectError && (
                      <p className="text-[11px] text-rose-300">{existingProjectError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={applyExistingProjectSelection}
                        className="flex-1 rounded bg-blue-700 px-2 py-1.5 text-[11px] text-white hover:bg-blue-600"
                      >
                        {tr('입력값으로 선택', 'Select from input', '入力値で選択', '按输入选择')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setProjectFlowStep('choose')}
                        className="rounded border border-slate-700 px-2 py-1.5 text-[11px] text-slate-300"
                      >
                        {tr('뒤로', 'Back', '戻る', '返回')}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {projectFlowStep === 'new' && (
                <>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder={tr('프로젝트 이름', 'Project name', 'プロジェクト名', '项目名称')}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={newProjectPath}
                    onChange={(e) => setNewProjectPath(e.target.value)}
                    placeholder={tr('프로젝트 경로', 'Project path', 'プロジェクトパス', '项目路径')}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                  <textarea
                    rows={3}
                    value={newProjectGoal}
                    onChange={(e) => setNewProjectGoal(e.target.value)}
                    readOnly={isDirectivePending}
                    placeholder={tr('핵심 목표', 'Core goal', 'コア目標', '核心目标')}
                    className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                  {isDirectivePending && (
                    <p className="text-[11px] text-slate-400">
                      {tr(
                        '$ 업무지시 내용이 신규 프로젝트의 핵심 목표로 자동 반영됩니다.',
                        'The $ directive text is automatically used as the new project core goal.',
                        '$業務指示の内容が新規プロジェクトのコア目標として自動反映されます。',
                        '$ 指令内容会自动作为新项目核心目标。',
                      )}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateProject}
                      disabled={
                        !newProjectName.trim()
                        || !newProjectPath.trim()
                        || !(isDirectivePending ? (pendingSend?.content ?? '').trim() : newProjectGoal.trim())
                        || projectSaving
                      }
                      className="flex-1 rounded bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
                    >
                      {projectSaving
                        ? tr('등록 중...', 'Creating...', '作成中...', '创建中...')
                        : tr('등록 후 선택', 'Create & Select', '作成して選択', '创建并选择')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectFlowStep('choose')}
                      className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300"
                    >
                      {tr('뒤로', 'Back', '戻る', '返回')}
                    </button>
                  </div>
                </>
              )}

              {projectFlowStep === 'confirm' && selectedProject && (
                <>
                  <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                    <p className="text-xs font-semibold text-white">{selectedProject.name}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{selectedProject.project_path}</p>
                    <p className="mt-1 text-[11px] text-slate-300">{selectedProject.core_goal}</p>
                  </div>
                  <div className="rounded-lg border border-blue-700/40 bg-blue-900/20 p-3 text-[11px] text-blue-100">
                    <p className="font-medium">{tr('라운드 목표', 'Round Goal', 'ラウンド目標', '回合目标')}</p>
                    <p className="mt-1 leading-relaxed">
                      {tr(
                        `프로젝트 핵심목표(${selectedProject.core_goal})를 기준으로 이번 요청(${pendingSend?.content ?? ''})을 실행 가능한 산출물로 완수`,
                        `Execute this round with project core goal (${selectedProject.core_goal}) and current request (${pendingSend?.content ?? ''}).`,
                        `プロジェクト目標(${selectedProject.core_goal})と今回依頼(${pendingSend?.content ?? ''})を基準に実行可能な成果物を完了します。`,
                        `以项目核心目标（${selectedProject.core_goal}）和本次请求（${pendingSend?.content ?? ''}）为基础完成本轮可执行产出。`,
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmProject}
                      className="flex-1 rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500"
                    >
                      {tr('선택 후 전송', 'Select & Send', '選択して送信', '选择并发送')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectFlowStep('choose')}
                      className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300"
                    >
                      {tr('다시 선택', 'Re-select', '再選択', '重新选择')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <div
          className={`flex items-end gap-2 bg-gray-800 rounded-2xl border transition-colors ${isDirectiveMode
              ? 'border-red-500/50 focus-within:border-red-400'
              : isAnnouncementMode
                ? 'border-yellow-500/50 focus-within:border-yellow-400'
                : mode === 'task'
                  ? 'border-blue-500/50 focus-within:border-blue-400'
                  : mode === 'report'
                    ? 'border-emerald-500/50 focus-within:border-emerald-400'
                    : 'border-gray-600 focus-within:border-blue-500'
            }`}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isAnnouncementMode
                ? tr('전사 공지 내용을 입력하세요...', 'Write an announcement...', '全体告知内容を入力してください...', '请输入公告内容...')
                : mode === 'task'
                  ? tr('업무 지시 내용을 입력하세요...', 'Write a task instruction...', 'タスク指示内容を入力してください...', '请输入任务指示内容...')
                  : mode === 'report'
                    ? tr('보고 요청 내용을 입력하세요...', 'Write a report request...', 'レポート依頼内容を入力してください...', '请输入报告请求内容...')
                    : selectedAgent
                      ? tr(
                        `${getAgentName(selectedAgent)}에게 메시지 보내기...`,
                        `Send a message to ${getAgentName(selectedAgent)}...`,
                        `${getAgentName(selectedAgent)}にメッセージを送る...`,
                        `向 ${getAgentName(selectedAgent)} 发送消息...`
                      )
                      : tr('메시지를 입력하세요...', 'Type a message...', 'メッセージを入力してください...', '请输入消息...')
            }
            rows={1}
            className="flex-1 bg-transparent text-gray-100 text-sm placeholder-gray-500 resize-none px-4 py-3 focus:outline-none max-h-32 min-h-[44px] overflow-y-auto leading-relaxed"
            style={{
              scrollbarWidth: 'none',
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={`flex-shrink-0 w-9 h-9 mb-2 mr-2 rounded-xl flex items-center justify-center transition-all ${input.trim()
                ? isDirectiveMode
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : isAnnouncementMode
                    ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-900'
                    : mode === 'task'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : mode === 'report'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-600 cursor-not-allowed'
              }`}
            aria-label={tr('전송', 'Send', '送信', '发送')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5 px-1">
          {tr('Enter로 전송, Shift+Enter로 줄바꿈', 'Press Enter to send, Shift+Enter for a new line', 'Enterで送信、Shift+Enterで改行', '按 Enter 发送，Shift+Enter 换行')}
        </p>
      </div>
    </div>
  );
}
