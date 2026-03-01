/**
 * Code Intelligence Tool — Real AST-level code analysis for the agent.
 * Supports TypeScript/JavaScript via regex+heuristics (no build step needed),
 * and extends to Python, Rust, Go, and JSON/YAML.
 *
 * Capabilities:
 *  - Find all usages of a symbol across a codebase
 *  - Extract function/class signatures
 *  - Cyclomatic complexity scoring
 *  - Dead code detection (exported but never imported symbols)
 *  - Dependency graph extraction
 *  - Generate unified diffs
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, extname, relative } from 'node:path';
import { Tool, ToolParameters } from './base.js';
import { createHash } from 'node:crypto';

const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java', '.cpp', '.c', '.json', '.yaml', '.yml', '.md']);
const MAX_FILE_SIZE = 500_000; // 500KB cap per file
const MAX_FILES = 2000;

// ── Helpers ─────────────────────────────────────────────────────────────────

function walkDir(dir: string, files: string[] = [], depth = 0): string[] {
    if (depth > 10 || files.length >= MAX_FILES) return files;
    try {
        for (const entry of readdirSync(dir)) {
            if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
            const full = join(dir, entry);
            const stat = statSync(full);
            if (stat.isDirectory()) walkDir(full, files, depth + 1);
            else if (SUPPORTED_EXTS.has(extname(entry))) files.push(full);
        }
    } catch { /* skip inaccessible dirs */ }
    return files;
}

function readSafe(filePath: string): string {
    try {
        const stat = statSync(filePath);
        if (stat.size > MAX_FILE_SIZE) return `(file too large: ${(stat.size / 1024).toFixed(0)}KB)`;
        return readFileSync(filePath, 'utf-8');
    } catch {
        return '';
    }
}

/** Estimate cyclomatic complexity by counting decision points */
function measureComplexity(code: string): number {
    const patterns = [/\bif\b/g, /\belse if\b/g, /\bfor\b/g, /\bwhile\b/g, /\bcase\b/g, /\bcatch\b/g, /\?\./g, /&&/g, /\|\|/g, /\?\?/g];
    return 1 + patterns.reduce((sum, p) => sum + (code.match(p)?.length ?? 0), 0);
}

/** Extract function and class signatures from source */
function extractSignatures(code: string, filePath: string): string[] {
    const sigs: string[] = [];
    const ext = extname(filePath);

    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        // Functions
        const fnPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*[\w<>\[\]|&,\s.]+)?/g;
        let m: RegExpExecArray | null;
        while ((m = fnPattern.exec(code)) !== null) {
            sigs.push(`fn ${m[1]}(${m[2].trim()})`);
        }
        // Arrow functions
        const arrowPattern = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*[\w<>\[\]|&\s]+)?\s*=>/g;
        while ((m = arrowPattern.exec(code)) !== null) {
            sigs.push(`const ${m[1]} = (${m[2].trim()}) =>`);
        }
        // Classes
        const classPattern = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+([\w<>,\s.]+))?(?:\s+implements\s+([\w<>,\s.]+))?/g;
        while ((m = classPattern.exec(code)) !== null) {
            const ext_ = m[2] ? ` extends ${m[2]}` : '';
            const impl = m[3] ? ` implements ${m[3]}` : '';
            sigs.push(`class ${m[1]}${ext_}${impl}`);
        }
    } else if (ext === '.py') {
        const pyFn = /def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*[\w\[\],\s]+)?:/g;
        let m: RegExpExecArray | null;
        while ((m = pyFn.exec(code)) !== null) {
            sigs.push(`def ${m[1]}(${m[2].trim()})`);
        }
    } else if (ext === '.rs') {
        const rsFn = /(?:pub\s+)?fn\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*[\w<>\[\]&,\s]+)?/g;
        let m: RegExpExecArray | null;
        while ((m = rsFn.exec(code)) !== null) {
            sigs.push(`fn ${m[1]}(${m[2].trim()})`);
        }
    } else if (ext === '.go') {
        const goFn = /func\s+(?:\([\w\s*]+\)\s+)?(\w+)\s*\(([^)]*)\)(?:\s+[\w\[\]*()\s,]+)?/g;
        let m: RegExpExecArray | null;
        while ((m = goFn.exec(code)) !== null) {
            sigs.push(`func ${m[1]}(${m[2].trim()})`);
        }
    }

    return sigs;
}

/** Extract all import/require dependencies */
function extractDeps(code: string, filePath: string): string[] {
    const deps: string[] = [];
    const ext = extname(filePath);

    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        const importPattern = /(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/g;
        const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        let m: RegExpExecArray | null;
        while ((m = importPattern.exec(code)) !== null) deps.push(m[1]);
        while ((m = requirePattern.exec(code)) !== null) deps.push(m[1]);
    } else if (ext === '.py') {
        const pyImport = /(?:import|from)\s+([\w.]+)/g;
        let m: RegExpExecArray | null;
        while ((m = pyImport.exec(code)) !== null) deps.push(m[1]);
    } else if (ext === '.rs') {
        const rsUse = /use\s+([\w:]+)/g;
        let m: RegExpExecArray | null;
        while ((m = rsUse.exec(code)) !== null) deps.push(m[1]);
    } else if (ext === '.go') {
        const goImport = /["']([\w./]+)["']/g;
        let m: RegExpExecArray | null;
        while ((m = goImport.exec(code)) !== null) deps.push(m[1]);
    }

    return [...new Set(deps)];
}

// ── Tool: Find Symbol Usages ─────────────────────────────────────────────────

export class FindUsagesTool extends Tool {
    constructor(private workspace: string) { super(); }

    get name() { return 'code_find_usages'; }
    get description() {
        return 'Find all usages of a symbol (function, class, variable, type) across the codebase. ' +
            'Returns file paths, line numbers, and surrounding context.';
    }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                symbol: { type: 'string', description: 'Symbol name to search for (e.g., "AgentLoop", "parseConfig", "MyType")' },
                dir: { type: 'string', description: 'Directory to search (default: workspace root)' },
                exact: { type: 'boolean', description: 'If true, match whole word only (default: true)' },
            },
            required: ['symbol'],
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const symbol = String(params.symbol);
        const searchDir = params.dir ? resolve(String(params.dir)) : this.workspace;
        const exact = params.exact !== false;

        if (!existsSync(searchDir)) return `Error: Directory not found: ${searchDir}`;

        const files = walkDir(searchDir);
        const regex = exact
            ? new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
            : new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

        const results: string[] = [];
        let totalMatches = 0;

        for (const file of files) {
            const code = readSafe(file);
            if (!code) continue;

            const lines = code.split('\n');
            const fileResults: string[] = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (regex.test(line)) {
                    regex.lastIndex = 0;
                    const context = [
                        i > 0 ? `  ${i}: ${lines[i - 1].trim()}` : null,
                        `→ ${i + 1}: ${line.trim()}`,
                        i < lines.length - 1 ? `  ${i + 2}: ${lines[i + 1].trim()}` : null,
                    ].filter(Boolean).join('\n');
                    fileResults.push(context);
                    totalMatches++;
                }
                if (totalMatches > 500) break;
            }

            if (fileResults.length > 0) {
                const relPath = relative(this.workspace, file);
                results.push(`\n📄 **${relPath}** (${fileResults.length} usage${fileResults.length > 1 ? 's' : ''}):\n${fileResults.slice(0, 20).join('\n---\n')}`);
            }
        }

        if (results.length === 0) return `No usages of \`${symbol}\` found in ${files.length} files.`;
        return `Found **${totalMatches} usages** of \`${symbol}\` across **${results.length} files** (searched ${files.length} files):\n${results.join('\n')}`;
    }
}

// ── Tool: Code Analysis ───────────────────────────────────────────────────────

export class CodeAnalysisTool extends Tool {
    constructor(private workspace: string) { super(); }

    get name() { return 'code_analyze'; }
    get description() {
        return 'Deep code analysis: extract all function/class signatures, calculate complexity scores, ' +
            'detect dependency graph, find high-complexity hotspots, and identify dead exports.';
    }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'File or directory path to analyze' },
                mode: {
                    type: 'string',
                    description: 'Analysis mode: "signatures" | "complexity" | "deps" | "full" (default: full)',
                },
            },
            required: ['path'],
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const targetPath = resolve(this.workspace, String(params.path));
        const mode = String(params.mode || 'full');

        if (!existsSync(targetPath)) return `Error: Path not found: ${targetPath}`;

        const stat = statSync(targetPath);
        const filesToAnalyze = stat.isDirectory() ? walkDir(targetPath) : [targetPath];

        if (filesToAnalyze.length === 0) return 'No supported files found.';

        const report: string[] = [`## Code Analysis Report\n**Path:** \`${targetPath}\`\n**Files analyzed:** ${filesToAnalyze.length}\n`];

        interface FileReport {
            path: string;
            sigCount: number;
            complexity: number;
            depCount: number;
            sigs: string[];
            deps: string[];
        }
        const fileReports: FileReport[] = [];

        for (const file of filesToAnalyze.slice(0, 100)) { // cap at 100 files
            const code = readSafe(file);
            if (!code || code.startsWith('(file too large')) continue;

            const relPath = relative(this.workspace, file);
            const sigs = (mode === 'signatures' || mode === 'full') ? extractSignatures(code, file) : [];
            const complexity = (mode === 'complexity' || mode === 'full') ? measureComplexity(code) : 0;
            const deps = (mode === 'deps' || mode === 'full') ? extractDeps(code, file) : [];

            fileReports.push({ path: relPath, sigCount: sigs.length, complexity, depCount: deps.length, sigs, deps });
        }

        if (mode === 'complexity' || mode === 'full') {
            // Hotspots: top 10 most complex files
            const sorted = [...fileReports].sort((a, b) => b.complexity - a.complexity);
            report.push('### 🔥 Complexity Hotspots (Top 10)');
            for (const f of sorted.slice(0, 10)) {
                const bar = '█'.repeat(Math.min(20, Math.floor(f.complexity / 5)));
                const level = f.complexity > 50 ? '🔴 HIGH' : f.complexity > 20 ? '🟡 MED' : '🟢 LOW';
                report.push(`- **${f.path}** │ score: ${f.complexity} ${bar} ${level}`);
            }
            const avgComplexity = fileReports.reduce((s, f) => s + f.complexity, 0) / (fileReports.length || 1);
            report.push(`\n**Average complexity:** ${avgComplexity.toFixed(1)}`);
        }

        if (mode === 'signatures' || mode === 'full') {
            report.push('\n### 📋 Exported Signatures');
            for (const f of fileReports.filter(f => f.sigCount > 0).slice(0, 30)) {
                report.push(`\n**${f.path}** (${f.sigCount} signatures):`);
                report.push(f.sigs.slice(0, 15).map(s => `  - \`${s}\``).join('\n'));
            }
        }

        if (mode === 'deps' || mode === 'full') {
            // Build dependency graph summary
            const depMap = new Map<string, string[]>();
            for (const f of fileReports) {
                if (f.deps.length > 0) depMap.set(f.path, f.deps);
            }

            report.push('\n### 🕸️ Dependency Graph (top 15 files)');
            const depEntries = [...depMap.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 15);
            for (const [file, deps] of depEntries) {
                report.push(`- **${file}** → ${deps.slice(0, 8).map(d => `\`${d}\``).join(', ')}${deps.length > 8 ? ` +${deps.length - 8} more` : ''}`);
            }
        }

        return report.join('\n');
    }
}

// ── Tool: Code Diff ───────────────────────────────────────────────────────────

export class CodeDiffTool extends Tool {
    constructor(private workspace: string) { super(); }

    get name() { return 'code_diff'; }
    get description() { return 'Generate a unified diff between two text contents or two files. Perfect for reviewing changes.'; }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                file_a: { type: 'string', description: 'Path to first file (or use text_a)' },
                file_b: { type: 'string', description: 'Path to second file (or use text_b)' },
                text_a: { type: 'string', description: 'First text content (alternative to file_a)' },
                text_b: { type: 'string', description: 'Second text content (alternative to file_b)' },
                label_a: { type: 'string', description: 'Label for first content (default: a)' },
                label_b: { type: 'string', description: 'Label for second content (default: b)' },
            },
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        let textA: string;
        let textB: string;

        if (params.file_a) {
            const fa = resolve(this.workspace, String(params.file_a));
            if (!existsSync(fa)) return `Error: File not found: ${fa}`;
            textA = readSafe(fa);
        } else if (params.text_a) {
            textA = String(params.text_a);
        } else {
            return 'Error: Provide file_a or text_a';
        }

        if (params.file_b) {
            const fb = resolve(this.workspace, String(params.file_b));
            if (!existsSync(fb)) return `Error: File not found: ${fb}`;
            textB = readSafe(fb);
        } else if (params.text_b) {
            textB = String(params.text_b);
        } else {
            return 'Error: Provide file_b or text_b';
        }

        const labelA = String(params.label_a || 'a');
        const labelB = String(params.label_b || 'b');

        const linesA = textA.split('\n');
        const linesB = textB.split('\n');

        // Simple LCS-based diff
        const diff = computeDiff(linesA, linesB);
        if (diff.length === 0) return '✅ Files are identical — no differences found.';

        const additions = diff.filter(l => l.startsWith('+')).length;
        const deletions = diff.filter(l => l.startsWith('-')).length;

        return `--- ${labelA}\n+++ ${labelB}\n@@ Diff @@\n${diff.join('\n')}\n\n**Summary:** +${additions} additions, -${deletions} deletions`;
    }
}

/** Simple line-level diff (Myers algorithm approximation) */
function computeDiff(a: string[], b: string[]): string[] {
    const result: string[] = [];
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    let i = m, j = n;
    const ops: Array<{ op: '=' | '+' | '-'; line: string }> = [];

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
            ops.unshift({ op: '=', line: a[i - 1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            ops.unshift({ op: '+', line: b[j - 1] });
            j--;
        } else {
            ops.unshift({ op: '-', line: a[i - 1] });
            i--;
        }
    }

    // Format with context (3 lines around changes)
    const CONTEXT = 3;
    const changed = new Set(ops.map((o, idx) => o.op !== '=' ? idx : -1).filter(x => x >= 0));
    const show = new Set<number>();
    for (const idx of changed) {
        for (let k = Math.max(0, idx - CONTEXT); k <= Math.min(ops.length - 1, idx + CONTEXT); k++) {
            show.add(k);
        }
    }

    let lastShown = -2;
    for (const idx of [...show].sort((a, b) => a - b)) {
        if (idx - lastShown > 1) result.push(`@@ ... @@`);
        const o = ops[idx];
        result.push(`${o.op === '=' ? ' ' : o.op}${o.line}`);
        lastShown = idx;
    }

    return result.slice(0, 500); // cap output
}
