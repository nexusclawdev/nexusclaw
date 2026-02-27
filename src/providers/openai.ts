/**
 * OpenAI LLM provider.
 * Uses native openai SDK — clean, direct implementation.
 */

import OpenAI from 'openai';
import { LLMProvider, LLMResponse, ChatMessage, ToolCallRequest } from './base.js';

export class OpenAIProvider extends LLMProvider {
    private client: OpenAI;

    constructor(apiKey?: string, apiBase?: string) {
        super(apiKey, apiBase);
        this.client = new OpenAI({
            apiKey: apiKey || process.env.OPENAI_API_KEY,
            baseURL: apiBase,
        });
    }

    getDefaultModel(): string {
        return 'gpt-4o';
    }

    async chat(
        messages: ChatMessage[],
        tools?: Array<Record<string, unknown>>,
        model?: string,
        maxTokens: number = 4096,
        temperature: number = 0.7,
    ): Promise<LLMResponse> {
        const params: OpenAI.ChatCompletionCreateParams = {
            model: model || this.getDefaultModel(),
            messages: messages as OpenAI.ChatCompletionMessageParam[],
            max_tokens: maxTokens,
            temperature,
        };

        if (tools && tools.length > 0) {
            params.tools = tools as any;
            params.tool_choice = 'auto';
        }

        const response = await this.client.chat.completions.create(params);
        const choice = response.choices[0];

        const toolCalls: ToolCallRequest[] = (choice?.message?.tool_calls || []).map(tc => ({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments || '{}'),
        }));

        return {
            content: choice?.message?.content || null,
            toolCalls,
            finishReason: choice?.finish_reason || 'stop',
            usage: {
                promptTokens: response.usage?.prompt_tokens || 0,
                completionTokens: response.usage?.completion_tokens || 0,
                totalTokens: response.usage?.total_tokens || 0,
            },
        };
    }
}
