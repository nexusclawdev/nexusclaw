#!/usr/bin/env node

/**
 * Skills CLI Commands
 * Dynamic skill marketplace and management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { SkillsRegistry } from '../skills/registry.js';
import { SkillsInstaller } from '../skills/installer.js';
import { SkillsSearch } from '../skills/search.js';

export const skillsCmd = new Command('skills')
    .description('Manage skills (ClawHub marketplace)');

// skills list
skillsCmd
    .command('list')
    .description('List all installed skills')
    .action(() => {
        const registry = new SkillsRegistry();
        const skills = registry.listSkills();

        if (skills.length === 0) {
            console.log(chalk.dim('No skills installed.'));
            console.log(chalk.dim('Try: nexusclaw skills search <query>'));
            return;
        }

        console.log(chalk.bold.cyan('\n📦 Installed Skills\n'));
        console.log(chalk.dim('─'.repeat(60)));

        for (const skill of skills) {
            const badge = skill.type === 'builtin' ? chalk.yellow('🔧') : chalk.blue('📦');
            const typeLabel = skill.type === 'builtin' ? chalk.yellow('[built-in]') : chalk.blue('[custom]');

            console.log(`\n${badge} ${chalk.bold.white(skill.name)} ${chalk.dim(`(${skill.id})`)} ${typeLabel}`);
            console.log(chalk.gray(`   ${skill.description}`));
            console.log(chalk.dim(`   v${skill.version}`), chalk.dim('•'), chalk.dim(`by ${skill.author}`));
        }
        console.log(chalk.dim('\n─'.repeat(60)));
        console.log(chalk.dim(`Total: ${skills.length} skill${skills.length !== 1 ? 's' : ''}\n`));
    });

// skills show <id>
skillsCmd
    .command('show <id>')
    .description('Show skill details')
    .action((id: string) => {
        const registry = new SkillsRegistry();
        const skill = registry.getSkill(id);

        if (!skill) {
            console.error(chalk.red(`\n❌ Skill '${id}' not found\n`));
            process.exit(1);
        }

        const badge = skill.type === 'builtin' ? '🔧' : '📦';
        console.log(chalk.bold.cyan(`\n${badge} ${skill.name}\n`));
        console.log(chalk.dim('─'.repeat(60)));
        console.log(chalk.gray('ID:         '), chalk.white(skill.id));
        console.log(chalk.gray('Description:'), chalk.white(skill.description));
        console.log(chalk.gray('Version:    '), chalk.white(skill.version));
        console.log(chalk.gray('Author:     '), chalk.white(skill.author));
        console.log(chalk.gray('Type:       '), skill.type === 'builtin' ? chalk.yellow('built-in') : chalk.blue('custom'));
        console.log(chalk.gray('Path:       '), chalk.dim(skill.path));

        const content = registry.getSkillContent(id);
        if (content) {
            console.log(chalk.dim('\n─'.repeat(60)));
            console.log(chalk.bold.cyan('\n📄 Skill Content\n'));
            console.log(content);
        }
        console.log();
    });

// skills search <query>
skillsCmd
    .command('search <query>')
    .description('Search for skills on ClawHub')
    .action(async (query: string) => {
        const search = new SkillsSearch();

        console.log(chalk.dim(`\n🔍 Searching ClawHub for: ${chalk.white(query)}...\n`));

        const results = await search.search(query);

        if (results.length === 0) {
            console.log(chalk.yellow(`⚠️  No skills found for: ${query}`));
            console.log(chalk.dim('Try a different search term\n'));
            return;
        }

        console.log(chalk.bold.cyan(`📦 Search Results (${results.length})\n`));
        console.log(chalk.dim('─'.repeat(60)));

        for (const result of results) {
            console.log(`\n${chalk.bold.white(result.name)} ${chalk.dim(`(${result.id})`)}`);
            console.log(chalk.gray(`   ${result.description}`));

            const stars = '⭐'.repeat(Math.floor(result.rating));
            console.log(`   ${chalk.yellow(stars)} ${chalk.dim(result.rating.toFixed(1))} ${chalk.dim('•')} ${chalk.green('📥')} ${chalk.dim(`${result.downloads.toLocaleString()} downloads`)}`);

            const tags = result.tags.map(t => chalk.cyan(`#${t}`)).join(' ');
            console.log(chalk.dim(`   ${tags}`));
        }

        console.log(chalk.dim('\n─'.repeat(60)));
        console.log(chalk.dim(`\nInstall with: ${chalk.white('nexusclaw skills install <id>')}\n`));
    });

// skills install <id>
skillsCmd
    .command('install <id>')
    .description('Install a skill from ClawHub')
    .option('-s, --source <url>', 'Install from custom URL')
    .action(async (id: string, opts: { source?: string }) => {
        const installer = new SkillsInstaller();

        console.log(chalk.cyan(`\n📦 Installing skill: ${chalk.bold(id)}...`));

        const result = await installer.install(id, opts.source);

        if (result.success) {
            console.log(chalk.green(`✅ ${result.message}`));
            console.log(chalk.dim(`\nUse with: ${chalk.white('nexusclaw skills show ' + id)}\n`));
        } else {
            console.error(chalk.red(`\n❌ ${result.message}\n`));
            process.exit(1);
        }
    });

// skills remove <id>
skillsCmd
    .command('remove <id>')
    .description('Remove an installed skill')
    .action(async (id: string) => {
        const installer = new SkillsInstaller();

        console.log(chalk.yellow(`\n🗑️  Removing skill: ${chalk.bold(id)}...`));

        const result = await installer.remove(id);

        if (result.success) {
            console.log(chalk.green(`✅ ${result.message}\n`));
        } else {
            console.error(chalk.red(`\n❌ ${result.message}\n`));
            process.exit(1);
        }
    });
