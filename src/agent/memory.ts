/**
 * Persistent memory system — two-layer architecture.
 * Layer 1: MEMORY.md — always loaded into context (key facts, user prefs)
 * Layer 2: HISTORY.md — searchable archive (consolidation summaries)
 *
 * Better than nanobot: grep-based retrieval + LLM-powered consolidation.
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { LLMProvider, ChatMessage } from '../providers/base.js';
import type { Session } from '../session/manager.js';

const CONSOLIDATION_PROMPT = `You are a memory consolidation agent. Given a conversation, extract:
1. **Key Facts** — user preferences, important names, recurring topics
2. **Decisions** — choices made, approaches agreed on
3. **Task State** — what was accomplished, what's pending

Format as concise bullet points. Only include genuinely important information that would help a future conversation.

Current Long-term Memory:
{current_memory}

Conversation to Process:
{conversation}

Output the updated memory content (Markdown bullet points). Keep it under 2000 chars.`;

export class MemoryStore {
    private memoryPath: string;
    private historyPath: string;

    constructor(workspace: string) {
        this.memoryPath = join(workspace, 'MEMORY.md');
        this.historyPath = join(workspace, 'HISTORY.md');
    }

    /** Get current long-term memory */
    getMemory(): string | null {
        if (!existsSync(this.memoryPath)) return null;
        try {
            return readFileSync(this.memoryPath, 'utf-8');
        } catch {
            return null;
        }
    }

    /** Search history for relevant context */
    searchHistory(query: string): string[] {
        if (!existsSync(this.historyPath)) return [];

        try {
            const content = readFileSync(this.historyPath, 'utf-8');
            const blocks = content.split('\n---\n');
            const queryLower = query.toLowerCase();

            return blocks
                .filter(block => block.toLowerCase().includes(queryLower))
                .slice(0, 3); // Top 3 matches
        } catch {
            return [];
        }
    }

    /** Consolidate conversation into long-term memory */
    async consolidate(
        session: Session,
        provider: LLMProvider,
        model: string,
        opts?: { archiveAll?: boolean; memoryWindow?: number },
    ): Promise<void> {
        const { archiveAll = false, memoryWindow = 50 } = opts || {};

        const startIdx = archiveAll ? 0 : session.lastConsolidated;
        const messages = session.messages.slice(startIdx);

        if (messages.length < 5) return; // Not enough to consolidate

        const currentMemory = this.getMemory() || '(none)';
        const conversation = messages
            .map(m => `[${m.role}]: ${m.content}`)
            .join('\n')
            .slice(0, 8000); // Cap conversation length

        const prompt = CONSOLIDATION_PROMPT
            .replace('{current_memory}', currentMemory)
            .replace('{conversation}', conversation);

        try {
            const chatMessages: ChatMessage[] = [
                { role: 'user', content: prompt },
            ];

            const response = await provider.chat(chatMessages, undefined, model, 2000, 0.3);

            if (response.content) {
                // Write updated memory
                writeFileSync(this.memoryPath, response.content, 'utf-8');

                // Append summary to history archive
                const archiveEntry = `\n---\n[${new Date().toISOString()}]\n${response.content}\n`;
                appendFileSync(this.historyPath, archiveEntry, 'utf-8');

                session.lastConsolidated = session.messages.length;
            }
        } catch (err) {
            // Memory consolidation is non-critical, don't crash
            console.error('Memory consolidation failed:', err);
        }
    }
}
