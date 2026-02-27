/**
 * apply_patch tool — Structured file patching system
 * Lets the LLM apply structured file patches using a reliable diff format.
 *
 * Format:
 *   *** Begin Patch
 *   *** Add File: path/to/new.ts
 *   +line content
 *   *** Update File: path/to/existing.ts
 *   @@ context hint
 *   -old line
 *   +new line
 *   *** Delete File: path/to/remove.ts
 *   *** End Patch
 */

import fs from 'node:fs/promises';
import path from 'node:path';

// ── Tool definition interface for non-class tools ─────────────────────────────
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (args: Record<string, unknown>) => Promise<string>;
}

// ── Patch markers ──────────────────────────────────────────────────────────────
const BEGIN_PATCH = '*** Begin Patch';
const END_PATCH = '*** End Patch';
const ADD_FILE = '*** Add File: ';
const DELETE_FILE = '*** Delete File: ';
const UPDATE_FILE = '*** Update File: ';
const MOVE_TO = '*** Move to: ';
const EOF_MARKER = '*** End of File';
const CONTEXT_MARKER = '@@ ';

// ── Types ──────────────────────────────────────────────────────────────────────
type AddHunk = { kind: 'add'; path: string; contents: string };
type DeleteHunk = { kind: 'delete'; path: string };
type UpdateChunk = { context?: string; oldLines: string[]; newLines: string[]; isEof: boolean };
type UpdateHunk = { kind: 'update'; path: string; movePath?: string; chunks: UpdateChunk[] };
type Hunk = AddHunk | DeleteHunk | UpdateHunk;

export interface PatchSummary {
    added: string[];
    modified: string[];
    deleted: string[];
}

// ── Parser ─────────────────────────────────────────────────────────────────────
function parsePatch(input: string): Hunk[] {
    const trimmed = input.trim();
    if (!trimmed) throw new Error('Patch input is empty.');

    const lines = trimmed.split(/\r?\n/);
    const first = lines[0]?.trim();
    const last = lines[lines.length - 1]?.trim();

    // Lenient: strip heredoc wrapper if present
    let body = lines;
    if (first !== BEGIN_PATCH || last !== END_PATCH) {
        if ((first === '<<EOF' || first === "<<'EOF'" || first === '<<"EOF"') && last?.endsWith('EOF')) {
            body = lines.slice(1, lines.length - 1);
        }
    }

    if (body[0]?.trim() !== BEGIN_PATCH) throw new Error("Patch must start with '*** Begin Patch'");
    if (body[body.length - 1]?.trim() !== END_PATCH) throw new Error("Patch must end with '*** End Patch'");

    const hunks: Hunk[] = [];
    let remaining = body.slice(1, body.length - 1);

    while (remaining.length > 0) {
        const headerLine = remaining[0].trim();
        remaining = remaining.slice(1);

        if (headerLine.startsWith(ADD_FILE)) {
            const filePath = headerLine.slice(ADD_FILE.length);
            let contents = '';
            while (remaining.length > 0 && remaining[0].startsWith('+')) {
                contents += remaining[0].slice(1) + '\n';
                remaining = remaining.slice(1);
            }
            hunks.push({ kind: 'add', path: filePath, contents });
        } else if (headerLine.startsWith(DELETE_FILE)) {
            hunks.push({ kind: 'delete', path: headerLine.slice(DELETE_FILE.length) });
        } else if (headerLine.startsWith(UPDATE_FILE)) {
            const filePath = headerLine.slice(UPDATE_FILE.length);
            let movePath: string | undefined;
            if (remaining[0]?.trim().startsWith(MOVE_TO)) {
                movePath = remaining[0].trim().slice(MOVE_TO.length);
                remaining = remaining.slice(1);
            }

            const chunks: UpdateChunk[] = [];
            while (remaining.length > 0 && !remaining[0].trim().startsWith('*** ')) {
                if (!remaining[0].trim()) { remaining = remaining.slice(1); continue; }
                const chunk = parseChunk(remaining, chunks.length === 0);
                chunks.push(chunk.chunk);
                remaining = remaining.slice(chunk.consumed);
            }

            if (chunks.length === 0) throw new Error(`Empty update hunk for ${filePath}`);
            hunks.push({ kind: 'update', path: filePath, movePath, chunks });
        } else if (headerLine === '') {
            continue;
        } else {
            throw new Error(`Unknown patch header: '${headerLine}'`);
        }
    }

    return hunks;
}

function parseChunk(lines: string[], allowNoContext: boolean): { chunk: UpdateChunk; consumed: number } {
    let idx = 0;
    let context: string | undefined;

    if (lines[0] === '@@') {
        idx = 1;
    } else if (lines[0]?.startsWith(CONTEXT_MARKER)) {
        context = lines[0].slice(CONTEXT_MARKER.length);
        idx = 1;
    } else if (!allowNoContext) {
        throw new Error(`Expected @@ context marker, got: '${lines[0]}'`);
    }

    const chunk: UpdateChunk = { context, oldLines: [], newLines: [], isEof: false };

    while (idx < lines.length) {
        const line = lines[idx];
        if (line === EOF_MARKER) { chunk.isEof = true; idx++; break; }
        if (line?.startsWith('*** ')) break;
        if (!line) { chunk.oldLines.push(''); chunk.newLines.push(''); idx++; continue; }
        const marker = line[0];
        if (marker === ' ') { chunk.oldLines.push(line.slice(1)); chunk.newLines.push(line.slice(1)); idx++; continue; }
        if (marker === '+') { chunk.newLines.push(line.slice(1)); idx++; continue; }
        if (marker === '-') { chunk.oldLines.push(line.slice(1)); idx++; continue; }
        break; // Unknown marker ends chunk
    }

    return { chunk, consumed: idx };
}

// ── Applier ────────────────────────────────────────────────────────────────────
async function applyUpdateHunk(filePath: string, chunks: UpdateChunk[]): Promise<string> {
    let content: string;
    try {
        content = await fs.readFile(filePath, 'utf8');
    } catch {
        throw new Error(`File not found: ${filePath}`);
    }

    let lines = content.split('\n');

    for (const chunk of chunks) {
        const { oldLines, newLines } = chunk;
        if (oldLines.length === 0) {
            // Pure insertion — append at end or at context
            lines = [...lines, ...newLines];
            continue;
        }

        // Find where oldLines appear
        let found = -1;

        // Search from context hint if provided
        if (chunk.context) {
            const ctxLine = chunk.context.trim();
            const ctxIdx = lines.findIndex(l => l.includes(ctxLine));
            if (ctxIdx >= 0) {
                // Search near the context for oldLines[0]
                const searchFrom = Math.max(0, ctxIdx - 5);
                for (let i = searchFrom; i < lines.length - oldLines.length + 1; i++) {
                    if (lines.slice(i, i + oldLines.length).join('\n') === oldLines.join('\n')) {
                        found = i;
                        break;
                    }
                }
            }
        }

        // Fallback: full scan
        if (found < 0) {
            for (let i = 0; i <= lines.length - oldLines.length; i++) {
                if (lines.slice(i, i + oldLines.length).join('\n') === oldLines.join('\n')) {
                    found = i;
                    break;
                }
            }
        }

        if (found < 0) {
            // Trimmed match as last resort
            const trimmedOld = oldLines.map(l => l.trimEnd());
            for (let i = 0; i <= lines.length - oldLines.length; i++) {
                if (lines.slice(i, i + oldLines.length).map(l => l.trimEnd()).join('\n') === trimmedOld.join('\n')) {
                    found = i;
                    break;
                }
            }
        }

        if (found < 0) {
            throw new Error(
                `Patch failed: could not find context in ${filePath}.\n` +
                `Expected:\n${oldLines.slice(0, 3).map(l => `  ${l}`).join('\n')}`
            );
        }

        lines = [...lines.slice(0, found), ...newLines, ...lines.slice(found + oldLines.length)];
    }

    // Preserve original line endings style
    return lines.join('\n');
}

// ── Main apply function ────────────────────────────────────────────────────────
export async function applyPatch(input: string, cwd: string): Promise<{ summary: PatchSummary; text: string }> {
    const hunks = parsePatch(input);
    const summary: PatchSummary = { added: [], modified: [], deleted: [] };

    for (const hunk of hunks) {
        const target = path.isAbsolute(hunk.path)
            ? hunk.path
            : path.join(cwd, hunk.path);

        if (hunk.kind === 'add') {
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.writeFile(target, hunk.contents, 'utf8');
            summary.added.push(hunk.path);
        } else if (hunk.kind === 'delete') {
            await fs.rm(target, { force: true });
            summary.deleted.push(hunk.path);
        } else if (hunk.kind === 'update') {
            const applied = await applyUpdateHunk(target, hunk.chunks);
            if (hunk.movePath) {
                const moveDest = path.isAbsolute(hunk.movePath)
                    ? hunk.movePath
                    : path.join(cwd, hunk.movePath);
                await fs.mkdir(path.dirname(moveDest), { recursive: true });
                await fs.writeFile(moveDest, applied, 'utf8');
                await fs.rm(target, { force: true });
                summary.modified.push(hunk.movePath);
            } else {
                await fs.writeFile(target, applied, 'utf8');
                summary.modified.push(hunk.path);
            }
        }
    }

    const lines = ['Patch applied successfully.'];
    for (const f of summary.added) lines.push(`  A ${f}`);
    for (const f of summary.modified) lines.push(`  M ${f}`);
    for (const f of summary.deleted) lines.push(`  D ${f}`);

    return { summary, text: lines.join('\n') };
}

// ── Tool definition ───────────────────────────────────────────────────────────
export function createApplyPatchTool(cwd: string): ToolDefinition {
    return {
        name: 'apply_patch',
        description:
            'Apply a structured patch to one or more files. ' +
            'Use this instead of write_file when modifying existing files — ' +
            'it is more reliable and only changes what you specify.\n\n' +
            'Format:\n' +
            '*** Begin Patch\n' +
            '*** Add File: path/to/new.ts\n' +
            '+line to add\n' +
            '*** Update File: path/to/existing.ts\n' +
            '@@ optional context hint\n' +
            '-old line\n' +
            '+new line\n' +
            '*** Delete File: path/to/delete.ts\n' +
            '*** End Patch',
        parameters: {
            type: 'object',
            properties: {
                patch: {
                    type: 'string',
                    description: 'The full patch text starting with *** Begin Patch and ending with *** End Patch.',
                },
            },
            required: ['patch'],
        },
        execute: async (args: Record<string, unknown>): Promise<string> => {
            const patch = typeof args.patch === 'string' ? args.patch : '';
            if (!patch.trim()) return 'Error: patch cannot be empty.';
            try {
                const result = await applyPatch(patch, cwd);
                return result.text;
            } catch (err: any) {
                return `Patch error: ${err.message}`;
            }
        },
    };
}
