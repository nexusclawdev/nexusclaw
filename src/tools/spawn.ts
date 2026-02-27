/**
 * Spawn tool — run background sub-tasks.
 * Like nanobot's SpawnTool: creates a sub-agent that runs independently.
 */

import { Tool, ToolParameters } from './base.js';

export interface SubagentRequest {
    task: string;
    channel: string;
    chatId: string;
}

export type SpawnCallback = (request: SubagentRequest) => Promise<void>;

export class SpawnTool extends Tool {
    private channel: string = 'cli';
    private chatId: string = 'direct';

    constructor(private spawnCallback: SpawnCallback) { super(); }

    get name() { return 'spawn'; }
    get description() { return 'Spawn a background sub-agent to handle a task independently. Use for long-running tasks that should not block the main conversation.'; }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                task: { type: 'string', description: 'Description of the task for the sub-agent' },
            },
            required: ['task'],
        };
    }

    setContext(channel: string, chatId: string): void {
        this.channel = channel;
        this.chatId = chatId;
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const task = String(params.task);

        try {
            await this.spawnCallback({
                task,
                channel: this.channel,
                chatId: this.chatId,
            });
            return `✅ Sub-agent spawned for: "${task}"`;
        } catch (e) {
            return `Error spawning sub-agent: ${e instanceof Error ? e.message : String(e)}`;
        }
    }
}
