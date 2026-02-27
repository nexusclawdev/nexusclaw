/**
 * Security Guard — domain blocking, URL filtering, and action policy enforcement.
 * NexusClaw exclusive: goes beyond nanobot's shell deny patterns to include
 * network-level security, domain whitelisting, and pattern-based action blocking.
 */

import type { Config } from '../config/schema.js';

export interface SecurityCheck {
    allowed: boolean;
    reason?: string;
}

const INTERNAL_IP_PATTERNS = [
    /^169\.254\./,            // Link-local (AWS metadata)
    /^10\./,                  // Private Class A
    /^172\.(1[6-9]|2\d|3[01])\./,  // Private Class B
    /^192\.168\./,            // Private Class C
    /^127\./,                 // Loopback
    /^0\./,                   // This network
    /^fc[0-9a-f]{2}:/i,      // IPv6 ULA
    /^fe80:/i,                // IPv6 link-local
    /^::1$/,                  // IPv6 loopback
];

const BLOCKED_HOSTNAMES = [
    'metadata.google.internal',
    'metadata.google.com',
    'instance-data',
    'kubernetes.default',
];

const HIGH_RISK_PATTERNS = [
    /delete\s+(my\s+)?account/i,
    /transfer\s+(all\s+)?(money|funds|balance)/i,
    /change\s+(my\s+)?password/i,
    /reset\s+(factory|all)/i,
    /wipe\s+(all|data)/i,
    /drop\s+(database|table)/i,
    /format\s+(disk|drive|c:)/i,
    /sudo\s+rm\s+-rf\s+\//i,
];

export class SecurityGuard {
    private whitelist: Set<string>;
    private blacklist: Set<string>;
    private blockedPatterns: RegExp[];
    private commandDenyPatterns: RegExp[];
    private restrictToWorkspace: boolean;

    constructor(config: Config['security']) {
        this.whitelist = new Set(config.domainWhitelist);
        this.blacklist = new Set(config.domainBlacklist);
        this.blockedPatterns = (config.blockedPatterns || []).map(p => new RegExp(p, 'i'));
        this.commandDenyPatterns = (config.commandDenyPatterns || []).map(p => new RegExp(p, 'i'));
        this.restrictToWorkspace = config.restrictToWorkspace;
    }

    /** Check if a URL is safe to navigate to */
    checkUrl(url: string): SecurityCheck {
        try {
            const parsed = new URL(url);

            // Block internal IPs
            for (const pattern of INTERNAL_IP_PATTERNS) {
                if (pattern.test(parsed.hostname)) {
                    return { allowed: false, reason: `Blocked: internal IP (${parsed.hostname})` };
                }
            }

            // Block known metadata endpoints
            for (const hostname of BLOCKED_HOSTNAMES) {
                if (parsed.hostname === hostname) {
                    return { allowed: false, reason: `Blocked: metadata endpoint (${parsed.hostname})` };
                }
            }

            // Check blacklist
            if (this.blacklist.has(parsed.hostname)) {
                return { allowed: false, reason: `Blocked: domain in blacklist (${parsed.hostname})` };
            }

            // If whitelist is non-empty, only allow whitelisted domains
            if (this.whitelist.size > 0) {
                const domainAllowed = Array.from(this.whitelist).some(w =>
                    parsed.hostname === w || parsed.hostname.endsWith(`.${w}`)
                );
                if (!domainAllowed) {
                    return { allowed: false, reason: `Blocked: domain not in whitelist (${parsed.hostname})` };
                }
            }

            // Block dangerous protocols
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return { allowed: false, reason: `Blocked: unsafe protocol (${parsed.protocol})` };
            }

            return { allowed: true };
        } catch {
            return { allowed: false, reason: 'Blocked: invalid URL' };
        }
    }

    /** Check if an action plan is safe to execute */
    checkAction(actionDescription: string): SecurityCheck {
        for (const pattern of HIGH_RISK_PATTERNS) {
            if (pattern.test(actionDescription)) {
                return {
                    allowed: false,
                    reason: `🚨 High-risk action detected: "${actionDescription}". Requires human approval.`,
                };
            }
        }

        for (const pattern of this.blockedPatterns) {
            if (pattern.test(actionDescription)) {
                return {
                    allowed: false,
                    reason: `⚠️ Action blocked by policy: "${actionDescription}"`,
                };
            }
        }

        return { allowed: true };
    }

    /** Check if a command is safe to execute */
    checkCommand(command: string): SecurityCheck {
        const dangerous = [
            /\brm\s+-[rf]{1,2}\s+[\/"]/i,
            /\bformat\b/i,
            /\bmkfs\b/i,
            /\bdd\s+if=/i,
            /\b(shutdown|reboot|poweroff|halt)\b/i,
            /:\s*\(\s*\)\s*\{.*\}\s*;\s*:/,            // fork bomb
            /\bnet\s+user\s+/i,                        // Windows user mgmt
            /\breg\s+(delete|add)\b/i,                  // Windows registry
            /\bcurl\b.*\|\s*(ba)?sh/i,                  // pipe to shell
            /\bwget\b.*\|\s*(ba)?sh/i,
        ];

        for (const pattern of dangerous) {
            if (pattern.test(command)) {
                return {
                    allowed: false,
                    reason: `Dangerous command blocked: ${command.slice(0, 80)}`,
                };
            }
        }

        // Check user-configured deny patterns
        for (const pattern of this.commandDenyPatterns) {
            if (pattern.test(command)) {
                return {
                    allowed: false,
                    reason: `Command blocked by policy: ${command.slice(0, 80)}`,
                };
            }
        }

        return { allowed: true };
    }

    /** Check if a file path is within workspace (if restriction enabled) */
    checkFilePath(filePath: string, workspaceDir: string): SecurityCheck {
        if (!this.restrictToWorkspace) {
            return { allowed: true };
        }

        const normalized = filePath.replace(/\\/g, '/');
        const workspace = workspaceDir.replace(/\\/g, '/');

        if (!normalized.startsWith(workspace)) {
            return {
                allowed: false,
                reason: `File access restricted to workspace: ${workspaceDir}`,
            };
        }

        return { allowed: true };
    }
}
