/**
 * File system tools — read, write, edit, list.
 * Enhanced nanobot equivalents with workspace restriction support.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { Tool, ToolParameters } from './base.js';

function ensureWithinDir(filePath: string, allowedDir: string | null): string | null {
    if (filePath.includes('\0')) {
        return 'Error: Path contains invalid null bytes';
    }
    if (!allowedDir) return null;
    const resolved = resolve(filePath);
    if (!resolved.startsWith(resolve(allowedDir))) {
        return `Error: Path ${filePath} is outside workspace`;
    }
    return null;
}

export class ReadFileTool extends Tool {
    constructor(
        private workspace: string,
        private allowedDir: string | null = null,
    ) { super(); }

    get name() { return 'read_file'; }
    get description() { return 'Read contents of a file. Returns text content.'; }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Absolute or workspace-relative file path' },
            },
            required: ['path'],
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const filePath = resolve(this.workspace, String(params.path));
        const err = ensureWithinDir(filePath, this.allowedDir);
        if (err) return err;

        if (!existsSync(filePath)) return `Error: File not found: ${filePath}`;

        try {
            const content = readFileSync(filePath, 'utf-8');
            if (content.length > 50000) {
                return content.slice(0, 50000) + `\n... (truncated, ${content.length - 50000} more chars)`;
            }
            return content;
        } catch (e) {
            return `Error reading file: ${e instanceof Error ? e.message : String(e)}`;
        }
    }
}

export class WriteFileTool extends Tool {
    constructor(
        private workspace: string,
        private allowedDir: string | null = null,
    ) { super(); }

    get name() { return 'write_file'; }
    get description() { return 'Write content to a file. Creates parent directories if needed.'; }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Absolute or workspace-relative file path' },
                content: { type: 'string', description: 'Content to write' },
            },
            required: ['path', 'content'],
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const filePath = resolve(this.workspace, String(params.path));
        const err = ensureWithinDir(filePath, this.allowedDir);
        if (err) return err;

        try {
            const dir = dirname(filePath);
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
            writeFileSync(filePath, String(params.content), 'utf-8');
            return `✅ Wrote ${String(params.content).length} chars to ${filePath}`;
        } catch (e) {
            return `Error writing file: ${e instanceof Error ? e.message : String(e)}`;
        }
    }
}

export class EditFileTool extends Tool {
    constructor(
        private workspace: string,
        private allowedDir: string | null = null,
    ) { super(); }

    get name() { return 'edit_file'; }
    get description() { return 'Replace a specific string in a file. Use for precise targeted edits.'; }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'File path' },
                old_text: { type: 'string', description: 'Exact text to replace' },
                new_text: { type: 'string', description: 'Replacement text' },
            },
            required: ['path', 'old_text', 'new_text'],
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const filePath = resolve(this.workspace, String(params.path));
        const err = ensureWithinDir(filePath, this.allowedDir);
        if (err) return err;

        if (!existsSync(filePath)) return `Error: File not found: ${filePath}`;

        try {
            const content = readFileSync(filePath, 'utf-8');
            const oldText = String(params.old_text);
            const newText = String(params.new_text);

            if (!content.includes(oldText)) {
                return `Error: old_text not found in file`;
            }

            const updated = content.replace(oldText, newText);
            writeFileSync(filePath, updated, 'utf-8');
            return `✅ Edited ${filePath}`;
        } catch (e) {
            return `Error editing file: ${e instanceof Error ? e.message : String(e)}`;
        }
    }
}

export class ListDirTool extends Tool {
    constructor(
        private workspace: string,
        private allowedDir: string | null = null,
    ) { super(); }

    get name() { return 'list_dir'; }
    get description() { return 'List files and directories. Returns names with types.'; }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Directory path (default: workspace root)' },
            },
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const dirPath = resolve(this.workspace, String(params.path ?? '.'));
        const err = ensureWithinDir(dirPath, this.allowedDir);
        if (err) return err;

        if (!existsSync(dirPath)) return `Error: Directory not found: ${dirPath}`;

        try {
            const entries = readdirSync(dirPath);
            const lines = entries.slice(0, 200).map(name => {
                const full = join(dirPath, name);
                try {
                    const stat = statSync(full);
                    const type = stat.isDirectory() ? '📁' : '📄';
                    const size = stat.isDirectory() ? '' : ` (${formatSize(stat.size)})`;
                    return `${type} ${name}${size}`;
                } catch {
                    return `❓ ${name}`;
                }
            });

            if (entries.length > 200) {
                lines.push(`\n... and ${entries.length - 200} more items`);
            }

            return lines.join('\n') || '(empty directory)';
        } catch (e) {
            return `Error listing directory: ${e instanceof Error ? e.message : String(e)}`;
        }
    }
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
