/**
 * Context builder — constructs the system prompt and message history for LLM calls.
 * Like nanobot's context.py: builds messages with workspace info, memory, history.
 */

import type { ChatMessage } from '../providers/base.js';
import { existsSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const SYSTEM_PROMPT_TEMPLATE = `You are {agentName}, {agentRole}.

IMPORTANT: You ARE {agentName}. Respond directly as yourself. Do NOT say things like "{agentName} has been notified" or "I'll notify {agentName}". You ARE the agent being addressed. Answer questions and perform tasks directly.

You have access to tools for:
- **File operations**: read, write, edit, and list files
- **Shell execution**: run commands in the terminal
- **Web browsing**: navigate pages, click elements, extract data, take screenshots
- **Web search**: search the internet for information
- **Messaging**: send proactive messages to the user
- **Sub-agents**: spawn background tasks

## Available Agents in the System
{agentsList}

## Guidelines
1. Be concise and action-oriented. Execute tasks directly.
2. When browsing, use the 'browse' tool with appropriate actions.
3. For file changes, prefer 'edit_file' (targeted) over 'write_file' (full replace).
4. Always explain what you're doing before executing dangerous operations.
5. If a task is complex, break it down and use the spawn tool for parallel work.
6. **Security**: Never visit unauthorized domains. Never expose credentials.
7. **Memory**: Reference previous conversations when relevant.

## Current Time
{time}

## Runtime
NexusClaw v0.1.0 | Node.js {nodeVersion} | {platform}

## Workspace
{workspace}
`;

export class ContextBuilder {
    constructor(private workspace: string, private db?: any) { }

    /** Build a full message array for the LLM */
    buildMessages(opts: {
        history: ChatMessage[];
        currentMessage: string;
        channel?: string;
        chatId?: string;
        media?: string[];
        agentName?: string;
        agentRole?: string;
    }): ChatMessage[] {
        const messages: ChatMessage[] = [];

        // System prompt
        messages.push({
            role: 'system',
            content: this.buildSystemPrompt(opts),
        });

        // Memory context (if MEMORY.md exists)
        const memoryContent = this.loadMemory();
        if (memoryContent) {
            messages.push({
                role: 'system',
                content: `## Long-Term Memory\n${memoryContent}`,
            });
        }

        // History
        for (const msg of opts.history) {
            messages.push(msg);
        }

        // Current message
        messages.push({
            role: 'user',
            content: opts.currentMessage,
        });

        return messages;
    }

    /** Add assistant message with optional tool calls */
    addAssistantMessage(
        messages: ChatMessage[],
        content: string | null,
        toolCalls?: Array<Record<string, unknown>>,
    ): ChatMessage[] {
        const msg: any = {
            role: 'assistant',
            content: content || '',
        };
        if (toolCalls && toolCalls.length > 0) {
            msg.tool_calls = toolCalls;
        }
        return [...messages, msg as ChatMessage];
    }

    /** Add tool result */
    addToolResult(
        messages: ChatMessage[],
        toolCallId: string,
        toolName: string,
        result: string,
    ): ChatMessage[] {
        return [...messages, {
            role: 'tool',
            tool_call_id: toolCallId,
            name: toolName,
            content: result,
        }] as ChatMessage[];
    }

    private buildSystemPrompt(opts: { channel?: string, agentName?: string, agentRole?: string }): string {
        // Build agents list
        let agentsList = '';
        if (this.db) {
            try {
                const agents = this.db.getAgents();
                agentsList = agents.map((a: any) =>
                    `- **${a.name}** (${a.role}) - ${a.department_name} ${a.avatar || ''}`
                ).join('\n');
            } catch {
                agentsList = 'Agent information unavailable';
            }
        } else {
            agentsList = 'Agent information unavailable';
        }

        let prompt = SYSTEM_PROMPT_TEMPLATE
            .replace('{agentName}', opts.agentName || 'NexusClaw')
            .replace('{agentRole}', opts.agentRole || 'an ultra-lightweight secure AI agent with browser control capabilities')
            .replace('{agentsList}', agentsList)
            .replace('{time}', new Date().toISOString())
            .replace('{nodeVersion}', process.version)
            .replace('{platform}', `${process.platform} ${process.arch}`)
            .replace('{workspace}', this.workspace);

        if (opts.channel) {
            prompt += `\n## Channel\nUser is talking via: ${opts.channel}`;
        }

        // Skills (if any exist)
        const skillsContent = this.loadSkills();
        if (skillsContent) {
            prompt += `\n\n## Installed Skills\n${skillsContent}`;
        }

        return prompt;
    }

    private loadMemory(): string | null {
        const memPath = join(this.workspace, 'MEMORY.md');
        if (!existsSync(memPath)) return null;
        try {
            const content = readFileSync(memPath, 'utf-8');
            return content.slice(0, 5000); // Cap memory context
        } catch {
            return null;
        }
    }

    private loadSkills(): string | null {
        const skillsDir = join(this.workspace, 'skills');
        if (!existsSync(skillsDir)) return null;

        try {
            const { readdirSync } = require('node:fs');
            const skills = readdirSync(skillsDir).filter((f: string) => f.endsWith('.md'));
            if (skills.length === 0) return null;
            return skills.map((s: string) => `- ${basename(s, '.md')}`).join('\n');
        } catch {
            return null;
        }
    }
}
