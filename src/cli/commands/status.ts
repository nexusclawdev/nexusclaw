import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { loadConfig, getHomeDir, getWorkspaceDir, resolvePrimaryModel } from '../../config/schema.js';

export const statusCommand = new Command('status')
    .description('Show NexusClaw status')
    .action(() => {
        const config = loadConfig();
        const home = getHomeDir();
        const workspace = getWorkspaceDir();

        console.log(`${chalk.cyan('🐾')}  ${chalk.bold('NexusClaw Status')}`);
        console.log(chalk.dim('─'.repeat(40)));
        console.log(`   ${chalk.white('Home:')}      ${chalk.dim(home)}`);
        console.log(`   ${chalk.white('Workspace:')} ${chalk.dim(workspace)}`);
        console.log(`   ${chalk.white('Config:')}    ${existsSync(`${home}/config.json`) ? chalk.green('✅ found') : chalk.red('❌ missing')}`);

        // Providers
        const providers = Object.entries(config.providers)
            .filter(([_, v]) => v.apiKey)
            .map(([k]) => k);
        console.log(`   ${chalk.white('Providers:')} ${providers.length > 0 ? providers.join(', ') : chalk.red('❌ none configured')}`);

        // Model
        console.log(`   ${chalk.white('Model:')}     ${chalk.bold.blue(resolvePrimaryModel(config.agents.defaults.model))}`);

        // Channels
        const enabledChannels: string[] = [];
        if (config.channels.telegram.enabled) enabledChannels.push('Telegram');
        if (config.channels.whatsapp.enabled) enabledChannels.push('WhatsApp');
        if (config.channels.web.enabled) enabledChannels.push('Web');
        console.log(`   ${chalk.white('Channels:')}  ${enabledChannels.length > 0 ? enabledChannels.join(', ') : chalk.dim('Web only (default)')}`);

        // Browser
        console.log(`   ${chalk.white('Browser:')}   ${config.browser.enabled ? chalk.green('✅ enabled') : chalk.red('❌ disabled')}`);

        // Security
        console.log(`   ${chalk.white('Security:')}  ${config.security.restrictToWorkspace ? chalk.yellow('🔒 restricted') : chalk.blue('🔓 open')}`);
        console.log(chalk.dim('─'.repeat(40)));
    });
