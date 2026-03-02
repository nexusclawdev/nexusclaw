/**
 * Interactive Onboard Wizard — step-by-step terminal setup.
 * No manual file editing needed. Just answer the prompts.
 */
process.removeAllListeners('warning');

import inquirer from 'inquirer';
import chalk from 'chalk';
import gradient from 'gradient-string';
import ora from 'ora';
import { existsSync, mkdirSync } from 'node:fs';
import { loadConfig, saveConfig, getDefaultConfig, getHomeDir, getWorkspaceDir, type Config } from '../config/schema.js';
import { createProvider } from '../providers/index.js';
import { displayLogo } from './logo.js';

// --- UI Helpers ---

function renderBox(title: string, lines: string[], color: any = chalk.reset) {
    const width = 90;
    const titleStr = `${title} ${'-'.repeat(Math.max(0, width - title.length - 3))}+`;
    console.log(color(`┌  ${titleStr}`));
    console.log(color(`│  ${' '.repeat(width - 4)}  │`));
    for (const line of lines) {
        // Simple strip ansi for length calculation
        const stripAnsi = (str: string) => str.replace(/\x1B\[\d+m/g, '');
        const visibleLength = stripAnsi(line).length;
        const padding = ' '.repeat(Math.max(0, width - 6 - visibleLength));
        console.log(color(`│  `) + line + padding + color(`  │`));
    }
    console.log(color(`│  ${' '.repeat(width - 4)}  │`));
    console.log(color(`└${'-'.repeat(width - 1)}┘`));
    console.log(color(`│`));
}

function renderNode(text: string, icon = '>', color: any = chalk.cyan) {
    console.log(`${color(icon)}  ${text}`);
    console.log(`${color('│')}`);
}

function renderPromptPrefix(icon = '>') {
    return chalk.cyan(icon);
}

// --- Constants ---

const PROVIDERS = [
    { name: 'OpenAI (gpt-5.2, gpt-4o, o4-mini)', value: 'openai' },
    { name: 'Anthropic (Claude 4.6)', value: 'anthropic' },
    { name: 'OpenRouter (Any model via unified API)', value: 'openrouter' },
    { name: 'Google (Gemini 3.1 Pro)', value: 'google' },
    { name: 'xAI (Grok 4)', value: 'xai' },
    { name: 'Custom Provider', value: 'custom' },
    { name: 'Skip for now', value: 'skip' }
];

// --- Main Wizard ---

export async function runOnboardWizard(autoStart: boolean = false): Promise<void> {
    try {
        await runOnboardWizardInternal(autoStart);
    } catch (error: any) {
        // Handle user cancellation (Ctrl+C)
        if (error.name === 'ExitPromptError' || error.message?.includes('SIGINT') || error.message?.includes('force closed')) {
            console.log('\n\n🛑 Onboarding cancelled by user.');
            process.exit(0);
        }
        // Rethrow unexpected errors
        throw error;
    }
}

async function runOnboardWizardInternal(autoStart: boolean = false): Promise<void> {
    console.clear();
    displayLogo();

    renderNode(chalk.cyan.bold('Welcome to NexusClaw Setup'), '>', chalk.cyan);

    const home = getHomeDir();
    const workspace = getWorkspaceDir();
    if (!existsSync(home)) mkdirSync(home, { recursive: true });
    if (!existsSync(workspace)) mkdirSync(workspace, { recursive: true });

    let config: Config;
    try {
        config = loadConfig();
    } catch {
        config = getDefaultConfig();
    }

    // Step 1: Security Warning
    renderBox(chalk.yellow.bold('Security Notice'), [
        chalk.yellow('Please read this important security information.'),
        '',
        'NexusClaw is a powerful AI agent platform currently in beta.',
        'This agent can read files and execute actions when tools are enabled.',
        'Improper configuration or malicious prompts could lead to unsafe operations.',
        '',
        chalk.bold('If you are unfamiliar with security best practices, seek assistance first.'),
        '',
        chalk.cyan('Recommended security baseline:'),
        '  - Enable pairing/allowlists with mention gating',
        '  - Use sandbox mode with least-privilege tools',
        '  - Keep secrets outside agent-accessible directories',
        '  - Use the strongest available model for production',
        '',
        chalk.dim('Learn more: https://github.com/nexusclaw/nexusclaw/security')
    ], chalk.dim);

    const { continueSetup } = await inquirer.prompt([{
        type: 'select',
        name: 'continueSetup',
        message: 'I understand the risks and want to continue',
        prefix: renderPromptPrefix(),
        choices: ['Yes, continue', 'No, exit setup']
    }]);

    console.log(chalk.dim('│')); // Continue connector

    if (continueSetup === 'No, exit setup') {
        console.log(chalk.yellow('\nSetup cancelled. Stay safe!\n'));
        process.exit(1);
    }

    // Step 2: Mode
    const { mode } = await inquirer.prompt([{
        type: 'select',
        name: 'mode',
        message: 'Choose setup mode',
        prefix: renderPromptPrefix(),
        choices: [
            { name: 'QuickStart (Recommended for beginners)', value: 'QuickStart' },
            { name: 'Advanced (Full configuration control)', value: 'Advanced' }
        ]
    }]);

    console.log(chalk.dim('│'));

    // Mode-specific configuration
    if (mode === 'Advanced') {
        renderBox(chalk.magenta.bold('Advanced Configuration'), [
            'You have full control over ports, security, and advanced settings.',
            chalk.dim('Configure each option carefully for your environment.')
        ], chalk.cyan);

        // Port configuration
        const { port } = await inquirer.prompt([{
            type: 'input',
            name: 'port',
            message: 'Gateway port:',
            prefix: renderPromptPrefix(),
            default: config.channels.web.port || 3100,
            validate: (input: string) => {
                const num = parseInt(input);
                if (isNaN(num) || num < 1024 || num > 65535) {
                    return 'Port must be between 1024 and 65535';
                }
                return true;
            }
        }]);
        config.channels.web.port = parseInt(port);

        console.log(chalk.dim('│'));

        // Bind address
        const { bindAddress } = await inquirer.prompt([{
            type: 'select',
            name: 'bindAddress',
            message: 'Gateway bind address:',
            prefix: renderPromptPrefix(),
            choices: [
                { name: '127.0.0.1 (Localhost only - Recommended)', value: '127.0.0.1' },
                { name: '0.0.0.0 (All interfaces - Use with caution)', value: '0.0.0.0' }
            ]
        }]);
        config.channels.web.host = bindAddress;

        console.log(chalk.dim('│'));

        // Security settings
        const { restrictWorkspace } = await inquirer.prompt([{
            type: 'select',
            name: 'restrictWorkspace',
            message: 'Restrict agent to workspace directory?',
            prefix: renderPromptPrefix(),
            choices: [
                { name: 'Yes (Recommended - Sandbox mode)', value: true },
                { name: 'No (Allow full filesystem access)', value: false }
            ]
        }]);
        config.security.restrictToWorkspace = restrictWorkspace;
        config.tools.restrictToWorkspace = restrictWorkspace;

        console.log(chalk.dim('│'));

        renderBox(chalk.green.bold('Advanced Configuration Complete'), [
            chalk.cyan(`Gateway port: ${config.channels.web.port}`),
            chalk.cyan(`Gateway bind: ${config.channels.web.host}`),
            chalk.cyan(`Workspace: ${workspace}`),
            chalk.cyan(`Sandbox mode: ${config.security.restrictToWorkspace ? 'Enabled' : 'Disabled'}`)
        ], chalk.cyan);
    } else {
        // QuickStart Summary
        renderBox(chalk.blue.bold('QuickStart Configuration'), [
            chalk.cyan(`Gateway port: ${config.channels.web.port || 3100}`),
            chalk.cyan(`Gateway bind: 127.0.0.1 (Loopback)`),
            chalk.cyan(`Workspace: ${workspace}`),
            chalk.cyan(`Security: Sandbox enabled`),
            chalk.dim('Ready for chat channels.')
        ], chalk.cyan);
    }

    // Step 3: Provider Selection
    const { selectedProvider } = await inquirer.prompt([{
        type: 'select',
        name: 'selectedProvider',
        message: chalk.cyan.bold('Select AI Model Provider'),
        prefix: chalk.cyan('>'),
        choices: PROVIDERS.map(p => ({
            name: p.name,
            value: p.value
        }))
    }]);

    console.log(chalk.dim('│'));

    if (selectedProvider === 'custom') {
        // Custom Provider Setup
        renderNode(chalk.magenta.bold('Custom Provider Setup'), '>', chalk.magenta);

        renderBox(chalk.magenta.bold('Custom Provider Configuration'), [
            'Configure any OpenAI-compatible API endpoint.',
            chalk.cyan('Works with: Ollama, LM Studio, LocalAI, and more.'),
            '',
            chalk.bold('Required:'),
            '  - Base URL (e.g., http://localhost:11434/v1)',
            '  - Model name (e.g., llama3.2, mistral)',
            '',
            chalk.bold('Optional:'),
            '  - API key (if your endpoint requires authentication)'
        ], chalk.cyan);

        const { customBaseUrl } = await inquirer.prompt([{
            type: 'input',
            name: 'customBaseUrl',
            message: 'API base URL:',
            prefix: renderPromptPrefix(),
            validate: (input: string) => {
                if (!input || input.trim().length === 0) return 'Base URL is required';
                try {
                    new URL(input);
                    return true;
                } catch {
                    return 'Please enter a valid URL';
                }
            }
        }]);

        console.log(chalk.dim('│'));

        const { customApiKey } = await inquirer.prompt([{
            type: 'password',
            name: 'customApiKey',
            message: 'API key (optional, press Enter to skip):',
            prefix: renderPromptPrefix(),
            mask: '•',
            default: ''
        }]);

        console.log(chalk.dim('│'));

        const { customModel } = await inquirer.prompt([{
            type: 'input',
            name: 'customModel',
            message: 'Model name:',
            prefix: renderPromptPrefix(),
            validate: (input: string) => {
                if (!input || input.trim().length === 0) return 'Model name is required';
                return true;
            }
        }]);

        console.log(chalk.dim('│'));

        // Save custom provider config
        if (!config.providers) config.providers = {} as any;
        (config.providers as any).custom = {
            baseURL: customBaseUrl.trim(),
            apiKey: customApiKey.trim() || 'not-required',
            model: customModel.trim()
        };
        config.agents.defaults.model = customModel.trim();

        renderBox(chalk.green.bold('Custom Provider Configured'), [
            chalk.cyan(`Base URL: ${customBaseUrl.trim()}`),
            chalk.cyan(`Model: ${customModel.trim()}`),
            chalk.cyan(`API Key: ${customApiKey.trim() ? 'Set' : 'Not required'}`)
        ], chalk.cyan);

    } else if (selectedProvider !== 'skip') {
        const p = selectedProvider as string;

        renderNode(chalk.green.bold(`${p.charAt(0).toUpperCase() + p.slice(1)} Authentication`), '>', chalk.green);

        // Env Check
        const envKeys = {
            openai: process.env.OPENAI_API_KEY,
            anthropic: process.env.ANTHROPIC_API_KEY,
            openrouter: process.env.OPENROUTER_API_KEY,
            google: process.env.GEMINI_API_KEY,
            xai: process.env.XAI_API_KEY
        };
        const envKey = (envKeys as any)[p];
        const existingKey = getExistingKey(config, p);

        const { apiKey } = await inquirer.prompt([{
            type: 'password',
            name: 'apiKey',
            message: `Enter ${p.toUpperCase()} API key:`,
            prefix: renderPromptPrefix(),
            mask: '•',
            default: envKey || existingKey || undefined,
            validate: (input: string) => {
                if (!input || input.trim().length < 8) return 'API key seems too short. Please enter a valid key.';
                return true;
            },
        }]);

        console.log(chalk.dim('│'));

        const key = apiKey.trim();
        const spinner = ora({
            text: chalk.cyan(`Verifying ${p.toUpperCase()} API key...`),
            color: 'cyan'
        }).start();
        try {
            const tempConfig = JSON.parse(JSON.stringify(config));
            setProviderKey(tempConfig, p, key);
            createProvider(tempConfig); // Quick syntax validation

            spinner.succeed(chalk.green(`${p.toUpperCase()} API key verified`));
            setProviderKey(config, p, key);

            // Auto set default model
            const providerDefaults: Record<string, string[]> = {
                openai: [
                    // GPT-5.3 Series
                    'gpt-5.3-codex',
                    'gpt-5.3-codex-spark',
                    // GPT-5.2 Series
                    'gpt-5.2',
                    'gpt-5.2-chat-latest',
                    'gpt-5.2-codex',
                    'gpt-5.2-pro',
                    // GPT-5.1 Series
                    'gpt-5.1',
                    'gpt-5.1-chat-latest',
                    'gpt-5.1-codex',
                    'gpt-5.1-codex-max',
                    'gpt-5.1-codex-mini',
                    // GPT-5 Series
                    'gpt-5',
                    'gpt-5-chat-latest',
                    'gpt-5-mini',
                    'gpt-5-nano',
                    'gpt-5-pro',
                    'gpt-5-codex',
                    // GPT-4.1 Series
                    'gpt-4.1',
                    'gpt-4.1-mini',
                    'gpt-4.1-nano',
                    // GPT-4o Series
                    'gpt-4o',
                    'gpt-4o-2024-11-20',
                    'gpt-4o-2024-08-06',
                    'gpt-4o-2024-05-13',
                    'gpt-4o-mini',
                    // GPT-4 Series
                    'gpt-4-turbo',
                    'gpt-4',
                    'gpt-3.5-turbo',
                    // Reasoning Models (o-series)
                    'o4-mini',
                    'o4-mini-deep-research',
                    'o3-pro',
                    'o3',
                    'o3-mini',
                    'o3-deep-research',
                    'o1-pro',
                    'o1',
                    'o1-mini',
                    // Codex
                    'codex-mini-latest'
                ],
                anthropic: [
                    // Claude 4.6 (Latest)
                    'claude-opus-4-6',
                    'claude-sonnet-4-6',
                    'claude-haiku-4-5-20251001',
                    'claude-haiku-4-5',
                    // Claude 4.5
                    'claude-sonnet-4-5-20250929',
                    'claude-sonnet-4-5',
                    'claude-opus-4-5-20251101',
                    'claude-opus-4-5',
                    // Claude 4.1
                    'claude-opus-4-1-20250805',
                    'claude-opus-4-1',
                    // Claude 4.0
                    'claude-sonnet-4-20250514',
                    'claude-sonnet-4-0',
                    'claude-opus-4-20250514',
                    'claude-opus-4-0',
                    // Claude 3.5
                    'claude-3-5-sonnet-20241022',
                    'claude-3-5-sonnet-20240620',
                    'claude-3-5-haiku-20241022',
                    // Claude 3
                    'claude-3-opus-20240229',
                    'claude-3-sonnet-20240229',
                    'claude-3-haiku-20240307'
                ],
                openrouter: [
                    // Free Models
                    'arcee-ai/trinity-large-preview:free',
                    'meta-llama/llama-3.3-70b-instruct:free',
                    'meta-llama/llama-3.1-405b-instruct:free',
                    'meta-llama/llama-3.1-70b-instruct:free',
                    'meta-llama/llama-3.1-8b-instruct:free',
                    'google/gemini-flash-1.5-8b:free',
                    'mistralai/mistral-7b-instruct:free',
                    'mistralai/mixtral-8x7b-instruct:free',
                    'qwen/qwen-2.5-72b-instruct:free',
                    'microsoft/phi-3-medium-128k-instruct:free',
                    'microsoft/phi-3-mini-128k-instruct:free',
                    'huggingfaceh4/zephyr-7b-beta:free',
                    'openchat/openchat-7b:free',
                    'gryphe/mythomist-7b:free',
                    'undi95/toppy-m-7b:free',
                    'nousresearch/nous-capybara-7b:free',
                    // Anthropic
                    'anthropic/claude-opus-4-20250514',
                    'anthropic/claude-sonnet-4-20250514',
                    'anthropic/claude-3.5-sonnet',
                    'anthropic/claude-3.5-haiku',
                    'anthropic/claude-3-opus',
                    'anthropic/claude-3-sonnet',
                    'anthropic/claude-3-haiku',
                    // OpenAI
                    'openai/gpt-4o',
                    'openai/gpt-4o-mini',
                    'openai/o1',
                    'openai/o1-mini',
                    'openai/o3-mini',
                    'openai/gpt-4-turbo',
                    'openai/gpt-3.5-turbo',
                    // Google
                    'google/gemini-2.5-pro',
                    'google/gemini-pro-1.5',
                    'google/gemini-flash-1.5',
                    'google/gemini-flash-1.5-8b',
                    // DeepSeek
                    'deepseek/deepseek-chat',
                    'deepseek/deepseek-r1',
                    'deepseek/deepseek-r1-distill-llama-70b',
                    // Meta Llama
                    'meta-llama/llama-3.3-70b-instruct',
                    'meta-llama/llama-3.1-405b-instruct',
                    'meta-llama/llama-3.1-70b-instruct',
                    'meta-llama/llama-3.1-8b-instruct',
                    // Mistral
                    'mistralai/mistral-large',
                    'mistralai/mistral-medium',
                    'mistralai/mistral-small',
                    'mistralai/mixtral-8x7b-instruct',
                    'mistralai/mixtral-8x22b-instruct',
                    // Qwen
                    'qwen/qwen-2.5-72b-instruct',
                    'qwen/qwen-2.5-coder-32b-instruct',
                    'qwen/qwq-32b-preview',
                    // xAI
                    'x-ai/grok-2-1212',
                    'x-ai/grok-beta',
                    // Cohere
                    'cohere/command-r-plus',
                    'cohere/command-r',
                    // Perplexity
                    'perplexity/llama-3.1-sonar-large-128k-online',
                    'perplexity/llama-3.1-sonar-small-128k-online',
                    // Others
                    'nvidia/llama-3.1-nemotron-70b-instruct',
                    'microsoft/phi-3-medium-128k-instruct',
                    'databricks/dbrx-instruct'
                ],
                xai: [
                    // Grok 4.1 Fast (Latest)
                    'grok-4-1-fast-reasoning',
                    'grok-4-1-fast-non-reasoning',
                    // Grok 4 Fast
                    'grok-4-fast-reasoning',
                    'grok-4-fast-non-reasoning',
                    // Grok Code
                    'grok-code-fast-1',
                    // Grok 4 (July 2024)
                    'grok-4-0709',
                    // Grok 3
                    'grok-3',
                    'grok-3-mini',
                    // Grok 2
                    'grok-2-vision-1212',
                    'grok-2-1212',
                    'grok-beta'
                ],
                google: [
                    // Gemini 2.5
                    'gemini-2.5-flash',
                    // Gemini 2.0
                    'gemini-2.0-flash',
                    // Gemini 1.5
                    'gemini-1.5-pro',
                    'gemini-1.5-flash',
                    'gemini-1.5-flash-8b'
                ],
            };

            const defaultChoices = providerDefaults[p] || ['default-model'];

            const { chosenModel } = await inquirer.prompt([{
                type: 'select',
                name: 'chosenModel',
                message: `Select default model for ${p}:`,
                prefix: chalk.cyan('>'),
                choices: [...defaultChoices, 'Enter custom model...']
            }]);

            let finalModel = chosenModel;
            if (chosenModel === 'Enter custom model...') {
                const { customModel } = await inquirer.prompt([{
                    type: 'input',
                    name: 'customModel',
                    message: `Type the exact model ID for ${p}:`,
                    prefix: chalk.cyan('>')
                }]);
                finalModel = customModel.trim();
            }

            config.agents.defaults.model = finalModel || defaultChoices[0];

            // MaxTokens should rely on defaults or what is defined in config.json

        } catch (err: any) {
            spinner.fail(chalk.red(`Validation failed: ${err.message}`));
            setProviderKey(config, p, key); // save anyway
        }
        console.log(chalk.dim('│'));
    }

    // Enforce strictly ONE active provider
    if (selectedProvider !== 'skip' && config.providers) {
        const providersObj = config.providers as any;
        for (const provKey of Object.keys(providersObj)) {
            if (providersObj[provKey]) {
                providersObj[provKey].enabled = (provKey === selectedProvider);
            }
        }
    }

    // Step 4: Channels
    const CHANNELS = [
        { name: 'Telegram (Bot API)', value: 'telegram' },
        { name: 'WhatsApp (QR link)', value: 'whatsapp' },
        { name: 'Discord (Bot API)', value: 'discord' },
        { name: 'Skip for now', value: 'skip' }
    ];

    const { selectedChannel } = await inquirer.prompt([{
        type: 'select',
        name: 'selectedChannel',
        message: chalk.cyan.bold('Select Communication Channel'),
        prefix: renderPromptPrefix(),
        choices: CHANNELS
    }]);

    console.log(chalk.dim('│'));

    if (selectedChannel === 'telegram') {
        renderBox(chalk.blue.bold('Telegram Bot Setup'), [
            chalk.cyan('Follow these steps to get your bot token:'),
            '',
            '1. Open Telegram and search for @BotFather',
            '2. Send /newbot command (or /mybots to manage existing)',
            '3. Follow the prompts to create your bot',
            '4. Copy the token (format: 123456789:ABC-DEF...)',
            '',
            chalk.dim('Tip: You can also set TELEGRAM_BOT_TOKEN environment variable')
        ], chalk.cyan);

        const { telegramToken } = await inquirer.prompt([{
            type: 'password',
            name: 'telegramToken',
            message: 'Telegram bot token:',
            prefix: renderPromptPrefix(),
            mask: '•',
            default: config.channels.telegram.token || undefined,
            validate: (input: string) => input.includes(':') || 'Token should look like 123456789:ABCdefGHI...',
        }]);

        console.log(chalk.dim('│'));
        config.channels.telegram.enabled = true;
        config.channels.telegram.token = telegramToken.trim();
        config.channels.telegram.allowFrom = ['*'];
    }
    else if (selectedChannel === 'discord') {
        renderBox(chalk.blue.bold('Discord Bot Setup'), [
            chalk.cyan('Follow these steps to get your bot token:'),
            '',
            '1. Visit https://discord.com/developers/applications',
            '2. Create New Application -> Bot tab -> Add Bot',
            '3. Enable MESSAGE CONTENT INTENT (required!)',
            '4. Copy the bot token',
            '5. OAuth2 -> URL Generator -> Select bot scope + permissions',
            '',
            chalk.dim('Tip: You can also set DISCORD_BOT_TOKEN environment variable')
        ], chalk.cyan);

        const { discordToken } = await inquirer.prompt([{
            type: 'password',
            name: 'discordToken',
            message: 'Discord bot token:',
            prefix: renderPromptPrefix(),
            mask: '•',
            default: config.channels.discord.token || undefined,
            validate: (input: string) => input.length > 50 || 'Token seems too short. Please enter a valid Discord bot token.',
        }]);

        console.log(chalk.dim('│'));
        config.channels.discord.enabled = true;
        config.channels.discord.token = discordToken.trim();
        config.channels.discord.allowFrom = ['*'];
    }
    else if (selectedChannel === 'whatsapp') {
        renderBox(chalk.green.bold('WhatsApp Setup'), [
            chalk.cyan('Quick setup steps:'),
            '',
            '1. Keep your phone nearby with WhatsApp installed',
            '2. The Gateway will start and connect to WhatsApp',
            '3. A QR code will appear in terminal (5-10 seconds)',
            '4. Open WhatsApp -> Linked Devices -> Link a Device -> Scan QR',
            '',
            chalk.dim('Your phone must stay connected to the internet')
        ], chalk.cyan);
        config.channels.whatsapp.enabled = true;
        config.channels.whatsapp.allowFrom = ['*'];
    }

    // Security Options (always enforce based on mode)
    if (mode === 'QuickStart') {
        config.security.restrictToWorkspace = true;
        config.tools.restrictToWorkspace = true;
    }

    // Save
    config.channels.web.enabled = true;
    saveConfig(config);

    // Final UI
    renderBox(chalk.green.bold('Configuration Complete'), [
        chalk.cyan('Your NexusClaw setup is ready!'),
        '',
        chalk.bold('Gateway Service:'),
        `  - Web UI: ${chalk.cyan(`http://127.0.0.1:${config.channels.web.port || 3100}/`)}`,
        `  - WebSocket: ${chalk.cyan(`ws://127.0.0.1:${config.channels.web.port || 3100}`)}`,
        '',
        chalk.bold('Documentation:'),
        `  - Control UI Guide: ${chalk.dim('https://docs.nexusclaw.ai/web/control-ui')}`,
        `  - Security Best Practices: ${chalk.dim('https://docs.nexusclaw.ai/security')}`
    ], chalk.cyan);

    renderBox(chalk.yellow.bold('Security Reminder'), [
        chalk.yellow('Running AI agents on your computer involves risks.'),
        chalk.cyan('Please review security hardening guide before production use:'),
        chalk.dim('https://docs.nexusclaw.ai/security')
    ], chalk.dim);

    console.log(chalk.cyan.bold('\nStarting NexusClaw Gateway...\n'));
    const { execSync } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');

    // Get the correct project root directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectRoot = join(__dirname, '..', '..');

    try {
        execSync('npx tsx src/cli/index.ts gateway', {
            stdio: 'inherit',
            cwd: projectRoot
        });
    } catch (error: any) {
        // Gateway was stopped by user (Ctrl+C), this is expected behavior
        if (error.status === 255 || error.signal === 'SIGINT' || error.signal === 'SIGTERM') {
            console.log(chalk.green('\n✅ Gateway stopped successfully.\n'));
            process.exit(0);
        }
        // Unexpected error, rethrow
        throw error;
    }
}

// ── Helpers ──

function getEnvKeyName(provider: string): string {
    return { openai: 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY', openrouter: 'OPENROUTER_API_KEY', xai: 'XAI_API_KEY', google: 'GEMINI_API_KEY' }[provider] || '';
}

function getExistingKey(config: Config, provider: string): string | undefined {
    const p = (config.providers as any)[provider];
    return p?.apiKey || process.env[getEnvKeyName(provider)] || undefined;
}

function setProviderKey(config: Config, provider: string, key: string): void {
    if (!config.providers) config.providers = {} as any;
    if (!(config.providers as any)[provider]) (config.providers as any)[provider] = {};
    (config.providers as any)[provider].apiKey = key;
}
