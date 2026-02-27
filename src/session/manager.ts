/**
 * Session management — conversation history persistence.
 * TypeScript equivalent of nanobot's SessionManager.
 * Stores messages as JSONL files for efficient append-only writes.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface SessionMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: string;
    toolCalls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
    }>;
    toolCallId?: string;
    name?: string;
    toolsUsed?: string[];
}

export class Session {
    messages: SessionMessage[] = [];
    createdAt: Date = new Date();
    updatedAt: Date = new Date();
    lastConsolidated: number = 0;

    constructor(public key: string) { }

    addMessage(
        role: SessionMessage['role'],
        content: string,
        extra?: Partial<SessionMessage>,
    ): void {
        this.messages.push({
            role,
            content,
            timestamp: new Date().toISOString(),
            ...extra,
        });
        this.updatedAt = new Date();
    }

    /** Get recent messages in LLM-ready format */
    getHistory(maxMessages: number = 50): Array<Record<string, unknown>> {
        const recent = this.messages.slice(-maxMessages);
        return recent.map(m => {
            const entry: Record<string, unknown> = { role: m.role, content: m.content };
            if (m.toolCalls) entry.tool_calls = m.toolCalls;
            if (m.toolCallId) entry.tool_call_id = m.toolCallId;
            if (m.name) entry.name = m.name;
            return entry;
        });
    }

    clear(): void {
        this.messages = [];
        this.lastConsolidated = 0;
        this.updatedAt = new Date();
    }
}

export class SessionManager {
    private cache = new Map<string, Session>();
    private sessionsDir: string;

    constructor(workspace: string) {
        this.sessionsDir = join(workspace, 'sessions');
        if (!existsSync(this.sessionsDir)) {
            mkdirSync(this.sessionsDir, { recursive: true });
        }
    }

    getOrCreate(key: string): Session {
        if (this.cache.has(key)) {
            return this.cache.get(key)!;
        }

        const session = this.load(key) ?? new Session(key);
        this.cache.set(key, session);
        return session;
    }

    save(session: Session): void {
        const path = this.getPath(session.key);
        const lines = session.messages.map(m => JSON.stringify(m));
        writeFileSync(path, lines.join('\n') + '\n', 'utf-8');
        this.cache.set(session.key, session);
    }

    invalidate(key: string): void {
        this.cache.delete(key);
    }

    private getPath(key: string): string {
        const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_');
        return join(this.sessionsDir, `${safe}.jsonl`);
    }

    private load(key: string): Session | null {
        const path = this.getPath(key);
        if (!existsSync(path)) return null;

        try {
            const session = new Session(key);
            const content = readFileSync(path, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim());

            for (const line of lines) {
                try {
                    const msg = JSON.parse(line) as SessionMessage;
                    session.messages.push(msg);
                } catch {
                    // Skip malformed lines
                }
            }

            return session;
        } catch {
            return null;
        }
    }
}
