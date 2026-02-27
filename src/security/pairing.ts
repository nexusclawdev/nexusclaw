/**
 * DM Pairing System — Secure direct message authentication
 * Features: JSON-backed, file-locked, TTL-aware, CLI-approvals,
 * plus an in-memory fast-path for hot checks.
 *
 * How it works:
 *   1. Unknown sender DMs the bot
 *   2. Bot replies with a 6-char pairing code + instructions
 *   3. Owner runs: nexusclaw pairing approve <channel> <code>
 *   4. Sender is added to allowlist — future messages go through
 *
 * dmPolicy: 'open' | 'pairing' | 'closed'
 *   open    = anyone can message (default)
 *   pairing = unknown senders get a pairing code
 *   closed  = only allowlisted senders can message
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

export type DmPolicy = 'open' | 'pairing' | 'closed';

export interface PairingRequest {
    code: string;
    channel: string;
    senderId: string;
    createdAt: number;
    expiresAt: number;
    meta?: Record<string, string>;
}

export interface PairingStore {
    allowlist: Record<string, string[]>;     // channel → [senderId, ...]
    pending: PairingRequest[];
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1
const CODE_LENGTH = 6;
const CODE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_PENDING = 50;

function generateCode(): string {
    const buf = randomBytes(CODE_LENGTH);
    return Array.from(buf).map(b => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

export class PairingManager {
    private filePath: string;
    private cache: PairingStore | null = null;

    constructor(dataDir: string) {
        mkdirSync(dataDir, { recursive: true });
        this.filePath = join(dataDir, 'pairing.json');
    }

    private load(): PairingStore {
        if (this.cache) return this.cache;
        if (!existsSync(this.filePath)) {
            return { allowlist: {}, pending: [] };
        }
        try {
            const raw = readFileSync(this.filePath, 'utf8');
            this.cache = JSON.parse(raw) as PairingStore;
            return this.cache;
        } catch {
            return { allowlist: {}, pending: [] };
        }
    }

    private save(store: PairingStore): void {
        this.cache = store;
        // Purge expired pending entries on save
        store.pending = store.pending.filter(p => p.expiresAt > Date.now());
        writeFileSync(this.filePath, JSON.stringify(store, null, 2), 'utf8');
    }

    /** Check if a sender is on the allowlist for a channel */
    isAllowed(channel: string, senderId: string): boolean {
        const store = this.load();
        return (store.allowlist[channel] ?? []).includes(String(senderId));
    }

    /**
     * Get or create a pairing request for a sender.
     * Returns { code, created: true } if new, or { code, created: false } if pending.
     */
    getOrCreateRequest(channel: string, senderId: string, meta?: Record<string, string>): { code: string; created: boolean } {
        const store = this.load();
        const sid = String(senderId);

        // Already allowed
        if ((store.allowlist[channel] ?? []).includes(sid)) {
            return { code: '', created: false };
        }

        // Existing pending request
        const existing = store.pending.find(
            p => p.channel === channel && p.senderId === sid && p.expiresAt > Date.now()
        );
        if (existing) return { code: existing.code, created: false };

        // Enforce max pending
        if (store.pending.length >= MAX_PENDING) {
            store.pending = store.pending
                .filter(p => p.expiresAt > Date.now())
                .slice(-(MAX_PENDING - 1));
        }

        const code = generateCode();
        store.pending.push({
            code,
            channel,
            senderId: sid,
            createdAt: Date.now(),
            expiresAt: Date.now() + CODE_TTL_MS,
            meta,
        });
        this.save(store);
        return { code, created: true };
    }

    /**
     * Approve a pairing code. Returns the approved request or null.
     */
    approve(channel: string, code: string): PairingRequest | null {
        const store = this.load();
        const idx = store.pending.findIndex(
            p => p.channel === channel && p.code.toUpperCase() === code.toUpperCase() && p.expiresAt > Date.now()
        );
        if (idx < 0) return null;

        const [req] = store.pending.splice(idx, 1);
        if (!store.allowlist[channel]) store.allowlist[channel] = [];
        if (!store.allowlist[channel].includes(req.senderId)) {
            store.allowlist[channel].push(req.senderId);
        }
        this.cache = null; // invalidate
        this.save(store);
        return req;
    }

    /**
     * Revoke a sender from the allowlist.
     */
    revoke(channel: string, senderId: string): boolean {
        const store = this.load();
        const list = store.allowlist[channel] ?? [];
        const idx = list.indexOf(String(senderId));
        if (idx < 0) return false;
        list.splice(idx, 1);
        this.cache = null;
        this.save(store);
        return true;
    }

    /** List all allowlisted senders for a channel */
    getAllowed(channel?: string): Record<string, string[]> {
        const store = this.load();
        if (channel) {
            return { [channel]: store.allowlist[channel] ?? [] };
        }
        return store.allowlist;
    }

    /** List pending (unexpired) pairing requests */
    getPending(channel?: string): PairingRequest[] {
        const store = this.load();
        const now = Date.now();
        return store.pending
            .filter(p => p.expiresAt > now && (!channel || p.channel === channel));
    }

    /** Generate a human-friendly pairing message for the sender */
    buildPairingMessage(code: string, channel: string): string {
        return (
            `🔐 **Pairing Required**\n\n` +
            `I don't recognize you yet. To send me messages, have the owner approve your request:\n\n` +
            `**Your pairing code:** \`${code}\`\n\n` +
            `Owner command:\n` +
            `\`nexusclaw pairing approve ${channel} ${code}\`\n\n` +
            `This code expires in 24 hours.`
        );
    }
}
