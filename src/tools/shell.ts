/**
 * Shell execution tool — run commands with safety guards.
 * Enhanced version of nanobot's ExecTool with Windows/Linux support.
 */

import { exec as executeShell } from 'node:child_process';
import { Tool, ToolParameters } from './base.js';

const DENY_PATTERNS = [
    /\brm\s+-[rf]{1,2}\b/i,
    /\bdel\s+\/[fq]\b/i,
    /\brmdir\s+\/s\b/i,
    /(?:^|[;&|]\s*)format\b/i,
    /\b(mkfs|diskpart)\b/i,
    /\bdd\s+if=/i,
    />\s*\/dev\/sd/i,
    /\b(shutdown|reboot|poweroff)\b/i,
    /:\(\)\s*\{.*\};\s*:/,    // fork bomb
    /\bnet\s+user\b/i,        // Windows user manipulation
    /\breg\s+delete\b/i,      // Windows registry deletion
];

export class ExecTool extends Tool {
    constructor(
        private workingDir: string,
        private timeout: number = 60,
        private restrictToWorkspace: boolean = false,
    ) {
        super();
    }

    get name() { return 'exec'; }
    get description() { return 'Execute a shell command and return output. Use with caution.'; }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                command: { type: 'string', description: 'The shell command to execute' },
                working_dir: { type: 'string', description: 'Optional working directory' },
            },
            required: ['command'],
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const command = String(params.command);
        const cwd = String(params.working_dir ?? this.workingDir);

        // Safety guard
        const blocked = this.guardCommand(command);
        if (blocked) return blocked;

        return new Promise<string>((resolve) => {
            const proc = executeShell(command, {
                cwd,
                timeout: this.timeout * 1000,
                maxBuffer: 1024 * 1024, // 1MB
                env: { ...process.env, PAGER: 'cat' },
            }, (error, stdout, stderr) => {
                const parts: string[] = [];

                if (stdout) parts.push(stdout);
                if (stderr) parts.push(`STDERR:\n${stderr}`);
                if (error?.killed) {
                    parts.push(`\nError: Command timed out after ${this.timeout}s`);
                } else if (error) {
                    parts.push(`\nExit code: ${error.code ?? 1}`);
                }

                let result = parts.join('\n') || '(no output)';

                // Truncate
                if (result.length > 10000) {
                    result = result.slice(0, 10000) + `\n... (truncated, ${result.length - 10000} more chars)`;
                }

                resolve(result);
            });
        });
    }

    private guardCommand(command: string): string | null {
        const lower = command.toLowerCase().trim();

        for (const pattern of DENY_PATTERNS) {
            if (pattern.test(lower)) {
                return 'Error: Command blocked by safety guard (dangerous pattern detected)';
            }
        }

        if (this.restrictToWorkspace) {
            // Block directory traversal
            if (/\.\.[/\\]/.test(command)) {
                return 'Error: Path traversal blocked (restrictToWorkspace is enabled)';
            }
        }

        return null;
    }
}
