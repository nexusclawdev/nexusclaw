/**
 * Doctor — diagnose NexusClaw configuration issues.
 * System diagnostics and health check command.
 */

import { existsSync } from 'node:fs';
import chalk from 'chalk';
import { loadConfig, getHomeDir, getWorkspaceDir, resolvePrimaryModel } from '../config/schema.js';

interface CheckResult {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
}

export async function runDoctor(): Promise<void> {
    console.log(`\n  ${chalk.bold.cyan('🩺 NexusClaw Doctor')}`);
    console.log(chalk.dim('━'.repeat(50)) + '\n');

    const results: CheckResult[] = [];

    // 1. Config file
    const home = getHomeDir();
    const configPath = `${home}/config.json`;
    if (existsSync(configPath)) {
        results.push({ name: 'Config file', status: 'pass', message: `Found at ${configPath}` });
    } else {
        results.push({ name: 'Config file', status: 'fail', message: `Missing. Run: nexusclaw onboard` });
    }

    // 2. Workspace
    const workspace = getWorkspaceDir();
    if (existsSync(workspace)) {
        results.push({ name: 'Workspace', status: 'pass', message: workspace });
    } else {
        results.push({ name: 'Workspace', status: 'warn', message: `${workspace} doesn't exist yet. Will be created on first run.` });
    }

    // 3. LLM Provider
    let config;
    try {
        config = loadConfig();
    } catch {
        results.push({ name: 'Config parse', status: 'fail', message: 'Config file is invalid or unreadable.' });
        printResults(results);
        return;
    }

    const hasOpenAI = config.providers.openai?.apiKey || process.env.OPENAI_API_KEY;
    const hasAnthropic = config.providers.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY;
    const hasOpenRouter = config.providers.openrouter?.apiKey || process.env.OPENROUTER_API_KEY;
    const hasAnyProvider = hasOpenAI || hasAnthropic || hasOpenRouter;

    if (hasAnyProvider) {
        const providers = [];
        if (hasOpenAI) providers.push('OpenAI');
        if (hasAnthropic) providers.push('Anthropic');
        if (hasOpenRouter) providers.push('OpenRouter');
        results.push({ name: 'LLM Provider', status: 'pass', message: providers.join(', ') });
    } else {
        results.push({ name: 'LLM Provider', status: 'fail', message: 'No API key configured. Run: nexusclaw onboard' });
    }

    // 4. Model
    results.push({ name: 'Default Model', status: 'pass', message: resolvePrimaryModel(config.agents.defaults.model) });

    // 5. Dashboard port availability
    const port = config.channels.web.port;
    try {
        const net = await import('node:net');
        const available = await new Promise<boolean>((resolve) => {
            const server = net.createServer();
            server.once('error', () => resolve(false));
            server.once('listening', () => { server.close(); resolve(true); });
            server.listen(port);
        });
        results.push({
            name: `Port ${port}`,
            status: available ? 'pass' : 'warn',
            message: available ? 'Available' : 'Already in use (gateway may be running)',
        });
    } catch {
        results.push({ name: `Port ${port}`, status: 'warn', message: 'Could not check' });
    }

    // 6. Channels
    if (config.channels.telegram.enabled) {
        results.push({
            name: 'Telegram',
            status: config.channels.telegram.token ? 'pass' : 'fail',
            message: config.channels.telegram.token ? 'Token configured' : 'Enabled but no token set',
        });
    }
    if (config.channels.whatsapp.enabled) {
        results.push({ name: 'WhatsApp', status: 'pass', message: 'Enabled (QR on first launch)' });
    }

    // 7. Browser
    results.push({
        name: 'Browser',
        status: config.browser.enabled ? 'pass' : 'warn',
        message: config.browser.enabled ? 'Playwright enabled' : 'Disabled (enable with: nexusclaw config set browser.enabled true)',
    });

    // 8. Security
    results.push({
        name: 'Security',
        status: config.security.restrictToWorkspace ? 'pass' : 'warn',
        message: config.security.restrictToWorkspace ? '🔒 Workspace restricted' : '🔓 Unrestricted (be careful)',
    });

    // 9. Node.js version
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1));
    results.push({
        name: 'Node.js',
        status: major >= 20 ? 'pass' : 'fail',
        message: `${nodeVersion} ${major >= 20 ? '' : '(need ≥ 20)'}`,
    });

    printResults(results);
}

function printResults(results: CheckResult[]): void {
    const icons = {
        pass: chalk.green('✅'),
        warn: chalk.yellow('⚠️'),
        fail: chalk.red('❌')
    };

    for (const r of results) {
        const icon = icons[r.status];
        console.log(`  ${icon}  ${chalk.bold(r.name.padEnd(18))} ${chalk.dim(r.message)}`);
    }

    const fails = results.filter(r => r.status === 'fail');

    console.log('\n' + chalk.dim('━'.repeat(50)));
    if (fails.length === 0) {
        console.log(`  ${chalk.green('🎉')}  ${chalk.bold.green('All checks passed! NexusClaw is ready.')}\n`);
    } else {
        console.log(`  ${chalk.red('❌')}  ${chalk.bold.red(`${fails.length} issue(s) found.`)} ${chalk.dim('Run: pnpm cli onboard')}\n`);
    }
}
