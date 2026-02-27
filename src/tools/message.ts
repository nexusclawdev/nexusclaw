/**
 * Message tool — send messages proactively from within tools.
 * Like nanobot's MessageTool — allows the agent to send messages 
 * mid-execution (progress updates, notifications).
 */

import { Tool, ToolParameters } from './base.js';
import { OutboundMessage } from '../bus/events.js';

type SendCallback = (msg: OutboundMessage) => Promise<void>;

export class MessageTool extends Tool {
    private channel: string = 'cli';
    private chatId: string = 'direct';
    private messageId?: string;
    public sentInTurn: boolean = false;

    constructor(private sendCallback: SendCallback) { super(); }

    get name() { return 'message'; }
    get description() { return 'Send a message to the user proactively (e.g., progress updates, asking for approval).'; }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                content: { type: 'string', description: 'Message content to send' },
            },
            required: ['content'],
        };
    }

    setContext(channel: string, chatId: string, messageId?: string): void {
        this.channel = channel;
        this.chatId = chatId;
        this.messageId = messageId;
    }

    startTurn(): void {
        this.sentInTurn = false;
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const content = String(params.content);

        await this.sendCallback({
            channel: this.channel,
            chatId: this.chatId,
            content,
            media: [],
            metadata: {},
        });

        this.sentInTurn = true;
        return '✅ Message sent';
    }
}
