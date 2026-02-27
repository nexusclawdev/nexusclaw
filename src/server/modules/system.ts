/**
 * System module — CLI detection, real model catalog from provider APIs,
 * and system stats. Replaces hardcoded model lists with live API calls.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';

const execFileAsync = promisify(execFile);

export interface CliStatus {
    tool: string;
    installed: boolean;
    version?: string;
    path?: string;
}

export async function detectCli(tool: string, checkArgs: string[] = ['--version']): Promise<CliStatus> {
    try {
        const { stdout } = await execFileAsync(tool, checkArgs);
        return {
            tool,
            installed: true,
            version: stdout.trim().split('\n')[0],
        };
    } catch {
        return { tool, installed: false };
    }
}

export async function detectAllCli(): Promise<CliStatus[]> {
    const tools = [
        { name: 'claude', args: ['--version'] },
        { name: 'codex', args: ['--version'] },
        { name: 'gemini', args: ['--version'] },
        { name: 'opencode', args: ['--version'] },
        { name: 'copilot', args: ['--version'] },
        { name: 'antigravity', args: ['--version'] },
        { name: 'node', args: ['--version'] },
        { name: 'npm', args: ['--version'] },
        { name: 'git', args: ['--version'] },
    ];

    const results = await Promise.all(tools.map(t => detectCli(t.name, t.args)));

    if (!results.some(r => r.tool === 'node' && r.installed)) {
        results.push({ tool: 'node', installed: true, version: process.version });
    }

    results.push({ tool: 'nexusclaw', installed: true, version: '0.2.0' });

    return results;
}

export interface ModelInfo {
    id: string;
    name: string;
    provider: string;
    contextLength?: number;
    pricing?: { prompt?: number; completion?: number };
}

// ── Real model fetching from provider APIs ────────────────────────────────────

async function fetchOpenRouterModels(apiKey: string): Promise<ModelInfo[]> {
    try {
        const res = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return [];
        const data = await res.json() as any;
        return (data.data || []).map((m: any) => ({
            id: m.id,
            name: m.name || m.id,
            provider: 'openrouter',
            contextLength: m.context_length,
            pricing: {
                prompt: m.pricing?.prompt ? parseFloat(m.pricing.prompt) : undefined,
                completion: m.pricing?.completion ? parseFloat(m.pricing.completion) : undefined,
            },
        }));
    } catch {
        return [];
    }
}

async function fetchOpenAIModels(apiKey: string, baseUrl = 'https://api.openai.com/v1'): Promise<ModelInfo[]> {
    try {
        const res = await fetch(`${baseUrl}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return [];
        const data = await res.json() as any;
        const chatModels = (data.data || []).filter((m: any) =>
            m.id.startsWith('gpt') || m.id.startsWith('o1') || m.id.startsWith('o3') ||
            m.id.startsWith('chatgpt')
        );
        return chatModels.map((m: any) => ({
            id: m.id,
            name: m.id,
            provider: 'openai',
        }));
    } catch {
        return [];
    }
}

async function fetchAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
    // Anthropic doesn't have a models list endpoint, return known ones if key present
    if (!apiKey) return [];
    return [
        { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'anthropic', contextLength: 200000 },
        { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'anthropic', contextLength: 200000 },
        { id: 'claude-haiku-3-5', name: 'Claude Haiku 3.5', provider: 'anthropic', contextLength: 200000 },
        { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'anthropic', contextLength: 200000 },
        { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic', contextLength: 200000 },
    ];
}

/** Fallback static list when no provider API keys are configured */
const STATIC_MODELS: ModelInfo[] = [
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openrouter' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openrouter' },
    { id: 'openai/gpt-4.1', name: 'GPT-4.1', provider: 'openrouter' },
    { id: 'anthropic/claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'openrouter' },
    { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'openrouter' },
    { id: 'anthropic/claude-haiku-3-5', name: 'Claude Haiku 3.5', provider: 'openrouter' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'openrouter' },
    { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'openrouter' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'openrouter' },
    { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'openrouter' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'openrouter' },
    { id: 'openai/gpt-oss-20b:free', name: 'GPT OSS 20B (free)', provider: 'openrouter' },
];

/** Model cache: avoid hammering provider APIs on every /api/cli-models call */
let modelCache: { models: ModelInfo[]; fetchedAt: number } | null = null;
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch available models from configured provider APIs.
 * Reads API keys from environment variables.
 * Falls back to a static list if no keys are configured.
 */
export async function getAvailableModels(): Promise<ModelInfo[]> {
    // Return from cache if fresh
    if (modelCache && Date.now() - modelCache.fetchedAt < MODEL_CACHE_TTL_MS) {
        return modelCache.models;
    }

    const openrouterKey = process.env.OPENROUTER_API_KEY || '';
    const openaiKey = process.env.OPENAI_API_KEY || '';
    const anthropicKey = process.env.ANTHROPIC_API_KEY || '';

    const fetches: Promise<ModelInfo[]>[] = [];

    if (openrouterKey) fetches.push(fetchOpenRouterModels(openrouterKey));
    if (openaiKey) fetches.push(fetchOpenAIModels(openaiKey));
    if (anthropicKey) fetches.push(fetchAnthropicModels(anthropicKey));

    let models: ModelInfo[] = [];
    if (fetches.length > 0) {
        const results = await Promise.allSettled(fetches);
        for (const r of results) {
            if (r.status === 'fulfilled') models.push(...r.value);
        }
    }

    // Deduplicate by ID
    const seen = new Set<string>();
    models = models.filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
    });

    // Fall back to static if nothing fetched
    if (models.length === 0) models = STATIC_MODELS;

    modelCache = { models, fetchedAt: Date.now() };
    return models;
}

/**
 * Invalidate the model cache. Call after API key changes.
 */
export function invalidateModelCache(): void {
    modelCache = null;
}

export function getSystemStats() {
    return {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMem: os.totalmem(),
        freeMem: os.freemem(),
        uptime: os.uptime(),
        loadAvg: os.loadavg(),
        nodeVersion: process.version,
    };
}
