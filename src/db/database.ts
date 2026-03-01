/**
 * SQLite database layer — local-first persistence for tasks, agents, departments, skills.
 * Powered by node:sqlite (Node 22.5+) for zero-config embedded storage.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Types
export interface Agent {
    id: string;
    name: string;
    role: string;
    department_id: string;
    status: 'idle' | 'working' | 'break' | 'meeting' | 'offline';
    xp: number;
    level: number;
    avatar: string;
    tasks_completed: number;
    created_at: number;
    updated_at: number;
    cli_provider?: string;
    api_model?: string;
    personality?: string;
    current_task_id?: string | null;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'inbox' | 'planned' | 'collaborating' | 'in_progress' | 'review' | 'done' | 'cancelled';
    priority: number;
    assigned_agent_id: string | null;
    department_id: string;
    project_id: string | null;
    project_path: string;
    task_type: string;
    created_at: number;
    updated_at: number;
    completed_at: number | null;
    report_archive_id?: string | null;
}

export interface Department {
    id: string;
    name: string;
    icon: string;
    color: string;
}

export interface Project {
    id: string;
    name: string;
    project_path: string;
    core_goal: string;
    created_at: number;
    updated_at: number;
}

export interface Message {
    id: string;
    content: string;
    sender_type: string;
    sender_id: string | null;
    receiver_type: string;
    receiver_id: string | null;
    message_type: string;
    task_id: string | null;
    project_id: string | null;
    created_at: number;
}

export interface TaskLog {
    id: number;
    task_id: string;
    kind: string;
    message: string;
    created_at: number;
}

export interface Subtask {
    id: string;
    task_id: string;
    title: string;
    status: 'todo' | 'in_progress' | 'done' | 'cancelled';
    priority: number;
    created_at: number;
}

export interface Worktree {
    id: string;
    name: string;
    path: string;
    repo_url: string;
    created_at: number;
}

export interface AuthToken {
    provider: string;
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
    scope?: string;
}

export interface CronJobData {
    id: string;
    schedule: string;
    description: string;
    command: string;
    enabled: number;
    timeout: number;
    last_run?: number;
}

/**
 * Database Proxy for local SQLite persistence.
 */
export class Database {
    private db: DatabaseSync;
    private dbPath: string;

    constructor(storageDir: string) {
        if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true });
        this.dbPath = join(storageDir, 'claw.db');
        this.db = new DatabaseSync(this.dbPath);
        this.init();
    }

    private init() {
        // Core Schema
        const runSql = this.db.exec.bind(this.db);
        runSql(`
            CREATE TABLE IF NOT EXISTS departments (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT,
                color TEXT
            );

            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT,
                department_id TEXT,
                status TEXT DEFAULT 'idle',
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                avatar TEXT,
                tasks_completed INTEGER DEFAULT 0,
                cli_provider TEXT,
                api_model TEXT,
                personality TEXT,
                current_task_id TEXT,
                created_at INTEGER,
                updated_at INTEGER,
                FOREIGN KEY(department_id) REFERENCES departments(id)
            );

            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                project_path TEXT,
                core_goal TEXT,
                created_at INTEGER,
                updated_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'inbox',
                priority INTEGER DEFAULT 1,
                assigned_agent_id TEXT,
                department_id TEXT,
                project_id TEXT,
                project_path TEXT,
                task_type TEXT DEFAULT 'general',
                created_at INTEGER,
                updated_at INTEGER,
                completed_at INTEGER,
                report_archive_id TEXT,
                FOREIGN KEY(assigned_agent_id) REFERENCES agents(id),
                FOREIGN KEY(department_id) REFERENCES departments(id),
                FOREIGN KEY(project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                sender_type TEXT,
                sender_id TEXT,
                receiver_type TEXT,
                receiver_id TEXT,
                message_type TEXT DEFAULT 'chat',
                task_id TEXT,
                project_id TEXT,
                created_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS task_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                kind TEXT,
                message TEXT,
                created_at INTEGER,
                FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE TABLE IF NOT EXISTS learned_skills (
                repo TEXT,
                skill_id TEXT,
                provider TEXT,
                learned_at INTEGER,
                PRIMARY KEY (repo, skill_id, provider)
            );

            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                task_id TEXT,
                title TEXT NOT NULL,
                description TEXT,
                attendees TEXT,
                minutes TEXT,
                status TEXT DEFAULT 'scheduled',
                created_at INTEGER,
                updated_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS oauth_accounts (
                provider TEXT PRIMARY KEY,
                account_name TEXT,
                status TEXT DEFAULT 'disconnected',
                last_synced_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS mission_control_state (
                id TEXT PRIMARY KEY DEFAULT 'singleton',
                state_json TEXT NOT NULL,
                updated_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS api_providers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT,
                base_url TEXT,
                api_key TEXT,
                enabled INTEGER DEFAULT 1,
                created_at INTEGER,
                updated_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS subtasks (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                title TEXT NOT NULL,
                status TEXT DEFAULT 'todo',
                priority INTEGER DEFAULT 1,
                created_at INTEGER,
                FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS worktrees (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                repo_url TEXT,
                created_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS auth_tokens (
                provider TEXT PRIMARY KEY,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                expires_at INTEGER,
                scope TEXT
            );

            CREATE TABLE IF NOT EXISTS cron_jobs (
                id TEXT PRIMARY KEY,
                schedule TEXT NOT NULL,
                description TEXT,
                command TEXT,
                enabled INTEGER DEFAULT 1,
                timeout INTEGER DEFAULT 300000,
                last_run INTEGER
            );

            CREATE TABLE IF NOT EXISTS webhooks (
                id TEXT PRIMARY KEY,
                platform TEXT NOT NULL,
                event TEXT,
                intent TEXT,
                urgency INTEGER DEFAULT 5,
                department TEXT,
                suggested_agent TEXT,
                should_auto_act INTEGER DEFAULT 0,
                suggested_action TEXT,
                payload TEXT,
                headers TEXT,
                classification TEXT,
                status TEXT DEFAULT 'received',
                created_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS swarm_jobs (
                id TEXT PRIMARY KEY,
                total_tasks INTEGER DEFAULT 0,
                succeeded INTEGER DEFAULT 0,
                failed INTEGER DEFAULT 0,
                concurrency INTEGER DEFAULT 8,
                wall_duration INTEGER DEFAULT 0,
                parallel_speedup REAL DEFAULT 1.0,
                status TEXT DEFAULT 'running',
                results TEXT,
                created_at INTEGER,
                completed_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS timelines (
                id TEXT PRIMARY KEY,
                session_key TEXT,
                parent_id TEXT,
                fork_point INTEGER,
                agent_id TEXT,
                model TEXT,
                status TEXT DEFAULT 'recording',
                event_count INTEGER DEFAULT 0,
                total_tool_calls INTEGER DEFAULT 0,
                total_llm_calls INTEGER DEFAULT 0,
                total_errors INTEGER DEFAULT 0,
                total_duration INTEGER DEFAULT 0,
                created_at INTEGER,
                completed_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS timeline_events (
                id TEXT PRIMARY KEY,
                timeline_id TEXT NOT NULL,
                sequence INTEGER NOT NULL,
                type TEXT NOT NULL,
                timestamp INTEGER,
                data TEXT,
                FOREIGN KEY (timeline_id) REFERENCES timelines(id)
            );

            CREATE TABLE IF NOT EXISTS skill_transfers (
                id TEXT PRIMARY KEY,
                source_agent_id TEXT,
                target_agent_id TEXT,
                skill TEXT,
                status TEXT DEFAULT 'active',
                expires_at INTEGER,
                reason TEXT,
                created_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS fusion_sessions (
                id TEXT PRIMARY KEY,
                name TEXT,
                agent_ids TEXT,
                combined_skills TEXT,
                status TEXT DEFAULT 'active',
                task_description TEXT,
                created_at INTEGER
            );
        `);

        // Seed default departments if empty
        const deptCount = (this.db.prepare("SELECT COUNT(*) as count FROM departments").get() as any).count;
        if (deptCount === 0) {
            const insertDept = this.db.prepare("INSERT INTO departments (id, name, icon, color) VALUES (?, ?, ?, ?)");
            const defaults = [
                ['planning', 'Planning', '📋', '#3B82F6'],
                ['development', 'Development', '💻', '#10B981'],
                ['design', 'Design', '🎨', '#F59E0B'],
                ['qa', 'QA/QC', '🧪', '#EF4444'],
                ['devsecops', 'DevSecOps', '🔒', '#8B5CF6'],
                ['operations', 'Operations', '⚙️', '#6366F1']
            ];
            for (const d of defaults) insertDept.run(...d);

            // Seed initial agents
            const insertAgent = this.db.prepare(`
                INSERT INTO agents (id, name, role, department_id, avatar, cli_provider, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const now = Date.now();
            const agents = [
                ['agent-001', 'Cipher', 'team_leader', 'planning', '🏗️', 'claude', now, now],
                ['agent-002', 'Elena', 'senior', 'development', '⚡', 'codex', now, now],
                ['agent-000', 'Sheldon', 'supreme_leader', 'planning', '🧠', 'gpt-4o', now, now],
                ['agent-003', 'Alex', 'senior', 'design', '🎨', 'gemini', now, now],
                ['agent-004', 'Mia', 'junior', 'qa', '🛡️', 'opencode', now, now],
                ['agent-005', 'Zane', 'senior', 'devsecops', '🔐', 'copilot', now, now],
                ['agent-006', 'Liam', 'junior', 'operations', '🔄', 'antigravity', now, now]
            ];
            for (const a of agents) insertAgent.run(...a);

            // Seed initial OAuth providers
            const insertOauth = this.db.prepare("INSERT INTO oauth_accounts (provider, account_name, status, last_synced_at) VALUES (?, ?, ?, ?)");
            insertOauth.run('antigravity', 'nexus-admin', 'connected', now);
            insertOauth.run('github-copilot', null, 'disconnected', null);

            // Seed a welcome meeting
            this.createMeeting({
                title: 'NexusClaw Initialization Sync',
                description: 'Initial architectural review and system checkout.',
                attendees: ['Cipher', 'Elena', 'CEO'],
                status: 'completed'
            });
        }

        // Apply migrations for existing agents to fix roles and assign default CLI providers
        const runSql2 = this.db.exec.bind(this.db);
        runSql2(`
            UPDATE agents SET role = 'team_leader' WHERE role = 'Lead Architect';
            UPDATE agents SET role = 'senior' WHERE role = 'Senior Developer';
            UPDATE agents SET role = 'senior' WHERE role = 'UI/UX Designer';
            UPDATE agents SET role = 'junior' WHERE role = 'QA Engineer';
            UPDATE agents SET role = 'senior' WHERE role = 'Security Analyst';
            UPDATE agents SET role = 'junior' WHERE role = 'DevOps Engineer';
            
            UPDATE agents SET name = 'Cipher' WHERE id = 'agent-001';
            UPDATE agents SET name = 'Elena' WHERE id = 'agent-002';
            UPDATE agents SET name = 'Sheldon', role = 'supreme_leader' WHERE id = 'agent-003';
            UPDATE agents SET name = 'Mia' WHERE id = 'agent-004';
            UPDATE agents SET name = 'Zane' WHERE id = 'agent-005';
            UPDATE agents SET name = 'Liam' WHERE id = 'agent-006';

            UPDATE agents SET cli_provider = 'claude' WHERE id = 'agent-001' AND cli_provider IS NULL;
            UPDATE agents SET cli_provider = 'codex' WHERE id = 'agent-002' AND cli_provider IS NULL;
            UPDATE agents SET cli_provider = 'gemini' WHERE id = 'agent-003' AND cli_provider IS NULL;
            UPDATE agents SET cli_provider = 'opencode' WHERE id = 'agent-004' AND cli_provider IS NULL;
            UPDATE agents SET cli_provider = 'copilot' WHERE id = 'agent-005' AND cli_provider IS NULL;
            UPDATE agents SET cli_provider = 'antigravity' WHERE id = 'agent-006' AND cli_provider IS NULL;
            UPDATE agents SET cli_provider = 'opencode' WHERE cli_provider IS NULL;
        `);
    }

    /**
     * Resets stale agent and task states on system startup.
     * Use this to ensure agents are 'idle' and tasks are correctly transitioned
     * out of 'in_progress' if the system was shut down unexpectedly.
     */
    cleanupStaleState(): void {
        // 1. Reset all agents to idle and clear current_task_id
        this.db.prepare(`
            UPDATE agents 
            SET status = 'idle', current_task_id = NULL 
            WHERE status != 'offline'
        `).run();

        // 2. Transition 'in_progress' tasks back to 'planned' so they appear resumable
        this.db.prepare(`
            UPDATE tasks 
            SET status = 'planned' 
            WHERE status = 'in_progress'
        `).run();
    }

    // ── Departments ──
    getDepartments(): Department[] {
        return this.db.prepare("SELECT * FROM departments").all() as unknown as Department[];
    }

    // ── Agents ──
    getAgents(): (Agent & { department_name?: string })[] {
        return this.db.prepare(`
            SELECT a.*, d.name as department_name 
            FROM agents a
            LEFT JOIN departments d ON a.department_id = d.id
        `).all() as any[];
    }

    /**
     * Get an agent by ID.
     */
    getAgent(id: string): Agent | undefined {
        return this.db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Agent | undefined;
    }

    updateAgent(id: string, updates: Partial<Agent>): void {
        const keys = Object.keys(updates);
        if (keys.length === 0) return;
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates);
        this.db.prepare(`UPDATE agents SET ${setClause}, updated_at = ? WHERE id = ?`)
            .run(...values, Date.now(), id);
    }

    createAgent(data: Partial<Agent>): string {
        const id = `agent-${Math.random().toString(36).slice(2, 7)}`;
        const now = Date.now();
        const fields = ['id', 'name', 'role', 'department_id', 'status', 'xp', 'level', 'avatar', 'cli_provider', 'tasks_completed', 'created_at', 'updated_at'];
        const values = [
            id,
            data.name || 'New Agent',
            data.role || 'junior',
            data.department_id || 'planning',
            'idle',
            0,
            1,
            data.avatar || '🤖',
            data.cli_provider || 'opencode',
            0,
            now,
            now
        ];
        const placeholders = fields.map(() => '?').join(', ');
        this.db.prepare(`INSERT INTO agents (${fields.join(', ')}) VALUES (${placeholders})`).run(...values);
        return id;
    }

    // ── Projects ──
    getProjects(): Project[] {
        return this.db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all() as unknown as Project[];
    }

    getProject(id: string): Project | undefined {
        return this.db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
    }

    createProject(data: Partial<Project>): string {
        const id = data.id || `proj_${Math.random().toString(36).slice(2, 7)}`;
        const now = Date.now();
        this.db.prepare(`
            INSERT INTO projects (id, name, project_path, core_goal, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            id,
            data.name || 'Untitled Project',
            data.project_path || '',
            data.core_goal || '',
            now,
            now
        );
        return id;
    }

    updateProject(id: string, updates: Partial<Project>): void {
        const keys = Object.keys(updates);
        if (keys.length === 0) return;
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates);
        this.db.prepare(`UPDATE projects SET ${setClause}, updated_at = ? WHERE id = ?`)
            .run(...values, Date.now(), id);
    }

    deleteProject(id: string): void {
        this.db.prepare("DELETE FROM projects WHERE id = ?").run(id);
    }

    // ── Tasks ──
    getTasks(filters?: { status?: string; department_id?: string; assigned_agent_id?: string; project_id?: string }): Task[] {
        let query = "SELECT * FROM tasks WHERE 1=1";
        const params: any[] = [];
        if (filters?.status) { query += " AND status = ?"; params.push(filters.status); }
        if (filters?.department_id) { query += " AND department_id = ?"; params.push(filters.department_id); }
        if (filters?.assigned_agent_id) { query += " AND assigned_agent_id = ?"; params.push(filters.assigned_agent_id); }
        if (filters?.project_id) { query += " AND project_id = ?"; params.push(filters.project_id); }
        query += " ORDER BY updated_at DESC";
        return this.db.prepare(query).all(...params) as unknown as Task[];
    }

    createTask(data: Partial<Task>): string {
        const id = `task_${Math.random().toString(36).slice(2, 7)}`;
        const now = Date.now();
        const fields = ['id', 'title', 'description', 'status', 'priority', 'department_id', 'project_id', 'project_path', 'task_type', 'created_at', 'updated_at'];
        const values = [
            id,
            data.title || 'New Task',
            data.description || '',
            data.status || 'inbox',
            data.priority ?? 1,
            data.department_id || 'planning',
            data.project_id || null,
            data.project_path || '',
            data.task_type || 'general',
            now,
            now
        ];
        const placeholders = fields.map(() => '?').join(', ');
        this.db.prepare(`INSERT INTO tasks (${fields.join(', ')}) VALUES (${placeholders})`).run(...values);
        return id;
    }

    updateTask(id: string, updates: Partial<Task>): void {
        const keys = Object.keys(updates);
        if (keys.length === 0) return;
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates);
        this.db.prepare(`UPDATE tasks SET ${setClause}, updated_at = ? WHERE id = ?`)
            .run(...values, Date.now(), id);
    }

    deleteTask(id: string): void {
        this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    }

    // ── Logs & Messages ──
    addTaskLog(taskId: string, kind: string, message: string): void {
        this.db.prepare("INSERT INTO task_logs (task_id, kind, message, created_at) VALUES (?, ?, ?, ?)")
            .run(taskId, kind, message, Date.now());
    }

    getTaskLogs(taskId: string, limit = 100): TaskLog[] {
        return this.db.prepare("SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at DESC LIMIT ?")
            .all(taskId, limit) as unknown as TaskLog[];
    }

    addMessage(data: Partial<Message>): string {
        const id = `msg_${Math.random().toString(36).slice(2, 7)}`;
        const now = Date.now();
        this.db.prepare(`
            INSERT INTO messages (id, content, sender_type, sender_id, receiver_type, receiver_id, message_type, task_id, project_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            data.content || '',
            data.sender_type || 'system',
            data.sender_id || null,
            data.receiver_type || 'all',
            data.receiver_id || null,
            data.message_type || 'chat',
            data.task_id || null,
            data.project_id || null,
            now
        );
        return id;
    }

    getMessages(limit = 50): Message[] {
        return this.db.prepare("SELECT * FROM messages ORDER BY created_at DESC LIMIT ?").all(limit) as unknown as Message[];
    }

    clearMessages(): number {
        const result = this.db.prepare("DELETE FROM messages").run();
        return Number(result.changes);
    }

    // ── Nexus Metrics & Analytics ──
    getNexusMetrics() {
        const tasks = this.db.prepare("SELECT status, COUNT(*) as count FROM tasks GROUP BY status").all() as any[];
        const agents = this.db.prepare("SELECT * FROM agents").all() as unknown as Agent[];
        const depts = this.db.prepare("SELECT * FROM departments").all() as unknown as Department[];
        const xp = this.db.prepare("SELECT SUM(xp) as total FROM agents").get() as any;

        // Get tasks completed today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayTimestamp = todayStart.getTime();
        const completedToday = this.db.prepare(
            "SELECT COUNT(*) as count FROM tasks WHERE status = 'done' AND completed_at >= ?"
        ).get(todayTimestamp) as any;

        const metrics: any = {
            totalTasks: 0,
            completedTasks: 0,
            activeTasks: 0,
            completedToday: completedToday?.count || 0,
            totalExperience: xp?.total || 0,
            activeAgents: 0,
            tasksByStatus: { inbox: 0, planned: 0, in_progress: 0, review: 0, done: 0 },
            leaderboard: agents.sort((a, b) => b.xp - a.xp).slice(0, 10),
            departmentAnalytics: depts.map(d => ({
                ...d,
                agentCount: agents.filter(a => a.department_id === d.id).length,
                tasksActive: (this.db.prepare("SELECT COUNT(*) as count FROM tasks WHERE department_id = ? AND status != 'done'").get(d.id) as any).count
            }))
        };

        for (const row of tasks) {
            metrics.totalTasks += row.count;
            if (row.status === 'done') metrics.completedTasks = row.count;
            if (row.status !== 'done' && row.status !== 'cancelled') metrics.activeTasks += row.count;
            if (metrics.tasksByStatus[row.status] !== undefined) metrics.tasksByStatus[row.status] = row.count;
        }

        for (const a of agents) {
            if (a.status !== 'offline') metrics.activeAgents++;
        }

        return metrics;
    }

    // ── Skills ──
    getLearnedSkills(provider?: string) {
        if (provider) {
            return this.db.prepare("SELECT * FROM learned_skills WHERE provider = ? ORDER BY learned_at DESC").all(provider) as any[];
        }
        return this.db.prepare("SELECT * FROM learned_skills ORDER BY learned_at DESC").all() as any[];
    }

    addLearnedSkill(repo: string, skill_id: string, provider: string) {
        this.db.prepare(`
            INSERT OR REPLACE INTO learned_skills (repo, skill_id, provider, learned_at)
            VALUES (?, ?, ?, ?)
        `).run(repo, skill_id, provider, Date.now());
    }

    removeLearnedSkill(repo: string, skill_id: string, provider: string) {
        const result = this.db.prepare(`
            DELETE FROM learned_skills WHERE repo = ? AND skill_id = ? AND provider = ?
        `).run(repo, skill_id, provider);
        return result.changes;
    }

    // ── Settings ──
    getSettings(): Record<string, string> {
        const rows = this.db.prepare("SELECT * FROM settings").all() as any[];
        const settings: Record<string, string> = {};
        for (const row of rows) {
            settings[row.key] = row.value;
        }
        return settings;
    }

    getSetting(key: string, fallback?: string): string | null {
        const row = this.db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as any;
        return row ? row.value : (fallback ?? null);
    }

    saveSetting(key: string, value: string): void {
        this.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
            .run(key, value);
    }

    // ── Meetings ──
    getMeetings(): any[] {
        const rows = this.db.prepare("SELECT * FROM meetings ORDER BY created_at DESC").all() as any[];
        return rows.map(r => ({
            ...r,
            attendees: JSON.parse(r.attendees || '[]')
        }));
    }

    getMeeting(id: string): any | undefined {
        const r = this.db.prepare("SELECT * FROM meetings WHERE id = ?").get(id) as any;
        if (!r) return undefined;
        return {
            ...r,
            attendees: JSON.parse(r.attendees || '[]')
        };
    }

    createMeeting(data: any): string {
        const id = `mtg_${Math.random().toString(36).slice(2, 7)}`;
        const now = Date.now();
        this.db.prepare(`
            INSERT INTO meetings (id, task_id, title, description, attendees, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            data.task_id || null,
            data.title || 'Nexus Sync',
            data.description || '',
            JSON.stringify(data.attendees || []),
            data.status || 'scheduled',
            now,
            now
        );
        return id;
    }

    updateMeeting(id: string, updates: any): void {
        const keys = Object.keys(updates);
        if (keys.length === 0) return;
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => k === 'attendees' ? JSON.stringify(updates[k]) : updates[k]);
        this.db.prepare(`UPDATE meetings SET ${setClause}, updated_at = ? WHERE id = ?`)
            .run(...values, Date.now(), id);
    }

    // ── OAuth Accounts ──
    getOauthAccounts(): any[] {
        return this.db.prepare("SELECT * FROM oauth_accounts").all();
    }

    updateOauthAccount(provider: string, updates: any): void {
        const exists = this.db.prepare("SELECT 1 FROM oauth_accounts WHERE provider = ?").get(provider);
        if (!exists) {
            this.db.prepare(`
                INSERT INTO oauth_accounts (provider, account_name, status, last_synced_at)
                VALUES (?, ?, ?, ?)
            `).run(provider, updates.account_name || '', updates.status || 'disconnected', Date.now());
        } else {
            const keys = Object.keys(updates);
            const setClause = keys.map(k => `${k} = ?`).join(', ');
            const values = Object.values(updates).map(v => v === null ? null : String(v));
            this.db.prepare(`UPDATE oauth_accounts SET ${setClause}, last_synced_at = ? WHERE provider = ?`)
                .run(...values, Date.now(), provider);
        }
    }

    // ── Mission Control ──
    getMissionControlState(): string | null {
        const row = this.db.prepare("SELECT state_json FROM mission_control_state WHERE id = 'singleton'").get() as any;
        return row ? row.state_json : null;
    }

    saveMissionControlState(stateJson: string): void {
        const exists = this.db.prepare("SELECT 1 FROM mission_control_state WHERE id = 'singleton'").get();
        if (exists) {
            this.db.prepare("UPDATE mission_control_state SET state_json = ?, updated_at = ? WHERE id = 'singleton'")
                .run(stateJson, Date.now());
        } else {
            this.db.prepare("INSERT INTO mission_control_state (id, state_json, updated_at) VALUES ('singleton', ?, ?)")
                .run(stateJson, Date.now());
        }
    }

    // ── API Providers ──
    getApiProviders(): any[] {
        return this.db.prepare("SELECT * FROM api_providers").all();
    }

    createApiProvider(data: any): string {
        const id = `ap-${Date.now()}`;
        const now = Date.now();
        this.db.prepare(`
            INSERT INTO api_providers (id, name, type, base_url, api_key, enabled, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, data.name, data.type, data.base_url, data.api_key, 1, now, now);
        return id;
    }

    updateApiProvider(id: string, updates: any): void {
        const keys = Object.keys(updates);
        if (keys.length === 0) return;
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates) as any[];
        this.db.prepare(`UPDATE api_providers SET ${setClause}, updated_at = ? WHERE id = ?`)
            .run(...values, Date.now(), id);
    }

    deleteApiProvider(id: string): void {
        this.db.prepare("DELETE FROM api_providers WHERE id = ?").run(id);
    }

    // ── Subtasks ──
    getSubtasks(taskId?: string): Subtask[] {
        if (taskId) {
            return this.db.prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY priority DESC").all(taskId) as unknown as Subtask[];
        }
        return this.db.prepare("SELECT * FROM subtasks ORDER BY created_at DESC").all() as unknown as Subtask[];
    }

    createSubtask(data: Partial<Subtask>): string {
        const id = `st-${Date.now()}`;
        this.db.prepare(`
            INSERT INTO subtasks (id, task_id, title, status, priority, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, data.task_id as any, data.title as any, data.status || 'todo', data.priority || 1, Date.now());
        return id;
    }

    updateSubtask(id: string, updates: Partial<Subtask>): void {
        const keys = Object.keys(updates);
        if (keys.length === 0) return;
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates) as any[];
        this.db.prepare(`UPDATE subtasks SET ${setClause} WHERE id = ?`).run(...values, id);
    }

    // ── Worktrees ──
    getWorktrees(): Worktree[] {
        return this.db.prepare("SELECT * FROM worktrees ORDER BY created_at DESC").all() as unknown as Worktree[];
    }

    createWorktree(data: Partial<Worktree>): string {
        const id = data.id || `wt-${Date.now()}`;
        this.db.prepare(`
            INSERT INTO worktrees (id, name, path, repo_url, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, data.name || 'New Worktree', data.path || '', data.repo_url || null, Date.now());
        return id;
    }

    // ── Auth Tokens ──
    getAuthTokens(): AuthToken[] {
        return this.db.prepare("SELECT * FROM auth_tokens").all() as unknown as AuthToken[];
    }

    saveAuthToken(token: AuthToken): void {
        this.db.prepare(`
            INSERT OR REPLACE INTO auth_tokens (provider, access_token, refresh_token, expires_at, scope)
            VALUES (?, ?, ?, ?, ?)
        `).run(token.provider, token.access_token, token.refresh_token || null, token.expires_at || null, token.scope || null);
    }

    deleteAuthToken(provider: string): void {
        this.db.prepare("DELETE FROM auth_tokens WHERE provider = ?").run(provider);
    }

    // ── Cron Jobs ──
    getCronJobs(): CronJobData[] {
        return this.db.prepare("SELECT * FROM cron_jobs").all() as unknown as CronJobData[];
    }

    saveCronJob(job: CronJobData): void {
        this.db.prepare(`
            INSERT OR REPLACE INTO cron_jobs (id, schedule, description, command, enabled, timeout, last_run)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(job.id, job.schedule, job.description, job.command, job.enabled, job.timeout, job.last_run || null);
    }

    deleteCronJob(id: string): void {
        this.db.prepare("DELETE FROM cron_jobs WHERE id = ?").run(id);
    }

    // ── Webhooks ──
    addWebhook(data: Record<string, unknown>): string {
        const id = `wh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
        const now = Date.now();
        this.db.prepare(`
            INSERT INTO webhooks (id, platform, event, intent, urgency, department, suggested_agent, should_auto_act, suggested_action, payload, headers, classification, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            String(data.platform || 'unknown'),
            String(data.event || ''),
            String(data.intent || ''),
            Number(data.urgency ?? 5),
            String(data.department || 'operations'),
            String(data.suggested_agent || ''),
            data.should_auto_act ? 1 : 0,
            data.suggested_action ? String(data.suggested_action) : null,
            data.payload ? String(data.payload) : null,
            data.headers ? String(data.headers) : null,
            data.classification ? String(data.classification) : null,
            'received',
            now,
        );
        return id;
    }

    getWebhooks(limit = 50): any[] {
        return this.db.prepare("SELECT * FROM webhooks ORDER BY created_at DESC LIMIT ?").all(limit) as any[];
    }

    getWebhook(id: string): any {
        return this.db.prepare("SELECT * FROM webhooks WHERE id = ?").get(id) as any;
    }

    updateWebhookStatus(id: string, status: string): void {
        this.db.prepare("UPDATE webhooks SET status = ? WHERE id = ?").run(status, id);
    }

    // ── Swarm Jobs ──
    addSwarmJob(data: Record<string, unknown>): string {
        const id = String(data.id || `swarm_${Date.now().toString(36)}`);
        this.db.prepare(`
            INSERT INTO swarm_jobs (id, total_tasks, succeeded, failed, concurrency, wall_duration, parallel_speedup, status, results, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            Number(data.total_tasks ?? 0),
            Number(data.succeeded ?? 0),
            Number(data.failed ?? 0),
            Number(data.concurrency ?? 8),
            Number(data.wall_duration ?? 0),
            Number(data.parallel_speedup ?? 1),
            String(data.status || 'running'),
            data.results ? String(data.results) : null,
            Date.now(),
        );
        return id;
    }

    getSwarmJobs(limit = 20): any[] {
        return this.db.prepare("SELECT * FROM swarm_jobs ORDER BY created_at DESC LIMIT ?").all(limit) as any[];
    }

    getSwarmJob(id: string): any {
        return this.db.prepare("SELECT * FROM swarm_jobs WHERE id = ?").get(id) as any;
    }

    updateSwarmJob(id: string, updates: Record<string, unknown>): void {
        const keys = Object.keys(updates);
        if (keys.length === 0) return;
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates) as any[];
        this.db.prepare(`UPDATE swarm_jobs SET ${setClause} WHERE id = ?`).run(...values, id);
    }

    // ── Timelines (Time-Travel Debugging) ──
    addTimeline(data: Record<string, unknown>): string {
        const id = String(data.id);
        this.db.prepare(`
            INSERT INTO timelines (id, session_key, parent_id, fork_point, agent_id, model, status, event_count, total_tool_calls, total_llm_calls, total_errors, total_duration, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            String(data.session_key || ''),
            data.parent_id ? String(data.parent_id) : null,
            data.fork_point != null ? Number(data.fork_point) : null,
            String(data.agent_id || ''),
            String(data.model || ''),
            String(data.status || 'recording'),
            Number(data.event_count ?? 0),
            Number(data.total_tool_calls ?? 0),
            Number(data.total_llm_calls ?? 0),
            Number(data.total_errors ?? 0),
            Number(data.total_duration ?? 0),
            Date.now(),
        );
        return id;
    }

    getTimelines(limit = 20): any[] {
        return this.db.prepare("SELECT * FROM timelines ORDER BY created_at DESC LIMIT ?").all(limit) as any[];
    }

    getTimeline(id: string): any {
        return this.db.prepare("SELECT * FROM timelines WHERE id = ?").get(id) as any;
    }

    updateTimeline(id: string, updates: Record<string, unknown>): void {
        const keys = Object.keys(updates);
        if (keys.length === 0) return;
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates) as any[];
        this.db.prepare(`UPDATE timelines SET ${setClause} WHERE id = ?`).run(...values, id);
    }

    // ── Timeline Events ──
    addTimelineEvent(data: Record<string, unknown>): void {
        this.db.prepare(`
            INSERT INTO timeline_events (id, timeline_id, sequence, type, timestamp, data)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            String(data.id),
            String(data.timeline_id),
            Number(data.sequence),
            String(data.type),
            Number(data.timestamp || Date.now()),
            data.data ? String(data.data) : null,
        );
    }

    getTimelineEvents(timelineId: string, limit = 100): any[] {
        return this.db.prepare("SELECT * FROM timeline_events WHERE timeline_id = ? ORDER BY sequence ASC LIMIT ?").all(timelineId, limit) as any[];
    }

    // ── Skill Transfers (Skill Fusion) ──
    addSkillTransfer(data: Record<string, unknown>): string {
        const id = String(data.id);
        this.db.prepare(`
            INSERT INTO skill_transfers (id, source_agent_id, target_agent_id, skill, status, expires_at, reason, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            String(data.source_agent_id || ''),
            String(data.target_agent_id || ''),
            String(data.skill || ''),
            String(data.status || 'active'),
            Number(data.expires_at || 0),
            String(data.reason || ''),
            Date.now(),
        );
        return id;
    }

    updateSkillTransfer(id: string, updates: Record<string, unknown>): void {
        const keys = Object.keys(updates);
        if (keys.length === 0) return;
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates) as any[];
        this.db.prepare(`UPDATE skill_transfers SET ${setClause} WHERE id = ?`).run(...values, id);
    }

    getActiveSkillTransfers(): any[] {
        return this.db.prepare("SELECT * FROM skill_transfers WHERE status = 'active' ORDER BY created_at DESC").all() as any[];
    }

    // ── Fusion Sessions ──
    addFusionSession(data: Record<string, unknown>): string {
        const id = String(data.id);
        this.db.prepare(`
            INSERT INTO fusion_sessions (id, name, agent_ids, combined_skills, status, task_description, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            String(data.name || ''),
            String(data.agent_ids || '[]'),
            String(data.combined_skills || '[]'),
            String(data.status || 'active'),
            String(data.task_description || ''),
            Date.now(),
        );
        return id;
    }

    updateFusionSession(id: string, updates: Record<string, unknown>): void {
        const keys = Object.keys(updates);
        if (keys.length === 0) return;
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates) as any[];
        this.db.prepare(`UPDATE fusion_sessions SET ${setClause} WHERE id = ?`).run(...values, id);
    }

    getActiveFusionSessions(): any[] {
        return this.db.prepare("SELECT * FROM fusion_sessions WHERE status = 'active' ORDER BY created_at DESC").all() as any[];
    }

    close() {
        this.db.close();
    }
}
