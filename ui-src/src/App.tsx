import { useEffect, useState, useCallback, Component, useRef } from "react";
import Sidebar from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { TacticalMetrics } from "./components/TacticalMetrics";
import { TacticalGrid } from "./components/TacticalGrid";
import { NexusConsole } from "./components/NexusConsole";
import { DepartmentAnalytics } from "./components/DepartmentAnalytics";
import { AgentLeaderboard } from "./components/AgentLeaderboard";

// Legacy views for restoration
import OfficeView from "./components/OfficeView";
import TaskBoard from "./components/TaskBoard";
import SkillsLibrary from "./components/SkillsLibrary";
import SettingsPanel from "./components/SettingsPanel";
import { MissionControl } from "./components/MissionControl";
import IntelligenceLab from "./components/IntelligenceLab";
import AgentDetail from "./components/AgentDetail";
import { ChatPanel } from "./components/ChatPanel";
import SwarmLink from "./components/SwarmLink";
import LeaderDashboard from "./components/LeaderDashboard";

import { useWebSocket } from "./hooks/useWebSocket";
import * as api from "./api";
import type {
  Agent,
  Task,
  Message,
  Department,
  CompanySettings,
  NexusMetrics,
  TaskType,
  SubTask,
  Project,
  CliStatusMap
} from "./types";

type View = "office" | "dashboard" | "tasks" | "skills" | "settings" | "mission-control" | "intelligence" | "swarm" | "leader";

// Error Boundary to prevent whole-app crashes from one view
class ViewErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('[ViewErrorBoundary]', error); }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-6 max-w-lg w-full text-center">
            <div className="text-red-400 text-2xl mb-3">⚠️</div>
            <h3 className="text-red-300 font-bold mb-2">Component Error</h3>
            <pre className="text-red-400/70 text-xs overflow-auto max-h-48 text-left bg-black/30 rounded p-3">{err.message}</pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-lg text-sm font-semibold transition-all"
            >Retry</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatAgent, setChatAgent] = useState<Agent | null>(null);
  const [metrics, setMetrics] = useState<NexusMetrics | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [cliStatus, setCliStatus] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [meetingPresence, setMeetingPresence] = useState<any[]>([]);
  const [assignTaskAgentId, setAssignTaskAgentId] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef(0);
  const EMPTY_ARRAY = useRef([]).current;
  const EMPTY_FN = useCallback(() => { }, []);

  // WebSocket for real-time reactivity
  const { connected, on } = useWebSocket();

  const fetchData = useCallback(async (forced = false) => {
    // Throttle fetches to at most once per second unless forced
    const now = Date.now();
    if (!forced && now - lastFetchRef.current < 1000) return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    lastFetchRef.current = now;

    try {
      const [m, ags, tks, depts, msgs, sets, cli, projs, pres] = await Promise.all([
        api.getNexusMetrics(),
        api.getAgents(),
        api.getTasks(),
        api.getDepartments(),
        api.getMessages({ limit: 100 }),
        api.getSettings(),
        api.getCliStatus(),
        api.getProjects(),
        api.getMeetingPresence()
      ]);
      setMetrics(m);
      setAgents(ags);
      setTasks(tks);
      setDepartments(depts);
      setMessages(msgs);
      setSettings(sets);
      setCliStatus(cli);
      setProjects(projs.projects);
      setMeetingPresence(pres);
    } catch (err) {
      console.error("Nexus Data Retrieval Failed:", err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const handleRefresh = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time Event Handling
  useEffect(() => {
    if (!on) return;
    const unsubs = [
      on("task_update", () => fetchData()),
      on("agent_status", () => fetchData()),
      on("new_message", (payload: any) => {
        console.log('[WebSocket] new_message received:', payload);
        if (!payload || typeof payload !== 'object') {
          console.error('[WebSocket] Invalid message payload:', payload);
          return;
        }
        setMessages(prev => {
          const newMsg = payload as Message;
          // Validate message has required fields
          if (!newMsg.id) {
            console.error('[WebSocket] Message missing id:', newMsg);
            return prev;
          }
          // Prevent duplicates
          if (prev.some(m => m.id === newMsg.id)) {
            console.log('[WebSocket] Duplicate message, skipping:', newMsg.id);
            return prev;
          }
          console.log('[WebSocket] Adding new message to state:', newMsg.id, 'Type:', newMsg.message_type, 'Content:', newMsg.content.substring(0, 30));
          const updated = [newMsg, ...prev].slice(0, 100);
          console.log('[WebSocket] Updated messages count:', updated.length);
          return updated;
        });
      }),
      on("cli_output", () => fetchData()),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, [on, fetchData]);

  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  // Operational Handlers
  const handleCreateTask = useCallback(async (input: any) => {
    await api.createTask({
      ...input,
      task_type: (input.task_type as TaskType) || 'general'
    });
    fetchData(true);
  }, [fetchData]);

  const handleUpdateTask = useCallback(async (id: string, data: any) => {
    await api.updateTask(id, data);
    fetchData(true);
  }, [fetchData]);

  const handleAssignTask = useCallback(async (id: string, agentId: string) => {
    await api.assignTask(id, agentId);
    fetchData(true);
  }, [fetchData]);

  const handleRunTask = useCallback(async (id: string) => {
    await api.runTask(id);
    fetchData(true);
  }, [fetchData]);

  const handleDeleteTask = useCallback(async (id: string) => {
    await api.deleteTask(id);
    fetchData(true);
  }, [fetchData]);

  const handleStopTask = useCallback(async (id: string) => {
    await api.stopTask(id);
    fetchData(true);
  }, [fetchData]);

  const handlePauseTask = useCallback(async (id: string) => {
    await api.pauseTask(id);
    fetchData(true);
  }, [fetchData]);

  const handleResumeTask = useCallback(async (id: string) => {
    await api.resumeTask(id);
    fetchData(true);
  }, [fetchData]);

  const renderView = () => {
    switch (view) {
      case "dashboard":
        return (
          <div className="flex flex-col gap-6 p-8 h-fit custom-scrollbar selection:bg-[var(--nexus-accent-dim)]">
            <TacticalMetrics metrics={metrics} />
            <div className="flex flex-col xl:flex-row gap-6">
              <div className="flex-[3] min-w-0">
                <TacticalGrid agents={agents} tasks={tasks} />
              </div>
              <div className="flex-[2] min-w-0 flex flex-col gap-6">
                <div className="flex-none">
                  <DepartmentAnalytics analytics={metrics?.departmentAnalytics || []} />
                </div>
                <div className="flex-none">
                  <AgentLeaderboard leaderboard={metrics?.leaderboard || []} />
                </div>
              </div>
            </div>
            <div className="h-auto min-h-[400px]">
              <NexusConsole messages={messages} />
            </div>
          </div>
        );
      case "office":
        return (
          <OfficeView
            departments={departments}
            agents={agents}
            tasks={tasks}
            meetingPresence={meetingPresence}
            subAgents={EMPTY_ARRAY}
            onSelectAgent={setSelectedAgent}
            onSelectDepartment={EMPTY_FN}
            onCrossDeptDeliveryProcessed={handleRefresh}
            onCeoOfficeCallProcessed={handleRefresh}
          />
        );
      case "tasks":
        return (
          <TaskBoard
            tasks={tasks}
            agents={agents}
            departments={departments}
            subtasks={subtasks}
            onCreateTask={async (input) => {
              await handleCreateTask({
                ...input,
                assigned_agent_id: assignTaskAgentId || input.assigned_agent_id
              });
              setAssignTaskAgentId(null);
            }}
            onAssignTask={handleAssignTask}
            onStatusChange={(id, status) => handleUpdateTask(id, { status })}
            onPriorityChange={(id, priority) => handleUpdateTask(id, { priority })}
            onRunTask={handleRunTask}
            onStopTask={handleStopTask}
            onPauseTask={handlePauseTask}
            onResumeTask={handleResumeTask}
            onDeleteTask={handleDeleteTask}
            onMergeTask={async (id) => { await api.mergeTask(id); fetchData(); }}
            onDiscardTask={async (id) => { await api.discardTask(id); fetchData(); }}
            initialShowCreate={showCreateTaskModal}
            onCloseCreate={() => {
              setShowCreateTaskModal(false);
              setAssignTaskAgentId(null);
            }}
          />
        );
      case "skills":
        return <SkillsLibrary agents={agents} />;
      case "settings":
        return settings ? (
          <ViewErrorBoundary key={view}>
            <SettingsPanel
              agents={agents}
              settings={settings}
              cliStatus={cliStatus}
              onSave={async (s) => { await api.saveSettings(s); fetchData(); }}
              onRefreshCli={() => api.getCliStatus(true).then(setCliStatus)}
            />
          </ViewErrorBoundary>
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-500">Loading settings...</div>
        );
      case "mission-control":
        return (
          <MissionControl
            agents={agents}
            tasks={tasks}
            projects={projects}
            messages={messages}
            metrics={metrics}
            settings={settings}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onCreateProject={async (p) => { await api.createProject(p); fetchData(); }}
          />
        );
      case "swarm":
        return (
          <ViewErrorBoundary key={view}>
            <SwarmLink
              agents={agents}
              tasks={tasks}
              messages={messages}
              departments={departments}
              onChatAgent={(agent) => setChatAgent(agent)}
            />
          </ViewErrorBoundary>
        );
      case "intelligence":
        return (
          <ViewErrorBoundary key={view}>
            <IntelligenceLab agents={agents} />
          </ViewErrorBoundary>
        );
      case "leader":
        return (
          <ViewErrorBoundary key={view}>
            <LeaderDashboard />
          </ViewErrorBoundary>
        );
      default:
        return <div className="p-8 font-mono text-red-500">ERROR: UNKNOWN_VIEW_CONTEXT</div>;
    }
  };

  if (loading && !metrics) {
    return (
      <div className="h-screen w-screen bg-[#09090b] flex flex-col items-center justify-center font-sans">
        <img src="/logo-pixel.png" alt="NexusClaw" className="w-32 h-32 object-contain mb-8 animate-pulse" />
        <div className="w-64 h-2 bg-slate-800 rounded-full relative overflow-hidden mb-4">
          <div className="absolute inset-x-0 h-full bg-cyan-500 animate-[loading-bar_2s_infinite] rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
        </div>
        <div className="text-cyan-500 text-sm font-bold tracking-widest animate-pulse uppercase shadow-cyan-500">
          Initializing Workspace...
        </div>
      </div>
    );
  }

  return (
    <div aria-label="Main Application" className="flex h-screen w-full bg-[var(--nexus-bg)] text-[var(--nexus-text-primary)] overflow-hidden font-sans">
      {/* Sidebar - Fix to full height left side */}
      <Sidebar
        currentView={view}
        onChangeView={setView}
        departments={departments}
        agents={agents}
        settings={settings!}
        connected={connected}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--nexus-bg)] overflow-hidden">
        <TopBar
          currentView={view}
          onChangeView={setView}
          onRefreshCli={() => api.getCliStatus(true).then(setCliStatus)}
          onCreateTask={() => setShowCreateTaskModal(true)}
        />

        <main className="flex-1 overflow-y-auto px-2 pb-6 custom-scrollbar relative">
          {renderView()}
        </main>
      </div>

      {!connected && (
        <div className="fixed bottom-4 right-4 px-4 py-2 bg-red-900/50 backdrop-blur-md text-red-400 text-sm font-bold tracking-wide rounded-lg shadow-lg border border-red-500/30 animate-pulse z-50">
          Connection Interrupted: Recovering...
        </div>
      )}

      {selectedAgent && (
        <AgentDetail
          agent={selectedAgent}
          agents={agents}
          department={departments.find(d => d.id === selectedAgent.department_id)}
          departments={departments}
          tasks={tasks}
          subAgents={[]}
          subtasks={subtasks}
          onClose={() => setSelectedAgent(null)}
          onChat={(agent) => {
            setSelectedAgent(null);
            setChatAgent(agent);
          }}
          onAssignTask={(agentId) => {
            setSelectedAgent(null);
            setAssignTaskAgentId(agentId);
            setView('tasks');
            setShowCreateTaskModal(true);
          }}
          onAgentUpdated={handleRefresh}
        />
      )}

      {chatAgent && (
        <ChatPanel
          selectedAgent={chatAgent}
          messages={(messages || []).filter(m =>
            m && (
              (m.receiver_type === 'agent' && m.receiver_id === chatAgent.id) ||
              m.sender_id === chatAgent.id ||
              m.message_type === 'announcement' ||
              m.message_type === 'directive' ||
              m.receiver_type === 'all'
            )
          )}
          agents={agents}
          onSendMessage={async (content: string, receiverType: 'agent' | 'department' | 'all', receiverId?: string, messageType?: string, projectMeta?: any) => {
            await api.sendMessage({
              receiver_type: receiverType,
              receiver_id: receiverId,
              content,
              message_type: (messageType as any),
              project_id: projectMeta?.project_id,
              project_path: projectMeta?.project_path,
              project_context: projectMeta?.project_context,
            });
            // Real-time updates handled by WebSocket listener
          }}
          onSendAnnouncement={async (content: string) => {
            console.log('[App] Sending announcement:', content);
            const result = await api.sendMessage({
              receiver_type: 'all',
              content,
              message_type: 'announcement',
            });
            console.log('[App] Announcement sent, message ID:', result);
            console.log('[App] Current messages count:', messages.length);
            // Real-time updates handled by WebSocket listener
          }}
          onSendDirective={async (content: string, projectMeta?: any) => {
            await api.sendMessage({
              receiver_type: 'all',
              content,
              message_type: 'directive',
              project_id: projectMeta?.project_id,
              project_path: projectMeta?.project_path,
              project_context: projectMeta?.project_context,
            });
            // Real-time updates handled by WebSocket listener
          }}
          onClearMessages={async (agentId?: string) => {
            // TODO: Implement clear messages API
            console.log('Clear messages for agent:', agentId);
          }}
          onClose={() => setChatAgent(null)}
        />
      )}
    </div>
  );
}
