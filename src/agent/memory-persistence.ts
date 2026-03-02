/**
 * CRITICAL MEMORY PERSISTENCE SYSTEM
 *
 * This module handles automatic conversation state saving when API limits are reached.
 * Ensures zero context loss when switching conversations.
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface ConversationState {
    timestamp: string;
    conversationId: string;
    lastUserMessage: string;
    taskInProgress: string;
    completedSteps: string[];
    pendingSteps: string[];
    filesModified: string[];
    filesCreated: string[];
    currentContext: string;
    importantDecisions: string[];
    nextActions: string[];
    errorEncountered?: string;
}

export class MemoryPersistence {
    private memoryDir: string;

    constructor(workspace: string) {
        this.memoryDir = join(workspace, '.nexusclaw', 'conversation-memory');
        if (!existsSync(this.memoryDir)) {
            mkdirSync(this.memoryDir, { recursive: true });
        }
    }

    /**
     * Save conversation state when API limit is hit
     */
    saveConversationState(state: ConversationState): string {
        const filename = `conversation_${Date.now()}.json`;
        const filepath = join(this.memoryDir, filename);

        writeFileSync(filepath, JSON.stringify(state, null, 2), 'utf-8');

        // Also save to MEMORY.md for easy reading
        this.appendToMemoryMd(state);

        console.log(`[MemoryPersistence] Saved conversation state to: ${filepath}`);
        return filepath;
    }

    /**
     * Load the most recent conversation state
     */
    loadLatestConversationState(): ConversationState | null {
        try {
            const files = readdirSync(this.memoryDir)
                .filter((f: string) => f.startsWith('conversation_') && f.endsWith('.json'))
                .sort()
                .reverse();

            if (files.length === 0) return null;

            const latestFile = join(this.memoryDir, files[0]);
            const content = readFileSync(latestFile, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.error('[MemoryPersistence] Failed to load conversation state:', error);
            return null;
        }
    }

    /**
     * Append conversation state to MEMORY.md
     */
    private appendToMemoryMd(state: ConversationState): void {
        const memoryPath = join(this.memoryDir, '..', '..', 'MEMORY.md');

        const entry = `
## Conversation Interrupted: ${new Date(state.timestamp).toISOString()}

**Task In Progress:** ${state.taskInProgress}

**Completed Steps:**
${state.completedSteps.map(s => `- ✅ ${s}`).join('\n')}

**Pending Steps:**
${state.pendingSteps.map(s => `- ⏳ ${s}`).join('\n')}

**Files Modified:** ${state.filesModified.join(', ')}
**Files Created:** ${state.filesCreated.join(', ')}

**Current Context:**
${state.currentContext}

**Important Decisions:**
${state.importantDecisions.map(d => `- ${d}`).join('\n')}

**Next Actions:**
${state.nextActions.map(a => `- ${a}`).join('\n')}

${state.errorEncountered ? `**Error:** ${state.errorEncountered}` : ''}

---
`;

        try {
            const existing = existsSync(memoryPath) ? readFileSync(memoryPath, 'utf-8') : '# NexusClaw Memory\n\n';
            writeFileSync(memoryPath, existing + entry, 'utf-8');
        } catch (error) {
            console.error('[MemoryPersistence] Failed to append to MEMORY.md:', error);
        }
    }

    /**
     * Generate continuation prompt for new conversation
     */
    generateContinuationPrompt(state: ConversationState): string {
        return `# CONTINUING FROM PREVIOUS CONVERSATION

**Previous conversation was interrupted due to API limit at:** ${new Date(state.timestamp).toLocaleString()}

## CONTEXT RESTORATION

**Task I was working on:**
${state.taskInProgress}

**What I completed:**
${state.completedSteps.map(s => `✅ ${s}`).join('\n')}

**What's still pending:**
${state.pendingSteps.map(s => `⏳ ${s}`).join('\n')}

**Files I modified:**
${state.filesModified.join(', ')}

**Files I created:**
${state.filesCreated.join(', ')}

**Important context:**
${state.currentContext}

**Decisions made:**
${state.importantDecisions.join('\n')}

**Next actions I need to take:**
${state.nextActions.join('\n')}

${state.errorEncountered ? `\n**Error encountered:** ${state.errorEncountered}\n` : ''}

---

**INSTRUCTION:** Continue exactly where I left off. Do NOT restart from scratch. Pick up from the pending steps above.`;
    }
}
