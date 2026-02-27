/**
 * Base LLM provider interface.
 * Clean TypeScript equivalent of nanobot's provider base.
 */

export interface ToolCallRequest {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

export interface LLMResponse {
    content: string | null;
    toolCalls: ToolCallRequest[];
    finishReason: string;
    usage: Record<string, number>;
    reasoningContent?: string;
}

export function hasToolCalls(response: LLMResponse): boolean {
    return response.toolCalls.length > 0;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
    }>;
    tool_call_id?: string;
    name?: string;
}

export abstract class LLMProvider {
    constructor(
        protected apiKey?: string,
        protected apiBase?: string,
    ) { }

    abstract chat(
        messages: ChatMessage[],
        tools?: Array<Record<string, unknown>>,
        model?: string,
        maxTokens?: number,
        temperature?: number,
    ): Promise<LLMResponse>;

    abstract getDefaultModel(): string;
}
