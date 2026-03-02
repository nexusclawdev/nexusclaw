/**
 * Provider factory — create the right LLM provider from config.
 */

import { LLMProvider } from './base.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenRouterProvider } from './openrouter.js';
import { FailoverProvider } from './failover.js';
import { RetryProvider } from './retry.js';
import type { Config } from '../config/schema.js';
import { resolvePrimaryModel, resolveFallbacks } from '../config/schema.js';

export function createProvider(config: Config): LLMProvider {
    const providers = config.providers;
    const modelCfg = config.agents.defaults.model;
    const primaryModel = resolvePrimaryModel(modelCfg);
    const fallbacks = resolveFallbacks(modelCfg);
    const hasFailover = fallbacks.length > 0;

    function wrapIfNeeded(provider: LLMProvider, providerName: string): LLMProvider {
        // Always wrap with RetryProvider first to handle transient 429s (like Gemini's free tier)
        provider = new RetryProvider(provider, 4, providerName);
        if (!hasFailover) return provider;
        return new FailoverProvider(provider, [primaryModel, ...fallbacks]);
    }

    // Determine which provider is explicitly enabled

    // Custom provider (highest priority - user explicitly configured)
    if ((providers as any).custom?.enabled && (providers as any).custom?.baseURL) {
        return wrapIfNeeded(new OpenAIProvider(
            (providers as any).custom.apiKey || 'not-required',
            (providers as any).custom.baseURL
        ), 'custom');
    }

    if (providers.openrouter?.enabled && providers.openrouter?.apiKey) {
        return wrapIfNeeded(new OpenRouterProvider(providers.openrouter.apiKey), 'openrouter');
    }

    if (providers.anthropic?.enabled && providers.anthropic?.apiKey) {
        return wrapIfNeeded(new AnthropicProvider(providers.anthropic.apiKey), 'anthropic');
    }

    // Google Gemini — OpenAI-compatible endpoint
    if ((providers as any).google?.enabled && (providers as any).google?.apiKey) {
        return wrapIfNeeded(new OpenAIProvider(
            (providers as any).google.apiKey,
            'https://generativelanguage.googleapis.com/v1beta/openai/'
        ), 'google');
    }

    if (providers.xai?.enabled && providers.xai?.apiKey) {
        return wrapIfNeeded(new OpenAIProvider(providers.xai.apiKey, 'https://api.x.ai/v1'), 'xai');
    }

    if (providers.openai?.enabled && providers.openai?.apiKey) {
        return wrapIfNeeded(new OpenAIProvider(providers.openai.apiKey, providers.openai.apiBase), 'openai');
    }

    // Fallback: try env vars
    if (process.env.OPENROUTER_API_KEY) {
        return wrapIfNeeded(new OpenRouterProvider(process.env.OPENROUTER_API_KEY), 'openrouter');
    }
    if (process.env.ANTHROPIC_API_KEY) {
        return wrapIfNeeded(new AnthropicProvider(process.env.ANTHROPIC_API_KEY), 'anthropic');
    }
    if (process.env.GEMINI_API_KEY) {
        return wrapIfNeeded(new OpenAIProvider(
            process.env.GEMINI_API_KEY,
            'https://generativelanguage.googleapis.com/v1beta/openai/'
        ), 'google');
    }
    if (process.env.XAI_API_KEY) {
        return wrapIfNeeded(new OpenAIProvider(process.env.XAI_API_KEY, 'https://api.x.ai/v1'), 'xai');
    }
    if (process.env.OPENAI_API_KEY) {
        return wrapIfNeeded(new OpenAIProvider(process.env.OPENAI_API_KEY), 'openai');
    }

    throw new Error(
        'No LLM provider configured. Run: nexusclaw onboard'
    );
}

export { LLMProvider } from './base.js';
export type { LLMResponse, ChatMessage, ToolCallRequest } from './base.js';
export { hasToolCalls } from './base.js';
export { FailoverProvider } from './failover.js';
export type { FallbackAttempt } from './failover.js';
