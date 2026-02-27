import { LLMProvider, LLMResponse, ChatMessage } from './base.js';

/**
 * Wraps any LLM provider with automatic exponential backoff retries for 429 Rate Limit errors.
 * Solves the issue where fast BrowseTool loops trigger Gemini's strict rate limits.
 * Also tracks usage statistics for monitoring.
 */
export class RetryProvider extends LLMProvider {
    constructor(
        private inner: LLMProvider,
        private maxRetries: number = 4,
        private providerName?: string
    ) {
        super();
    }

    getDefaultModel(): string {
        return this.inner.getDefaultModel();
    }

    async chat(
        messages: ChatMessage[],
        tools?: Array<Record<string, unknown>>,
        model?: string,
        maxTokens?: number,
        temperature?: number
    ): Promise<LLMResponse> {
        let attempt = 0;
        while (true) {
            try {
                const response = await this.inner.chat(messages, tools, model, maxTokens, temperature);

                // Track successful API call usage
                if (this.providerName && response.usage) {
                    this.trackUsage(response.usage);
                }

                return response;
            } catch (err: any) {
                attempt++;
                const isRateLimit = err.status === 429 || err.message?.includes('429');

                // Track rate limit errors
                if (isRateLimit && this.providerName) {
                    this.trackRateLimit();
                }

                if (!isRateLimit || attempt > this.maxRetries) {
                    throw err; // Not a rate limit, or max retries exhausted
                }

                // Exponential backoff: 2s, 4s, 8s, 16s
                const delayMs = Math.pow(2, attempt) * 1000;
                console.log(`\n⏳ [Rate Limit] 429 Too Many Requests. Waiting ${delayMs / 1000}s before retry (attempt ${attempt}/${this.maxRetries})...`);

                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    private trackUsage(usage: Record<string, number>): void {
        if (!this.providerName) return;

        try {
            // Dynamically import to avoid circular dependencies
            import('../server/modules/usage.js').then(({ usageTracker }) => {
                if (!this.providerName) return;

                const totalTokens = usage.total_tokens || usage.totalTokens || 0;
                const promptTokens = usage.prompt_tokens || usage.promptTokens || 0;
                const completionTokens = usage.completion_tokens || usage.completionTokens || 0;

                // Estimate token limits based on provider
                const limits: Record<string, number> = {
                    openai: 200000,      // GPT-4 tier limits
                    anthropic: 100000,   // Claude tier limits
                    google: 60,          // Gemini RPM limit
                    xai: 100000,         // Grok limits
                    openrouter: 500000   // OpenRouter aggregate
                };

                const limit = limits[this.providerName] || 100000;
                usageTracker.trackApiCall(this.providerName, totalTokens, limit);
            }).catch(() => {
                // Silently fail if usage tracker not available
            });
        } catch {
            // Ignore tracking errors
        }
    }

    private trackRateLimit(): void {
        if (!this.providerName) return;

        try {
            import('../server/modules/usage.js').then(({ usageTracker }) => {
                if (this.providerName) {
                    usageTracker.setProviderError(this.providerName, 'Rate limit exceeded');
                }
            }).catch(() => {});
        } catch {
            // Ignore tracking errors
        }
    }
}
