#!/usr/bin/env node

/**
 * Cron CLI Commands
 * Scheduled task management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { CronManager } from '../cron/manager.js';
import { Database } from '../db/database.js';
import { getWorkspaceDir } from '../config/schema.js';

export const cronCmd = new Command('cron')
    .description('Manage scheduled tasks (cron jobs)');

// cron list
cronCmd
    .command('list')
    .description('List all cron jobs')
    .action(() => {
        const db = new Database(getWorkspaceDir());
        const manager = new CronManager(db);
        const jobs = manager.listJobs();

        if (jobs.length === 0) {
            console.log(chalk.dim('\nNo cron jobs configured.'));
            console.log(chalk.dim('Try: nexusclaw cron add "<schedule>" "<description>"\n'));
            return;
        }

        console.log(chalk.bold.cyan('\n⏰ Scheduled Tasks\n'));
        console.log(chalk.dim('─'.repeat(70)));

        for (const job of jobs) {
            const status = job.enabled ? chalk.green('✅ ENABLED') : chalk.red('❌ DISABLED');
            console.log(`\n${status} ${chalk.bold.white(job.description)}`);
            console.log(chalk.gray('   ID:       '), chalk.dim(job.id));
            console.log(chalk.gray('   Schedule: '), chalk.cyan(job.schedule));
            console.log(chalk.gray('   Command:  '), chalk.white(job.command || chalk.dim('(none)')));
            console.log(chalk.gray('   Timeout:  '), chalk.yellow(`${job.timeout}ms`));

            if (job.lastRun) {
                const lastRun = new Date(job.lastRun);
                const timeAgo = formatTimeAgo(lastRun);
                console.log(chalk.gray('   Last run: '), chalk.dim(`${lastRun.toLocaleString()} (${timeAgo})`));
            }

            if (job.nextRun) {
                const nextRun = new Date(job.nextRun);
                const timeUntil = formatTimeUntil(nextRun);
                console.log(chalk.gray('   Next run: '), chalk.green(`${nextRun.toLocaleString()} (${timeUntil})`));
            }
        }

        console.log(chalk.dim('\n─'.repeat(70)));
        console.log(chalk.dim(`Total: ${jobs.length} job${jobs.length !== 1 ? 's' : ''}\n`));
    });

// cron add <schedule> <description>
cronCmd
    .command('add <schedule> <description>')
    .description('Add a new cron job')
    .option('-c, --command <cmd>', 'Command to execute', '')
    .option('-t, --timeout <ms>', 'Execution timeout in milliseconds', '300000')
    .action((schedule: string, description: string, opts: { command: string; timeout: string }) => {
        const db = new Database(getWorkspaceDir());
        const manager = new CronManager(db);
        const timeout = parseInt(opts.timeout, 10);

        console.log(chalk.cyan(`\n⏰ Adding cron job...`));

        try {
            const id = manager.addJob(schedule, description, opts.command, timeout);

            console.log(chalk.green(`\n✅ Cron job added successfully!`));
            console.log(chalk.dim('─'.repeat(50)));
            console.log(chalk.gray('ID:         '), chalk.white(id));
            console.log(chalk.gray('Schedule:   '), chalk.cyan(schedule));
            console.log(chalk.gray('Description:'), chalk.white(description));
            console.log(chalk.gray('Command:    '), chalk.white(opts.command || chalk.dim('(none)')));
            console.log(chalk.gray('Timeout:    '), chalk.yellow(`${timeout}ms`));
            console.log(chalk.dim('─'.repeat(50)));
            console.log(chalk.dim(`\nView with: ${chalk.white('nexusclaw cron list')}\n`));
        } catch (err) {
            console.error(chalk.red(`\n❌ Failed to add cron job: ${err}\n`));
            process.exit(1);
        }
    });

// cron remove <id>
cronCmd
    .command('remove <id>')
    .description('Remove a cron job')
    .action((id: string) => {
        const db = new Database(getWorkspaceDir());
        const manager = new CronManager(db);
        const result = manager.removeJob(id);

        if (result) {
            console.log(chalk.green(`\n✅ Cron job removed: ${chalk.bold(id)}\n`));
        } else {
            console.error(chalk.red(`\n❌ Cron job not found: ${chalk.bold(id)}\n`));
            process.exit(1);
        }
    });

// cron enable <id>
cronCmd
    .command('enable <id>')
    .description('Enable a cron job')
    .action((id: string) => {
        const db = new Database(getWorkspaceDir());
        const manager = new CronManager(db);
        const result = manager.setJobEnabled(id, true);

        if (result) {
            console.log(chalk.green(`\n✅ Cron job enabled: ${chalk.bold(id)}\n`));
        } else {
            console.error(chalk.red(`\n❌ Cron job not found: ${chalk.bold(id)}\n`));
            process.exit(1);
        }
    });

// cron disable <id>
cronCmd
    .command('disable <id>')
    .description('Disable a cron job')
    .action((id: string) => {
        const db = new Database(getWorkspaceDir());
        const manager = new CronManager(db);
        const result = manager.setJobEnabled(id, false);

        if (result) {
            console.log(chalk.yellow(`\n⚠️  Cron job disabled: ${chalk.bold(id)}\n`));
        } else {
            console.error(chalk.red(`\n❌ Cron job not found: ${chalk.bold(id)}\n`));
            process.exit(1);
        }
    });

// Helper functions for time formatting
function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatTimeUntil(date: Date): string {
    const seconds = Math.floor((date.getTime() - Date.now()) / 1000);
    if (seconds < 0) return 'overdue';
    if (seconds < 60) return `in ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `in ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `in ${hours}h`;
    const days = Math.floor(hours / 24);
    return `in ${days}d`;
}
