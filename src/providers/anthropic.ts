/**
 * Anthropic LLM provider.
 * Uses native Anthropic SDK with tool-use support.
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMResponse, ChatMessage, ToolCallRequest } from './base.js';

export class AnthropicProvider extends LLMProvider {
    private client: Anthropic;

    constructor(apiKey?: string) {
        super(apiKey);
        this.client = new Anthropic({
            apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
        });
    }

    getDefaultModel(): string {
        return 'claude-sonnet-4-20250514';
    }

    async chat(
        messages: ChatMessage[],
        tools?: Array<Record<string, unknown>>,
        model?: string,
        maxTokens: number = 4096,
        temperature: number = 0.7,
    ): Promise<LLMResponse> {
        // Separate system message
        let systemPrompt = '';
        const chatMessages: Array<{ role: 'user' | 'assistant'; content: string | Array<Record<string, unknown>> }> = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemPrompt += (msg.content || '') + '\n';
            } else if (msg.role === 'user') {
                chatMessages.push({ role: 'user', content: msg.content || '' });
            } else if (msg.role === 'assistant') {
                if (msg.tool_calls && msg.tool_calls.length > 0) {
                    const content: Array<Record<string, unknown>> = [];
                    if (msg.content) {
                        content.push({ type: 'text', text: msg.content });
                    }
                    for (const tc of msg.tool_calls) {
                        let parsedArgs = {};
                        try {
                            parsedArgs = JSON.parse(tc.function.arguments || '{}');
                        } catch (e) {
                            console.warn(`[Anthropic] Failed to parse tool arguments for ${tc.function.name}:`, e);
                        }
                        content.push({
                            type: 'tool_use',
                            id: tc.id,
                            name: tc.function.name,
                            input: parsedArgs,
                        });
                    }
                    chatMessages.push({ role: 'assistant', content });
                } else {
                    chatMessages.push({ role: 'assistant', content: msg.content || '' });
                }
            } else if (msg.role === 'tool') {
                chatMessages.push({
                    role: 'user',
                    content: [{
                        type: 'tool_result',
                        tool_use_id: msg.tool_call_id,
                        content: msg.content || '',
                    }],
                });
            }
        }

        // Convert tools to Anthropic format
        const anthropicTools = (tools || []).map(t => {
            const fn = (t as Record<string, any>).function || t;
            return {
                name: fn.name,
                description: fn.description,
                input_schema: fn.parameters,
            };
        });

        const params: Anthropic.MessageCreateParams = {
            model: model || this.getDefaultModel(),
            max_tokens: maxTokens,
            messages: chatMessages as Anthropic.MessageParam[],
        };

        if (systemPrompt) params.system = systemPrompt.trim();
        if (anthropicTools.length > 0) params.tools = anthropicTools as Anthropic.Tool[];

        const response = await this.client.messages.create(params);

        let content: string | null = null;
        const toolCalls: ToolCallRequest[] = [];

        for (const block of response.content) {
            if (block.type === 'text') {
                content = (content || '') + block.text;
            } else if (block.type === 'tool_use') {
                toolCalls.push({
                    id: block.id,
                    name: block.name,
                    arguments: block.input as Record<string, unknown>,
                });
            }
        }

        return {
            content,
            toolCalls,
            finishReason: response.stop_reason || 'end_turn',
            usage: {
                promptTokens: response.usage?.input_tokens || 0,
                completionTokens: response.usage?.output_tokens || 0,
            },
        };
    }
}
