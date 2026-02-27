/**
 * BrowserVault securely encrypts and stores cookies/localStorage
 * for authenticated web sessions.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getHomeDir } from '../config/schema.js';
import crypto from 'node:crypto';

export class BrowserVault {
    private vaultDir: string;
    private key: Buffer;

    constructor(encryptionKey?: string) {
        this.vaultDir = join(getHomeDir(), 'vault');
        if (!existsSync(this.vaultDir)) {
            mkdirSync(this.vaultDir, { recursive: true });
        }

        // Require encryption key from environment or parameter
        const secret = encryptionKey || process.env.NEXUSCLAW_SECRET;
        if (!secret) {
            throw new Error('NEXUSCLAW_SECRET environment variable must be set for vault encryption');
        }

        // Use proper random salt stored per-vault
        const saltPath = join(this.vaultDir, '.salt');
        let salt: Buffer;
        if (existsSync(saltPath)) {
            salt = readFileSync(saltPath);
        } else {
            salt = crypto.randomBytes(32);
            writeFileSync(saltPath, salt);
        }

        this.key = crypto.scryptSync(secret, salt, 32);
    }

    private encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    }

    private decrypt(text: string): string {
        try {
            const [ivHex, authTagHex, encryptedHex] = text.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (e) {
            console.error('[BrowserVault] Decryption failed.');
            return '';
        }
    }

    public saveSession(profileName: string, cookies: any[]): void {
        const path = join(this.vaultDir, `${profileName}.vault`);
        const payload = JSON.stringify(cookies);
        const encrypted = this.encrypt(payload);
        writeFileSync(path, encrypted, 'utf8');
    }

    public loadSession(profileName: string): any[] | null {
        const path = join(this.vaultDir, `${profileName}.vault`);
        if (!existsSync(path)) return null;

        const encrypted = readFileSync(path, 'utf8');
        const decrypted = this.decrypt(encrypted);
        if (!decrypted) return null;

        try {
            return JSON.parse(decrypted);
        } catch {
            return null;
        }
    }
}
