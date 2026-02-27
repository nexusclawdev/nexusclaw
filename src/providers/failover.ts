/**
 * FailoverProvider — wraps any LLMProvider with model failover chains.
 *
 * Advanced features:
 *   - Works with ANY provider (not just OpenRouter)
 *   - Tracks fallback state for user-visible notices
 *   - Smart retry: retries on 402/429/500/503, skips on 400/401/403
 *   - Emits hook events on fallback
 *   - Falls back through the chain, picks up where it left off
 */

import { LLMProvider, type LLMResponse, type ChatMessage } from './base.js';
import { hooks } from '../hooks/index.js';

/** HTTP status codes that trigger a model fallback */
const FALLBACK_STATUS_CODES = new Set([402, 429, 500, 502, 503, 504]);

/** Error message patterns that trigger a fallback */
const FALLBACK_ERROR_PATTERNS = [
    /model.*not.*found/i,
    /model.*unavailable/i,
    /no model with id/i,
    /rate limit/i,
    /capacity/i,
    /overloaded/i,
    /quota exceeded/i,
];

function shouldFallback(err: unknown): boolean {
    if (err && typeof err === 'object') {
        const status = (err as any).status ?? (err as any).statusCode;
        if (typeof status === 'number' && FALLBACK_STATUS_CODES.has(status)) return true;
    }
    const message = err instanceof Error ? err.message : String(err);
    return FALLBACK_ERROR_PATTERNS.some(p => p.test(message));
}

export interface FallbackAttempt {
    model: string;
    error: string;
    status?: number;
}

export class FailoverProvider extends LLMProvider {
    private activeModel: string;
    private lastFallbacks: FallbackAttempt[] = [];

    constructor(
        private readonly inner: LLMProvider,
        private readonly modelChain: string[],   // [primary, ...fallbacks]
    ) {
        super(); // no direct key/base — delegated to inner
        this.activeModel = modelChain[0] ?? 'gpt-4o';
    }

    getDefaultModel(): string {
        return this.inner.getDefaultModel();
    }

    /** The model currently in use (may be a fallback) */
    get currentModel(): string { return this.activeModel; }

    /** Whether we're currently using a fallback model */
    get isFallbackActive(): boolean {
        return this.activeModel !== this.modelChain[0];
    }

    /** Recent fallback attempts (cleared on success) */
    get fallbackAttempts(): FallbackAttempt[] { return [...this.lastFallbacks]; }

    async chat(
        messages: ChatMessage[],
        tools?: Array<Record<string, unknown>>,
        model?: string,
        maxTokens?: number,
        temperature?: number,
    ): Promise<LLMResponse> {
        // If caller passes an explicit non-primary model, skip failover
        if (model && model !== this.modelChain[0]) {
            return this.inner.chat(messages, tools, model, maxTokens, temperature);
        }

        this.lastFallbacks = [];
        const chain = [...this.modelChain];

        for (let i = 0; i < chain.length; i++) {
            const candidateModel = chain[i];
            try {
                const result = await this.inner.chat(messages, tools, candidateModel, maxTokens, temperature);
                this.activeModel = candidateModel;
                return result;
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                const status = err && typeof err === 'object' ? (err as any).status : undefined;

                this.lastFallbacks.push({ model: candidateModel, error: errMsg, status });

                // Don't fallback on auth errors — those are always fatal
                if (status === 401 || status === 403) throw err;

                // Only fallback if it's a recoverable error
                if (!shouldFallback(err)) throw err;

                const nextModel = chain[i + 1];
                if (!nextModel) throw err; // exhausted chain

                // Emit hook event so users/plugins can log/notify
                await hooks.emit('model:fallback', {
                    primaryModel: this.modelChain[0],
                    fallbackModel: nextModel,
                    reason: errMsg.slice(0, 120),
                    attempt: i + 1,
                });

                console.warn(`[failover] ${candidateModel} failed (${errMsg.slice(0, 60)}…) → trying ${nextModel}`);
                this.activeModel = nextModel;
            }
        }

        throw new Error(`All models in failover chain exhausted: ${chain.join(', ')}`);
    }
}
