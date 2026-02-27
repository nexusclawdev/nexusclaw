#!/usr/bin/env node

/**
 * Auth CLI Commands
 * OAuth 2.0 authentication management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { AuthManager } from '../auth/manager.js';
import { OAuthHandler } from '../auth/oauth.js';
import { Database } from '../db/database.js';
import { getWorkspaceDir } from '../config/schema.js';

export const authCmd = new Command('auth')
    .description('Manage authentication tokens');

// auth status
authCmd
    .command('status')
    .description('Show authentication status')
    .action(() => {
        const db = new Database(getWorkspaceDir());
        const manager = new AuthManager(db);
        const providers = manager.listProviders();

        if (providers.length === 0) {
            console.log(chalk.dim('\nNo authenticated providers.'));
            console.log(chalk.dim('Try: nexusclaw auth login --provider <name>\n'));
            return;
        }

        console.log(chalk.bold.cyan('\n🔐 Authentication Status\n'));
        console.log(chalk.dim('─'.repeat(60)));

        for (const provider of providers) {
            const token = manager.getToken(provider);
            if (token) {
                console.log(`\n${chalk.green('✅')} ${chalk.bold.white(provider.toUpperCase())}`);

                if (token.expires_at) {
                    const expiresIn = Math.floor((token.expires_at - Date.now()) / 1000 / 60);
                    const expiryColor = expiresIn < 60 ? chalk.red : expiresIn < 1440 ? chalk.yellow : chalk.green;
                    console.log(chalk.gray('   Expires:'), expiryColor(`${expiresIn} minutes`));
                }

                if (token.scope) {
                    console.log(chalk.gray('   Scope:  '), chalk.cyan(token.scope));
                }
            }
        }

        console.log(chalk.dim('\n─'.repeat(60)));
        console.log(chalk.dim(`Total: ${providers.length} provider${providers.length !== 1 ? 's' : ''}\n`));
    });

// auth login
authCmd
    .command('login')
    .description('Login to a provider (OAuth)')
    .option('-p, --provider <name>', 'Provider name (google, github, gitlab)')
    .option('--client-id <id>', 'OAuth client ID')
    .option('--client-secret <secret>', 'OAuth client secret')
    .action(async (opts: { provider?: string; clientId?: string; clientSecret?: string }) => {
        if (!opts.provider) {
            console.error(chalk.red('\n❌ Provider name required: --provider <name>\n'));
            process.exit(1);
        }

        console.log(chalk.cyan(`\n🔐 Starting OAuth flow for: ${chalk.bold(opts.provider)}`));

        // Provider configurations
        const providerConfigs: Record<string, any> = {
            google: {
                authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenUrl: 'https://oauth2.googleapis.com/token',
                scope: ['openid', 'email', 'profile'],
            },
            github: {
                authUrl: 'https://github.com/login/oauth/authorize',
                tokenUrl: 'https://github.com/login/oauth/access_token',
                scope: ['user', 'repo'],
            },
            gitlab: {
                authUrl: 'https://gitlab.com/oauth/authorize',
                tokenUrl: 'https://gitlab.com/oauth/token',
                scope: ['read_user', 'api'],
            },
        };

        const providerConfig = providerConfigs[opts.provider.toLowerCase()];
        if (!providerConfig) {
            console.error(chalk.red(`\n❌ Unsupported provider: ${opts.provider}`));
            console.log(chalk.dim('Supported: google, github, gitlab\n'));
            process.exit(1);
        }

        // Check for required credentials
        if (!opts.clientId || !opts.clientSecret) {
            console.log(chalk.yellow('\n⚠️  OAuth credentials required'));
            console.log(chalk.dim('\nUsage:'));
            console.log(chalk.white(`  nexusclaw auth login --provider ${opts.provider} --client-id <id> --client-secret <secret>`));
            console.log(chalk.dim('\nGet credentials from:'));
            if (opts.provider === 'google') {
                console.log(chalk.cyan('  https://console.cloud.google.com/apis/credentials'));
            } else if (opts.provider === 'github') {
                console.log(chalk.cyan('  https://github.com/settings/developers'));
            } else if (opts.provider === 'gitlab') {
                console.log(chalk.cyan('  https://gitlab.com/-/profile/applications'));
            }
            console.log();
            process.exit(1);
        }

        try {
            const db = new Database(getWorkspaceDir());
            const handler = new OAuthHandler(db);

            const config = {
                clientId: opts.clientId,
                clientSecret: opts.clientSecret,
                authUrl: providerConfig.authUrl,
                tokenUrl: providerConfig.tokenUrl,
                redirectUri: 'http://localhost:3000/callback',
                scope: providerConfig.scope,
            };

            const authUrl = await handler.startFlow(opts.provider, config);

            console.log(chalk.green('\n✅ OAuth server started on http://localhost:3000'));
            console.log(chalk.bold.cyan('\n📋 Open this URL in your browser:\n'));
            console.log(chalk.white(authUrl));
            console.log(chalk.dim('\nWaiting for authentication...\n'));

            // The handler will wait for the callback
        } catch (err) {
            console.error(chalk.red(`\n❌ OAuth flow failed: ${err}\n`));
            process.exit(1);
        }
    });

// auth logout
authCmd
    .command('logout')
    .description('Logout from a provider')
    .option('-p, --provider <name>', 'Provider name')
    .option('-a, --all', 'Logout from all providers')
    .action((opts: { provider?: string; all?: boolean }) => {
        const db = new Database(getWorkspaceDir());
        const manager = new AuthManager(db);

        if (opts.all) {
            manager.clearAll();
            console.log(chalk.green('\n✅ Logged out from all providers\n'));
            return;
        }

        if (!opts.provider) {
            console.error(chalk.red('\n❌ Provider name required: --provider <name>\n'));
            process.exit(1);
        }

        const result = manager.removeToken(opts.provider);
        if (result) {
            console.log(chalk.green(`\n✅ Logged out from: ${chalk.bold(opts.provider)}\n`));
        } else {
            console.error(chalk.red(`\n❌ Not authenticated with: ${chalk.bold(opts.provider)}\n`));
            process.exit(1);
        }
    });
