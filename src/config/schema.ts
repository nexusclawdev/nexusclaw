/**
 * NexusClaw Configuration
 * JSON config file at ~/.nexusclaw/config.json (like nanobot)
 */

import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const ProviderConfigSchema = z.object({
    apiKey: z.string().optional(),
    apiBase: z.string().optional(),
    baseURL: z.string().optional(),
    enabled: z.boolean().optional(),
    model: z.string().optional(),
});

// Model can be a simple string OR a failover config
const ModelConfigSchema = z.union([
    z.string(),
    z.object({
        primary: z.string(),
        fallbacks: z.array(z.string()).default([]),
    }),
]);
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

/** Resolve the primary model string from a ModelConfig */
export function resolvePrimaryModel(model: ModelConfig): string {
    return typeof model === 'string' ? model : model.primary;
}

/** Resolve the fallback chain from a ModelConfig */
export function resolveFallbacks(model: ModelConfig): string[] {
    return typeof model === 'string' ? [] : model.fallbacks;
}

const TelegramConfigSchema = z.object({
    enabled: z.boolean().default(false),
    token: z.string().default(''),
    allowFrom: z.array(z.string()).default([]),
    allowFromUserIds: z.array(z.number()).default([]),
    proxy: z.string().optional(),
    dmPolicy: z.enum(['open', 'pairing', 'closed']).default('open'),
});

const WhatsAppConfigSchema = z.object({
    enabled: z.boolean().default(false),
    allowFrom: z.array(z.string()).default([]),
    allowFromNumbers: z.array(z.string()).default([]),
    dmPolicy: z.enum(['open', 'pairing', 'closed']).default('open'),
});

const DiscordConfigSchema = z.object({
    enabled: z.boolean().default(false),
    token: z.string().default(''),
    allowFrom: z.array(z.string()).default([]),
    dmPolicy: z.enum(['open', 'pairing', 'closed']).default('open'),
});

const WebConfigSchema = z.object({
    enabled: z.boolean().default(true),
    port: z.number().default(3100),
    host: z.string().default('0.0.0.0'),
});

const AgentDefaultsSchema = z.object({
    model: ModelConfigSchema.default('gpt-4o'),
    maxIterations: z.number().default(25),
    temperature: z.number().default(0.7),
    maxTokens: z.number().default(4096),
    memoryWindow: z.number().default(50),
    sessionPruning: z.object({
        enabled: z.boolean().default(false),
        maxMessages: z.number().default(100),
        keepLast: z.number().default(30),
    }).default({}),
    rateLimiting: z.object({
        enabled: z.boolean().default(false),
        capacity: z.number().default(10),
        refillRate: z.number().default(0.5),
    }).default({}),
});

const BrowserConfigSchema = z.object({
    enabled: z.boolean().default(true),
    headless: z.boolean().default(false),
    stealth: z.boolean().default(true),
    timeout: z.number().default(30000),
    dockerIsolation: z.boolean().default(false),
});

const SecurityConfigSchema = z.object({
    restrictToWorkspace: z.boolean().default(false),
    encryptionKey: z.string().optional(),
    domainWhitelist: z.array(z.string()).default([]),
    domainBlacklist: z.array(z.string()).default([
        '169.254.169.254',    // AWS metadata
        'metadata.google.internal',
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
    ]),
    blockedPatterns: z.array(z.string()).default([
        'delete.*account',
        'transfer.*funds',
        'change.*password',
        'admin.*panel',
    ]),
    commandDenyPatterns: z.array(z.string()).default([
        'rm\\s+-rf\\s+/',
        'format\\s+c:',
        'dd\\s+if=',
        ':\\(\\)\\{.*\\};:',  // fork bomb
    ]),
});

const McpServerSchema = z.object({
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    url: z.string().optional(),
    headers: z.record(z.string()).optional(),
});

const ToolsConfigSchema = z.object({
    restrictToWorkspace: z.boolean().default(false),
    execTimeout: z.number().default(60),
    mcpServers: z.record(McpServerSchema).default({}),
});

export const ConfigSchema = z.object({
    providers: z.record(ProviderConfigSchema).default({}),
    agents: z.object({
        defaults: AgentDefaultsSchema.default({}),
    }).default({}),
    channels: z.object({
        telegram: TelegramConfigSchema.default({}),
        whatsapp: WhatsAppConfigSchema.default({}),
        discord: DiscordConfigSchema.default({}),
        web: WebConfigSchema.default({}),
    }).default({}),
    browser: BrowserConfigSchema.default({ headless: false }),
    security: SecurityConfigSchema.default({}),
    tools: ToolsConfigSchema.default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

/** Get the NexusClaw home directory */
export function getHomeDir(): string {
    return join(homedir(), '.nexusclaw');
}

/** Get the workspace directory */
export function getWorkspaceDir(): string {
    return join(getHomeDir(), 'workspace');
}

/** Load config from ~/.nexusclaw/config.json */
export function loadConfig(): Config {
    const configPath = join(getHomeDir(), 'config.json');

    if (!existsSync(configPath)) {
        return ConfigSchema.parse({});
    }

    try {
        const raw = readFileSync(configPath, 'utf-8').replace(/^\uFEFF/, ''); // strip BOM
        return ConfigSchema.parse(JSON.parse(raw));
    } catch (err) {
        console.error('Failed to load config:', err);
        return ConfigSchema.parse({});
    }
}

/** Save config to disk */
export function saveConfig(config: Config): void {
    const homeDir = getHomeDir();
    if (!existsSync(homeDir)) {
        mkdirSync(homeDir, { recursive: true });
    }
    writeFileSync(
        join(homeDir, 'config.json'),
        JSON.stringify(config, null, 2),
        'utf-8',
    );
}

/** Get default config for onboarding */
export function getDefaultConfig(): Config {
    return ConfigSchema.parse({
        providers: {
            openai: { apiKey: '' },
        },
        agents: {
            defaults: { model: 'gpt-4o' },
        },
        channels: {
            web: { enabled: true },
        },
    });
}
