/**
 * Claude Agent SDK provider.
 * Uses the autonomous @anthropic-ai/claude-agent-sdk for agentic loops.
 */

import { query, Options, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { LLMProvider, LLMResponse, ChatMessage } from './base.js';

export class ClaudeAgentProvider extends LLMProvider {
    private baseURL?: string;

    constructor(apiKey?: string, baseURL?: string) {
        super(apiKey || process.env.ANTHROPIC_API_KEY);
        this.baseURL = baseURL;
    }

    getDefaultModel(): string {
        return 'claude-4.5-sonnet-latest';
    }

    /**
     * Standard chat implementation for compatibility.
     * With the SDK, this becomes a high-intelligence autonomous turn.
     */
    async chat(
        messages: ChatMessage[],
        tools?: Array<Record<string, unknown>>,
        model?: string,
        maxTokens: number = 4096,
        temperature: number = 0.7,
    ): Promise<LLMResponse> {
        // Find the last user message
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        const prompt = lastUserMsg?.content || 'Continue';

        // Note: SDK holds its own state, but for stateless 'chat' calls we use the single prompt.
        // For full history support, use runAgenticTask.

        let finalContent = '';
        const q = query({
            prompt,
            options: {
                model: model || this.getDefaultModel(),
                // Map tools for the SDK
                allowedTools: (tools || []).map(t => (t as any).function?.name || (t as any).name),
                env: {
                    ...process.env,
                    ANTHROPIC_API_KEY: this.apiKey,
                    ...(this.baseURL ? { ANTHROPIC_BASE_URL: this.baseURL } : {})
                }
            }
        });

        for await (const message of q) {
            if (message.type === 'assistant') {
                for (const block of message.message.content) {
                    if (block.type === 'text') {
                        finalContent += block.text;
                    }
                }
            } else if (message.type === 'stream_event') {
                if (message.event.type === 'content_block_delta' && message.event.delta.type === 'text_delta') {
                    finalContent += message.event.delta.text;
                }
            }
        }

        return {
            content: finalContent,
            toolCalls: [], // SDK handles tools internally
            finishReason: 'end_turn',
            usage: { promptTokens: 0, completionTokens: 0 },
        };
    }

    /**
     * High-level agentic execution engine.
     * This is what Sheldon and other agents should use.
     */
    async runAgenticTask(
        prompt: string,
        options: Partial<Options> = {},
        onProgress?: (message: string) => void,
        onEvent?: (event: SDKMessage) => void
    ): Promise<string> {
        let finalOutput = '';
        const q = query({
            prompt,
            options: {
                ...options,
                model: options.model || this.getDefaultModel(),
                env: {
                    ...process.env,
                    ANTHROPIC_API_KEY: this.apiKey,
                    ...(this.baseURL ? { ANTHROPIC_BASE_URL: this.baseURL } : {}),
                    ...(options.env || {})
                }
            }
        });

        for await (const message of q) {
            if (onEvent) onEvent(message);

            if (message.type === 'assistant') {
                for (const block of message.message.content) {
                    if (block.type === 'text') {
                        finalOutput += block.text;
                    }
                }
            } else if (message.type === 'stream_event') {
                if (message.event.type === 'content_block_delta' && message.event.delta.type === 'text_delta') {
                    finalOutput += message.event.delta.text;
                }
            } else if (message.type === 'tool_progress' && onProgress) {
                onProgress(`🔧 Tool: ${message.tool_name}...`);
            } else if (message.type === 'system' && (message as any).subtype === 'status' && onProgress) {
                const statusMsg = message as any;
                if (statusMsg.status) {
                    onProgress(`📡 Status: ${statusMsg.status}...`);
                }
            }
        }

        return finalOutput;
    }
}
