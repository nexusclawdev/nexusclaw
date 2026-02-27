/**
 * NexusClaw Pairing CLI subcommand.
 * Manages the DM pairing system — approve/revoke/list.
 *
 * Commands:
 *   nexusclaw pairing list [channel]               — List pending and allowed
 *   nexusclaw pairing approve <channel> <code>     — Approve a pairing code
 *   nexusclaw pairing revoke <channel> <senderId>  — Revoke access
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { PairingManager } from '../security/pairing.js';
import { getWorkspaceDir } from '../config/schema.js';

const mgr = new PairingManager(getWorkspaceDir());

export const pairingCmd = new Command('pairing')
    .description('Manage DM pairing for secure channel access');

pairingCmd
    .command('list [channel]')
    .description('List pending pairing requests and approved senders')
    .action((channel?: string) => {
        const pending = mgr.getPending(channel);
        const allowed = mgr.getAllowed(channel);

        if (pending.length === 0 && Object.keys(allowed).every(c => (allowed[c] ?? []).length === 0)) {
            console.log(chalk.dim('No pairing data yet.'));
            return;
        }

        if (pending.length > 0) {
            console.log(`\n${chalk.yellow('⏳ Pending Pairing Requests:')}`);
            for (const req of pending) {
                const expires = Math.ceil((req.expiresAt - Date.now()) / 3600_000);
                console.log(`  ${chalk.bold(req.channel)} / ${chalk.cyan(req.senderId)}  code: ${chalk.green(req.code)}  (expires in ~${expires}h)`);
            }
        }

        const allAllowed = Object.entries(allowed);
        if (allAllowed.some(([, ids]) => ids.length > 0)) {
            console.log(`\n${chalk.green('✅ Approved Senders:')}`);
            for (const [ch, ids] of allAllowed) {
                if (ids.length === 0) continue;
                console.log(`  ${chalk.bold(ch)}: ${ids.map(id => chalk.cyan(id)).join(', ')}`);
            }
        }
        console.log();
    });

pairingCmd
    .command('approve <channel> <code>')
    .description('Approve a pairing code from a pending request')
    .action((channel: string, code: string) => {
        const req = mgr.approve(channel, code);
        if (!req) {
            console.error(chalk.red(`❌ No active pairing request found for code "${code}" on channel "${channel}".`));
            console.log(chalk.dim('   Run `nexusclaw pairing list` to see pending requests.'));
            process.exit(1);
        }
        console.log(`${chalk.green('✅ Approved!')} Sender ${chalk.cyan(req.senderId)} can now message on ${chalk.bold(channel)}.`);
    });

pairingCmd
    .command('revoke <channel> <senderId>')
    .description('Revoke access for a previously approved sender')
    .action((channel: string, senderId: string) => {
        const ok = mgr.revoke(channel, senderId);
        if (!ok) {
            console.error(chalk.red(`❌ Sender "${senderId}" is not on the allowlist for "${channel}".`));
            process.exit(1);
        }
        console.log(`${chalk.yellow('🔒 Revoked.')} Sender ${chalk.cyan(senderId)} can no longer message on ${chalk.bold(channel)}.`);
    });
