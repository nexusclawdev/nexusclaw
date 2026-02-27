#!/usr/bin/env node

/**
 * Migrate CLI Command
 * Import workspace and configuration from other AI agent platforms
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { MigrationTool } from '../migrate/tool.js';

export const migrateCmd = new Command('migrate')
    .description('Import configuration from other AI agent platforms');

// migrate --from <platform>
migrateCmd
    .option('-f, --from <platform>', 'Platform to migrate from (legacy-a, legacy-b)')
    .option('-p, --path <path>', 'Path to existing installation')
    .action(async (opts: { from?: string; path?: string }) => {
        const tool = new MigrationTool();

        // Auto-detect if no platform specified
        if (!opts.from) {
            console.log(chalk.cyan('\n🔍 Detecting existing installations...\n'));
            const installations = tool.detectExistingInstallations();

            if (installations.length === 0) {
                console.log(chalk.yellow('⚠️  No existing installations found.'));
                console.log(chalk.dim('\nSupported platforms:'));
                console.log(chalk.dim('  • Legacy agent platforms (~/.picoclaw, ~/.openclaw)\n'));
                return;
            }

            console.log(chalk.bold.cyan('Found installations:\n'));
            for (const inst of installations) {
                console.log(`  ${chalk.green('✓')} ${chalk.bold(inst.platform)}: ${chalk.dim(inst.path)}`);
            }
            console.log(chalk.dim(`\nRun with ${chalk.white('--from <platform>')} to migrate.\n`));
            return;
        }

        const platform = opts.from.toLowerCase();
        let result;

        switch (platform) {
            case 'legacy-a':
            case 'picoclaw':
                const picoPath = opts.path || require('os').homedir() + '/.picoclaw';
                console.log(chalk.cyan(`\n📦 Importing from legacy platform: ${chalk.dim(picoPath)}\n`));
                result = await tool.migrateFromLegacyPlatformA(picoPath);
                break;

            case 'legacy-b':
            case 'openclaw':
                const openPath = opts.path || require('os').homedir() + '/.openclaw';
                console.log(chalk.cyan(`\n📦 Importing from legacy platform: ${chalk.dim(openPath)}\n`));
                result = await tool.migrateFromLegacyPlatformB(openPath);
                break;

            default:
                console.error(chalk.red(`\n❌ Unknown platform: ${chalk.bold(platform)}`));
                console.log(chalk.dim('Supported: legacy-a, legacy-b\n'));
                process.exit(1);
        }

        if (result.success) {
            console.log(chalk.green(`✅ ${result.message}`));
            if (result.warnings && result.warnings.length > 0) {
                console.log(chalk.yellow('\n⚠️  Warnings:'));
                for (const warning of result.warnings) {
                    console.log(chalk.yellow(`   • ${warning}`));
                }
            }
            console.log(chalk.dim(`\nStart with: ${chalk.white('nexusclaw gateway')}\n`));
        } else {
            console.error(chalk.red(`\n❌ ${result.message}\n`));
            process.exit(1);
        }
    });
