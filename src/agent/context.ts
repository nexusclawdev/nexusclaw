/**
 * Context builder — constructs the system prompt and message history for LLM calls.
 * Uses ELITE optimized prompts for maximum agent performance.
 */

import type { ChatMessage } from '../providers/base.js';
import { existsSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { ELITE_SYSTEM_PROMPT, TASK_EXECUTION_PROMPT, SECURITY_HARDENED_PROMPT } from './prompts/elite-prompts.js';

const SYSTEM_PROMPT_TEMPLATE = ELITE_SYSTEM_PROMPT;

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
        agentId?: string;
        currentTaskId?: string;
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

    private buildSystemPrompt(opts: { channel?: string, agentName?: string, agentRole?: string, agentId?: string, currentTaskId?: string }): string {
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

        // Get current task info if available
        let currentTaskInfo = '';
        if (this.db && opts.currentTaskId) {
            try {
                const task = this.db.getTask(opts.currentTaskId);
                if (task && task.status === 'in_progress') {
                    currentTaskInfo = `**Title**: ${task.title}
**Description**: ${task.description}
**Status**: ${task.status}
**Priority**: ${task.priority || 'medium'}

You are actively working on this task. Keep it in focus when responding.`;
                }
            } catch {
                // Task info unavailable
            }
        }

        // Build channel info
        let channelInfo = opts.channel ? `User is communicating via: ${opts.channel}` : 'Direct communication';

        // Build skills info
        const skillsContent = this.loadSkills();
        let skillsInfo = skillsContent || 'No custom skills installed';

        let prompt = SYSTEM_PROMPT_TEMPLATE
            .replace('{agentName}', opts.agentName || 'NexusClaw')
            .replace('{agentName}', opts.agentName || 'NexusClaw') // Replace both occurrences
            .replace('{agentRole}', opts.agentRole || 'an elite AI agent with full-stack development and automation capabilities')
            .replace('{agentsList}', agentsList)
            .replace('{time}', new Date().toISOString())
            .replace('{nodeVersion}', process.version)
            .replace('{platform}', `${process.platform} ${process.arch}`)
            .replace('{workspace}', this.workspace)
            .replace('{currentTaskInfo}', currentTaskInfo || 'No active task assigned')
            .replace('{channelInfo}', channelInfo)
            .replace('{skillsInfo}', skillsInfo);

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
