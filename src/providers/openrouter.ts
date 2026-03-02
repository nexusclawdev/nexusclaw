/**
 * OpenRouter LLM provider — access all models through one API.
 * Includes exponential backoff retry for 429 / 503 / 500 errors.
 */

import OpenAI from 'openai';
import { LLMProvider, LLMResponse, ChatMessage, ToolCallRequest } from './base.js';

const RETRY_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_TOTAL_DELAY_MS = 10000; // 10s cap per retry

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class OpenRouterProvider extends LLMProvider {
    private client: OpenAI;

    constructor(apiKey?: string) {
        super(apiKey);
        this.client = new OpenAI({
            apiKey: apiKey || process.env.OPENROUTER_API_KEY,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': 'https://github.com/nexusclaw',
                'X-Title': 'NexusClaw',
            },
            // Disable the SDK's built-in retry — we handle it ourselves
            maxRetries: 0,
        });
    }

    getDefaultModel(): string {
        return 'openai/gpt-oss-20b:free';
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

        let lastError: unknown;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const response = await this.client.chat.completions.create(params);

                if (!response.choices || response.choices.length === 0) {
                    return {
                        content: null,
                        toolCalls: [],
                        finishReason: 'error',
                        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                    };
                }

                const choice = response.choices[0];

                const toolCalls: ToolCallRequest[] = (choice?.message?.tool_calls || []).map(tc => {
                    let parsedArgs = {};
                    try {
                        parsedArgs = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
                    } catch (e) {
                        console.warn(`[OpenRouter] Failed to parse tool arguments for ${tc.function.name}:`, e);
                    }
                    return {
                        id: tc.id,
                        name: tc.function.name,
                        arguments: parsedArgs,
                    };
                });

                return {
                    content: choice?.message?.content || null,
                    toolCalls,
                    finishReason: choice?.finish_reason || 'stop',
                    usage: {
                        promptTokens: response.usage?.prompt_tokens || 0,
                        completionTokens: response.usage?.completion_tokens || 0,
                    },
                };
            } catch (err: any) {
                lastError = err;

                // Check if it's a rate-limit / server error worth retrying
                const statusCode: number = err?.status ?? err?.statusCode ?? err?.response?.status ?? 0;
                const isRetryable = RETRY_STATUS_CODES.has(statusCode)
                    || (err?.message && /rate.?limit|too many|overloaded|timeout/i.test(String(err.message)));

                if (!isRetryable || attempt === MAX_RETRIES - 1) {
                    throw err;
                }

                // Honour the Retry-After header if present, otherwise use backoff
                const retryAfterSec = Number(err?.headers?.['retry-after'] ?? err?.response?.headers?.['retry-after'] ?? 0);
                const rawDelayMs = retryAfterSec > 0
                    ? retryAfterSec * 1000
                    : BASE_DELAY_MS * Math.pow(2, attempt);
                const delayMs = Math.min(rawDelayMs, MAX_TOTAL_DELAY_MS);

                console.warn(`[openrouter] ${statusCode} on attempt ${attempt + 1}/${MAX_RETRIES}, retrying in ${Math.round(delayMs / 1000)}s…`);
                await sleep(delayMs);
            }
        }

        throw lastError;
    }
}
