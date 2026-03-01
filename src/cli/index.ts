#!/usr/bin/env node

/**
 * NexusClaw CLI — command-line interface.
 *
 * Commands:
 *   nexusclaw onboard       — Interactive setup wizard
 *   nexusclaw agent         — Interactive chat mode
 *   nexusclaw agent -m      — Single message mode
 *   nexusclaw gateway       — Start all channels + dashboard
 *   nexusclaw status        — Show status
 *   nexusclaw doctor        — Diagnose issues
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createInterface } from 'node:readline';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import v8 from 'node:v8';

// Memory optimization: 256MB Heap limit for smooth performance
v8.setFlagsFromString('--max-old-space-size=256');

import { loadConfig, saveConfig, getDefaultConfig, getHomeDir, getWorkspaceDir, resolvePrimaryModel } from '../config/schema.js';
import { MessageBus } from '../bus/index.js';
import { AgentLoop } from '../agent/loop.js';
import { TaskWorker } from '../agent/task-worker.js';
import { Database } from '../db/database.js';
import { createServer } from '../server/api.js';
import { createProvider } from '../providers/index.js';
import { TelegramChannel, WhatsAppChannel, DiscordChannel, WebChannel } from '../channels/index.js';
import { configCmd } from './config-cmd.js';
import { authCmd } from './auth.js';
import { skillsCmd } from './skills.js';
import { cronCmd } from './cron.js';
import { migrateCmd } from './migrate.js';
import { pairingCmd } from './pairing.js';
import { displayLogo } from './logo.js';
import type { NotificationConfig } from '../notifications/index.js';
import { readFileSync } from 'node:fs';

const program = new Command();

program
    .name('nexusclaw')
    .description('🐾 NexusClaw: Ultra-Lightweight Secure AI Agent')
    .version('0.1.0');

// ── config ──
program.addCommand(configCmd);

// ── auth ──
program.addCommand(authCmd);

// ── skills ──
program.addCommand(skillsCmd);

// ── cron ──
program.addCommand(cronCmd);

// ── migrate ──
program.addCommand(migrateCmd);

// ── channels ──
const channelsCmd = new Command('channels')
    .description('Manage messaging channels');
channelsCmd
    .command('login')
    .description('Interactive login setup')
    .action(() => {
        console.log(`${chalk.cyan('🔐')}  ${chalk.bold('Channel Login')} is now integrated with the main OAuth system.`);
        console.log(`   Use ${chalk.white('nexusclaw auth login')} to manage your channel credentials.`);
    });
program.addCommand(channelsCmd);

// ── agent ──
program
    .command('agent')
    .description('Chat with the agent')
    .option('-m, --message <msg>', 'Send a single message')
    .option('--no-markdown', 'Plain text output')
    .action(async (opts) => {
        const config = loadConfig();
        const workspace = getWorkspaceDir();
        if (!existsSync(workspace)) mkdirSync(workspace, { recursive: true });

        let provider;
        try {
            provider = createProvider(config);
        } catch (err) {
            console.error(chalk.red(`❌ ${err instanceof Error ? err.message : String(err)}`));
            console.log(`\n${chalk.blue('💡')}  Run ${chalk.bold('nexusclaw onboard')} first, then add your API key.`);
            process.exit(1);
        }

        const bus = new MessageBus();
        const db = new Database(workspace);
        const agent = new AgentLoop(bus, provider, db, workspace, config);

        if (opts.message) {
            // Single message mode
            const onProgress = async (text: string) => {
                process.stdout.write(`  ⏳ ${text}\n`);
            };
            const response = await agent.nexusDirect(opts.message, 'cli', 'direct', onProgress);
            console.log(`\n${response}`);
            process.exit(0);
        }

        // Interactive mode
        console.log(`${chalk.cyan('🐾')}  ${chalk.bold('NexusClaw Interactive Agent')}`);
        console.log(`   ${chalk.dim('Type your message and press Enter. Exit: /exit, Ctrl+D')}\n`);

        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '🐾 > ',
        });

        rl.prompt();

        rl.on('line', async (line) => {
            const input = line.trim();
            if (!input) { rl.prompt(); return; }
            if (['/exit', '/quit', 'exit', 'quit', ':q'].includes(input.toLowerCase())) {
                console.log('👋 Bye!');
                process.exit(0);
            }

            try {
                const onProgress = async (text: string) => {
                    process.stdout.write(`  ${chalk.blue('⏳')} ${chalk.dim(text)}\n`);
                };
                const response = await agent.nexusDirect(input, 'cli', 'interactive', onProgress);
                console.log(`\n${response}\n`);
            } catch (err) {
                console.error(chalk.red(`❌ Error: ${err instanceof Error ? err.message : String(err)}`));
            }

            rl.prompt();
        });

        rl.on('close', () => {
            console.log('\n👋 Bye!');
            process.exit(0);
        });
    });

// ── gateway ──
program
    .command('gateway')
    .description('Start all chat channels (Telegram, WhatsApp, Discord, Web)')
    .action(async () => {
        displayLogo();

        const config = loadConfig();
        const workspace = getWorkspaceDir();
        if (!existsSync(workspace)) mkdirSync(workspace, { recursive: true });

        const bus = new MessageBus();
        const db = new Database(workspace);

        // Try to start AI agent FIRST (before server, so it can be passed in)
        let agent: AgentLoop | null = null;
        try {
            const provider = createProvider(config);
            agent = new AgentLoop(bus, provider, db, workspace, config);
            console.log(`${chalk.magenta('🧠')}  ${chalk.bold('AI Agent:')} ${chalk.green('active')} ${chalk.dim(`(${resolvePrimaryModel(config.agents.defaults.model)})`)}`);
        } catch (err) {
            console.log(`${chalk.yellow('⚠️')}  ${chalk.bold('AI Agent:')} ${chalk.red('offline')} ${chalk.dim(`(${err instanceof Error ? err.message : String(err)})`)}`);;
            console.log(`   ${chalk.dim('Dashboard is still running. Add an API key to enable the AI agent.')}\n`);
        }

        // Start API server — pass agent so /api/messages + /api/gateway can use it
        const server = await createServer(db, bus, config, agent ?? undefined);
        const port = config.channels.web.port;
        await server.listen({ port, host: config.channels.web.host });
        console.log(`${chalk.green('🌐')}  ${chalk.bold('API Server:')} ${chalk.cyan(`http://localhost:${port}`)}`);
        console.log(`   ${chalk.bold('Dashboard:')}  ${chalk.cyan(`http://localhost:${port}`)}`);
        console.log(`   ${chalk.bold('Health:')}     ${chalk.cyan(`http://localhost:${port}/healthz`)}`);
        console.log(`   ${chalk.bold('WebSocket:')}  ${chalk.cyan(`ws://localhost:${port}/ws`)}`);

        // Start channels without blocking the main thread
        const channels = [
            new TelegramChannel(bus, config.channels.telegram),
            new WhatsAppChannel(bus, config.channels.whatsapp),
            new DiscordChannel(bus, config.channels.discord),
        ];

        for (const ch of channels) {
            ch.start().catch((err: any) => console.error(`${chalk.red('Channel start error:')}`, err));
        }

        console.log(`\n${chalk.cyan('🐾')}  ${chalk.bold('NexusClaw Gateway running.')} ${chalk.dim('Press Ctrl+C to stop.')}\n`);

        // Start agent loop and autonomous task worker
        let taskWorker: TaskWorker | null = null;
        if (agent) {
            agent.run();

            // Start autonomous task execution worker
            let notificationConfig: NotificationConfig | undefined;
            const notifPath = join(getHomeDir(), 'config', 'notifications.json');
            if (existsSync(notifPath)) {
                try {
                    notificationConfig = JSON.parse(readFileSync(notifPath, 'utf-8'));
                    console.log(chalk.green('✅ Notifications enabled'));
                } catch (err) {
                    console.warn(chalk.yellow('⚠️  Invalid notifications.json, skipping'));
                }
            }

            taskWorker = new TaskWorker(db, agent, bus, notificationConfig);
            taskWorker.start().catch(err => {
                console.error(chalk.red('TaskWorker error:'), err);
            });
        }

        // Graceful shutdown
        const shutdown = async () => {
            console.log('\n🛑 Shutting down...');
            if (taskWorker) taskWorker.stop();
            if (agent) agent.stop();
            for (const ch of channels) {
                await ch.stop();
            }
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    });


// ── Dynamic Commands Loader ──
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const commandsDir = join(__dirname, 'commands');

if (existsSync(commandsDir)) {
    const files = readdirSync(commandsDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    for (const file of files) {
        try {
            const modulePath = join(commandsDir, file);
            // Dynamic import for the command module
            const module = await import(`file://${modulePath}`);
            // If the module exports a Command instance (named or default)
            for (const key of Object.keys(module)) {
                if (module[key] instanceof Command) {
                    program.addCommand(module[key]);
                }
            }
        } catch (err) {
            console.error(chalk.yellow(`⚠️  Failed to load custom command from ${file}:`), err);
        }
    }
}

if (process.argv.length <= 2) {
    displayLogo();
    console.log(`\n${chalk.cyan('🐾')}  ${chalk.bold('NexusClaw: The Mission Control CLI')}`);
    console.log(`   ${chalk.dim('v0.1.0 — Ultra-Lightweight AI Agent Framework')}`);
    console.log(chalk.dim('─'.repeat(50)));
    console.log(`\n   ${chalk.blue('🚀 Quick Start:')}`);
    console.log(`     1. ${chalk.bold('nexusclaw setup')}    — Link command globally`);
    console.log(`     2. ${chalk.bold('nexusclaw onboard')}  — Standard interactive setup`);
    console.log(`     3. ${chalk.bold('nexusclaw gateway')}  — Launch all systems`);
    console.log(`\n   ${chalk.dim('Run')} ${chalk.bold('nexusclaw --help')} ${chalk.dim('for the full manifest.')}\n`);
} else {
    program.parse();
}
