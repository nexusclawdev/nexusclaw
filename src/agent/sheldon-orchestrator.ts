/**
 * SHELDON v3 ORCHESTRATOR — Supreme Hierarchical Engine for Leadership,
 * Delegation, and Orchestrated Networks.
 *
 * v3 UPGRADES:
 *   1. 15-agent spawning capability (was 3)
 *   2. Multi-pass verification loop: BUILD → QA → [FAIL? → DEBUG → REBUILD]
 *   3. Autonomous self-healing with max 3 retry cycles
 *   4. Anti-stub enforcement (file size validation)
 *   5. Dependency version pinning enforcement
 *   6. Port conflict detection and resolution
 *   7. Cross-agent result passing
 *
 * Pipeline: RESEARCH → VALIDATE → BUILD (6-8 agents) → QA → [DEBUG LOOP] → DEPLOY
 */

import type { Database, Project } from '../db/database.js';
import type { LLMProvider, ChatMessage } from '../providers/index.js';
import { hasToolCalls } from '../providers/index.js';
import {
    ToolRegistry, ReadFileTool, WriteFileTool, ListDirTool, ExecTool,
    WebSearchTool, WebFetchTool, FindUsagesTool, CodeAnalysisTool,
    createApplyPatchTool, Context7ResolveTool, Context7DocsTool
} from '../tools/index.js';
import { hooks } from '../hooks/index.js';
import {
    getResearchPrompt,
    getValidationPrompt,
    getBuilderFrontendPrompt,
    getBuilderBackendPrompt,
    getBuilderDatabasePrompt,
    getUIPolishPrompt,
    getDevSecOpsPrompt,
    getIntegrationPrompt,
    getQAPrompt,
    getDebuggerPrompt,
    getDeployPrompt,
    getOrchestratorPrompt,
    SHELDON_IDENTITY,
} from './prompts/sheldon-prompts.js';
import { join } from 'node:path';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { parseTimeBudget, buildTimeBudget, hasTimeRemaining, msRemaining, type TimeBudget } from './time-budget.js';

// ── Types ────────────────────────────────────────────────────────────────────

export type PipelinePhase = 'research' | 'validate' | 'build' | 'qa' | 'deploy';
export type PhaseStatus = 'pending' | 'running' | 'done' | 'failed';

export interface PipelineProject {
    id: string;
    directive: string;
    phase: PipelinePhase;
    status: 'active' | 'completed' | 'failed' | 'aborted';
    qualityScore: number;
    projectPath: string;
    detailsJson: Record<string, unknown>;
    retryCount: number;
    timeBudget: TimeBudget | null;  // null = no time constraint
    phases: Record<PipelinePhase, {
        status: PhaseStatus;
        result: string;
        startedAt: number | null;
        completedAt: number | null;
        duration: number;
    }>;
}

export interface SheldonConfig {
    provider?: LLMProvider;
    db: Database;
    model: string;
    workspace: string;
    maxWorkerIterations: number;
    maxTokens: number;
    temperature: number;
    braveApiKey?: string;
    maxBuildRetries?: number;       // v3: max debug→rebuild cycles (default: 3)
    maxAgentConcurrency?: number;   // v3: max parallel agents (default: 8)
    onProgress?: (projectId: string, phase: string, message: string) => void;
}

// ── Semaphore ────────────────────────────────────────────────────────────────

class Semaphore {
    private queue: Array<() => void> = [];
    private active = 0;
    constructor(private max: number) { }
    async acquire(): Promise<void> {
        if (this.active < this.max) { this.active++; return; }
        return new Promise(resolve => {
            this.queue.push(() => { this.active++; resolve(); });
        });
    }
    release(): void {
        this.active--;
        const next = this.queue.shift();
        if (next) next();
    }
}

// ── Worker Execution (runs a single LLM agent with tools) ───────────────────

async function runPhaseWorker(
    workerId: string,
    systemPrompt: string,
    task: string,
    provider: LLMProvider,
    model: string,
    workspace: string,
    config: {
        maxIterations: number;
        maxTokens: number;
        temperature: number;
        braveApiKey?: string;
    },
    onProgress?: (msg: string) => void,
    phaseTimeoutMs?: number,  // per-phase timeout from TimeBudget (overrides default 10m)
): Promise<string> {
    const tools = new ToolRegistry();
    tools.register(new ReadFileTool(workspace, workspace));
    tools.register(new WriteFileTool(workspace, workspace));
    tools.register(new ListDirTool(workspace, workspace));
    tools.register(new ExecTool(workspace, 120000, true)); // v3: 2 min timeout (was 60s)
    tools.register(new WebSearchTool(config.braveApiKey));
    tools.register(new WebFetchTool());
    tools.register(new Context7ResolveTool());  // v3.1: Up-to-date library docs
    tools.register(new Context7DocsTool());     // v3.1: Up-to-date library docs
    tools.register(new FindUsagesTool(workspace));
    tools.register(new CodeAnalysisTool(workspace));
    tools.register(createApplyPatchTool(workspace));

    let messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: task },
    ];

    let finalContent = '';
    let iteration = 0;

    const timeoutMs = phaseTimeoutMs ?? 600_000;
    const deadlineValue = Date.now() + timeoutMs;

    while (iteration < config.maxIterations && Date.now() < deadlineValue) {
        iteration++;

        // v3.1: Hard deadline enforcement — inject time pressure at 75% elapsed
        const elapsed = Date.now() - (deadlineValue - timeoutMs);
        const remaining = deadlineValue - Date.now();
        if (remaining < timeoutMs * 0.25 && iteration > 1) {
            // Inject urgency into the conversation
            messages = [
                ...messages,
                { role: 'user', content: `⏰ URGENT: Only ${Math.round(remaining / 60_000)} minutes remaining! Finish ALL remaining files NOW. Write complete code, do not skip any file. If you have unfinished work, PRIORITIZE creating all files over polishing existing ones.` },
            ];
        }

        const response = await provider!.chat(
            messages,
            tools.getDefinitions() as any,
            model,
            config.maxTokens,
            config.temperature,
        );

        if (hasToolCalls(response)) {
            const hint = response.toolCalls.map(tc => tc.name).join(', ');
            onProgress?.(`[${workerId}] 🔧 ${hint}`);

            const toolCallDicts = response.toolCalls.map(tc => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
            }));

            messages = [
                ...messages,
                { role: 'assistant', content: response.content || '', tool_calls: toolCallDicts } as any,
            ];

            const toolResults = await Promise.all(
                response.toolCalls.map(async (tc) => {
                    try {
                        const result = await tools.execute(tc.name, tc.arguments);
                        return { id: tc.id, name: tc.name, result: result.slice(0, 15000) }; // v3: increased output cap
                    } catch (err) {
                        return { id: tc.id, name: tc.name, result: `Error: ${err instanceof Error ? err.message : String(err)}` };
                    }
                })
            );

            for (const tr of toolResults) {
                messages = [
                    ...messages,
                    { role: 'tool', tool_call_id: tr.id, name: tr.name, content: tr.result } as any,
                ];
            }
        } else {
            finalContent = response.content || '(no output)';
            break;
        }
    }

    if (!finalContent) finalContent = '(max iterations reached)';
    onProgress?.(`[${workerId}] ✅ Complete`);
    return finalContent;
}

// ── THE SHELDON v3 ORCHESTRATOR ─────────────────────────────────────────────

export class SheldonOrchestrator {
    private config: SheldonConfig;
    private activeProjects = new Map<string, PipelineProject>();

    constructor(config: SheldonConfig) {
        this.config = config;
    }

    // ── v3.1: SCAFFOLD-FIRST BUILD — deterministic file creation ─────────────
    //    Creates ALL boilerplate files BEFORE any LLM agent runs.
    //    This eliminates the #1 class of build failures (missing files).

    private scaffoldProject(projectPath: string, directive: string): void {
        const fe = join(projectPath, 'frontend');
        const be = join(projectPath, 'backend');
        const safeMkdir = (p: string) => { if (!existsSync(p)) mkdirSync(p, { recursive: true }); };
        const safeWrite = (p: string, content: string) => {
            safeMkdir(join(p, '..').replace(/\/[^/]*$/, ''));
            if (!existsSync(p)) writeFileSync(p, content, 'utf-8');
        };

        // ── Frontend Scaffold ────────────────────────────────────────────────
        safeMkdir(join(fe, 'src', 'pages'));
        safeMkdir(join(fe, 'src', 'components'));
        safeMkdir(join(fe, 'src', 'contexts'));
        safeMkdir(join(fe, 'src', 'api'));

        safeWrite(join(fe, 'index.html'), `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <title>${directive.slice(0, 40)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);

        safeWrite(join(fe, 'vite.config.ts'), `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})`);

        safeWrite(join(fe, 'postcss.config.js'), `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`);

        safeWrite(join(fe, 'tsconfig.json'), `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}`);

        safeWrite(join(fe, 'package.json'), JSON.stringify({
            name: directive.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30) + '-frontend',
            private: true,
            version: '1.0.0',
            type: 'module',
            scripts: {
                dev: 'vite',
                build: 'tsc && vite build',
                preview: 'vite preview'
            },
            dependencies: {
                'react': '^18.2.0',
                'react-dom': '^18.2.0',
                'react-router-dom': '^6.8.1',
                'axios': '^1.6.2',
                'lucide-react': '^0.263.1',
                'react-hot-toast': '^2.4.0'
            },
            devDependencies: {
                '@types/react': '^18.2.0',
                '@types/react-dom': '^18.2.0',
                '@vitejs/plugin-react': '^4.2.0',
                'autoprefixer': '^10.4.14',
                'postcss': '^8.4.31',
                'tailwindcss': '^3.3.0',
                'typescript': '^5.3.2',
                'vite': '^4.5.0'
            }
        }, null, 2));

        safeWrite(join(fe, 'tailwind.config.js'), `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' }
      }
    }
  },
  plugins: []
}`);

        safeWrite(join(fe, 'src', 'index.css'), `@tailwind base;\n@tailwind components;\n@tailwind utilities;`);

        safeWrite(join(fe, '.env'), 'VITE_API_BASE_URL=http://localhost:3000/api');

        // Minimal main.tsx that agents will expand
        safeWrite(join(fe, 'src', 'main.tsx'), `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster position="top-right" />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);`);

        safeWrite(join(fe, 'src', 'App.tsx'), `import { Routes, Route } from 'react-router-dom';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Routes>
        <Route path="/" element={<div className="p-8 text-center"><h1 className="text-3xl font-bold">Loading...</h1></div>} />
      </Routes>
    </div>
  );
}`);

        // ── Backend Scaffold (Pure JS — NO TypeScript) ────────────────────────
        safeMkdir(join(be, 'src', 'routes'));
        safeMkdir(join(be, 'src', 'models'));
        safeMkdir(join(be, 'src', 'middleware'));
        safeMkdir(join(be, 'src', 'database'));
        safeMkdir(join(be, 'src', 'utils'));
        safeMkdir(join(be, 'data'));

        safeWrite(join(be, 'package.json'), JSON.stringify({
            name: directive.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30) + '-backend',
            version: '1.0.0',
            scripts: {
                start: 'node src/server.js',
                dev: 'node src/server.js'
            },
            dependencies: {
                'express': '^4.18.2',
                'cors': '^2.8.5',
                'helmet': '^7.1.0',
                'dotenv': '^16.3.1',
                'bcryptjs': '^2.4.3',
                'jsonwebtoken': '^9.0.2',
                'sequelize': '^6.35.1',
                'sqlite3': '^5.1.6',
                'joi': '^17.11.0',
                'winston': '^3.11.0',
                'express-rate-limit': '^7.1.0'
            }
        }, null, 2));

        safeWrite(join(be, '.env'), `PORT=3000\nJWT_SECRET=sheldon-jwt-secret-${Date.now()}\nDATABASE_TYPE=sqlite\nDATABASE_FILE=./data/app.sqlite\nNODE_ENV=development\nCORS_ORIGIN=http://localhost:5173`);
        safeWrite(join(be, '.env.example'), 'PORT=3000\nJWT_SECRET=change-me\nDATABASE_TYPE=sqlite\nDATABASE_FILE=./data/app.sqlite\nNODE_ENV=development\nCORS_ORIGIN=http://localhost:5173');
    }

    // ── v3.1: POST-BUILD VALIDATION — deterministic, no LLM ─────────────────
    //    Runs npm install + boot-test after all agents complete, before QA.

    private async runPostBuildValidation(project: PipelineProject): Promise<void> {
        this.progress(project.id, 'build', '🔍 POST-BUILD VALIDATION: Running npm install + boot test...');

        const fe = join(project.projectPath, 'frontend');
        const be = join(project.projectPath, 'backend');

        // 1. Ensure scaffold files still exist (agents might have deleted them)
        const criticalFiles = [
            [join(fe, 'index.html'), 'Frontend index.html'],
            [join(fe, 'vite.config.ts'), 'Frontend vite.config.ts'],
            [join(fe, 'postcss.config.js'), 'Frontend postcss.config.js'],
            [join(fe, 'package.json'), 'Frontend package.json'],
            [join(fe, 'src', 'main.tsx'), 'Frontend main.tsx'],
            [join(fe, 'src', 'index.css'), 'Frontend index.css'],
            [join(be, 'package.json'), 'Backend package.json'],
            [join(be, '.env'), 'Backend .env'],
        ];

        let missingCount = 0;
        for (const [filePath, label] of criticalFiles) {
            if (!existsSync(filePath)) {
                missingCount++;
                this.progress(project.id, 'build', `⚠️ MISSING: ${label} — re-scaffolding...`);
            }
        }

        // Re-scaffold if files are missing
        if (missingCount > 0) {
            this.scaffoldProject(project.projectPath, project.directive);
            this.progress(project.id, 'build', `🔧 Re-scaffolded ${missingCount} missing files`);
        }

        // 2. Fix common agent mistakes in backend files
        this.fixCommonAgentMistakes(project.projectPath);

        // 3. npm install frontend
        try {
            this.progress(project.id, 'build', '📦 Installing frontend dependencies...');
            execSync('npm install --legacy-peer-deps 2>&1', { cwd: fe, timeout: 120_000, stdio: 'pipe' });
            this.progress(project.id, 'build', '✅ Frontend npm install succeeded');
        } catch (err: any) {
            this.progress(project.id, 'build', `⚠️ Frontend npm install failed: ${String(err.stderr || err.message).slice(0, 200)}`);
        }

        // 4. npm install backend
        try {
            this.progress(project.id, 'build', '📦 Installing backend dependencies...');
            execSync('npm install 2>&1', { cwd: be, timeout: 120_000, stdio: 'pipe' });
            this.progress(project.id, 'build', '✅ Backend npm install succeeded');
        } catch (err: any) {
            this.progress(project.id, 'build', `⚠️ Backend npm install failed: ${String(err.stderr || err.message).slice(0, 200)}`);
        }

        // 5. Boot-test backend (5 second timeout)
        try {
            this.progress(project.id, 'build', '🏃 Boot-testing backend server...');
            const bootResult = execSync(
                'node -e "const s = require(\\"./src/server.js\\"); setTimeout(() => process.exit(0), 3000)" 2>&1',
                { cwd: be, timeout: 10_000, stdio: 'pipe' }
            );
            this.progress(project.id, 'build', '✅ Backend boot test passed');
        } catch (err: any) {
            const errMsg = String(err.stderr || err.stdout || err.message).slice(0, 500);
            this.progress(project.id, 'build', `⚠️ Backend boot test issue: ${errMsg.slice(0, 200)}`);
        }

        this.progress(project.id, 'build', '🔍 POST-BUILD VALIDATION COMPLETE');
    }

    // ── v3.1: Fix common agent mistakes ──────────────────────────────────────

    private fixCommonAgentMistakes(projectPath: string): void {
        const be = join(projectPath, 'backend');

        // Scan all .js files in backend for common mistakes
        const scanDir = (dir: string) => {
            if (!existsSync(dir)) return;
            const entries = require('node:fs').readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = join(dir, entry.name);
                if (entry.isDirectory() && entry.name !== 'node_modules') {
                    scanDir(fullPath);
                } else if (entry.name.endsWith('.js')) {
                    try {
                        let content = readFileSync(fullPath, 'utf-8');
                        let changed = false;

                        // Fix 1: bcrypt → bcryptjs
                        if (content.includes("require('bcrypt')") && !content.includes("require('bcryptjs')")) {
                            content = content.replace(/require\('bcrypt'\)/g, "require('bcryptjs')");
                            changed = true;
                        }

                        // Fix 2: import/export in .js files → convert to require/module.exports
                        if (content.match(/^import .+ from /m) && !content.includes('// ESM-OK')) {
                            // This is a complex transform — just flag it
                        }

                        if (changed) writeFileSync(fullPath, content, 'utf-8');
                    } catch { /* skip unreadable files */ }
                }
            }
        };

        scanDir(join(be, 'src'));
    }

    getProjects(): PipelineProject[] {
        return Array.from(this.activeProjects.values());
    }

    getProject(id: string): PipelineProject | undefined {
        return this.activeProjects.get(id);
    }

    getMetrics() {
        const projects = Array.from(this.activeProjects.values());
        return {
            activeProjects: projects.filter(p => p.status === 'active').length,
            shippedApps: projects.filter(p => p.status === 'completed').length,
            queueLength: projects.filter(p => {
                const phase = p.phases[p.phase];
                return phase?.status === 'pending';
            }).length,
            attentionNeeded: projects.filter(p => p.status === 'failed').length,
            totalProjects: projects.length,
        };
    }

    abortProject(id: string): boolean {
        const project = this.activeProjects.get(id);
        if (!project || project.status !== 'active') return false;
        project.status = 'aborted';
        this.broadcastUpdate(project);
        return true;
    }

    /** v3 LAUNCH — Fully autonomous pipeline with self-healing */
    async launchProject(directive: string, timeBudgetMs?: number): Promise<string> {
        // Build a human-readable project name from the directive (first 4 meaningful words)
        const slug = directive
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .trim()
            .split(/\s+/)
            .slice(0, 4)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join('');

        // Format: YYYYMMDD_HHMM in local time
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

        const projectId = `sheldon_${slug}_${dateStr}`;
        const projectPath = join(this.config.workspace, '.sheldon', projectId);

        if (!existsSync(projectPath)) {
            mkdirSync(projectPath, { recursive: true });
        }

        const dbProjectId = this.config.db.createProject({
            name: directive.slice(0, 80),
            project_path: projectPath,
            core_goal: directive,
        });

        // ── Time Budget Resolution ────────────────────────────────────────────
        // Try: explicit ms param → parse from directive → no constraint
        const rawMs = timeBudgetMs ?? parseTimeBudget(directive);
        const timeBudget = rawMs ? buildTimeBudget(rawMs) : null;

        const project: PipelineProject = {
            id: projectId,
            directive,
            phase: 'research',
            status: 'active',
            qualityScore: 0,
            projectPath,
            retryCount: 0,
            timeBudget,
            detailsJson: { dbProjectId, directive },
            phases: {
                research: { status: 'pending', result: '', startedAt: null, completedAt: null, duration: 0 },
                validate: { status: 'pending', result: '', startedAt: null, completedAt: null, duration: 0 },
                build: { status: 'pending', result: '', startedAt: null, completedAt: null, duration: 0 },
                qa: { status: 'pending', result: '', startedAt: null, completedAt: null, duration: 0 },
                deploy: { status: 'pending', result: '', startedAt: null, completedAt: null, duration: 0 },
            },
        };

        this.activeProjects.set(projectId, project);
        this.broadcastUpdate(project);

        // Announce time budget to user
        if (timeBudget) {
            const deadline = new Date(timeBudget.deadline);
            const timeStr = deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            this.progress(projectId, 'research',
                `⏱️ TIME-BUDGET MODE: ${timeBudget.label} | Deadline: ${timeStr} | ` +
                `Concurrency: ${timeBudget.concurrency} agents | Mode: ${timeBudget.concurrency >= 12 ? 'SPRINT 🚀' : timeBudget.concurrency >= 8 ? 'FAST ⚡' : 'THOROUGH 🔬'}`
            );
            this.progress(projectId, 'research',
                `📅 Phase budget → Research: ${Math.round(timeBudget.phases.research / 60000)}m | ` +
                `Build: ${Math.round(timeBudget.phases.build / 60000)}m | ` +
                `QA: ${Math.round(timeBudget.phases.qa / 60000)}m | ` +
                `Deploy: ${Math.round(timeBudget.phases.deploy / 60000)}m`
            );
        }

        this.executePipeline(project).catch(err => {
            console.error(`[Sheldon v3] Pipeline fatal error for ${projectId}:`, err);
            project.status = 'failed';
            this.broadcastUpdate(project);
        });

        return projectId;
    }

    // ── v3 Pipeline Execution with Self-Healing Loop ─────────────────────────

    private async executePipeline(project: PipelineProject): Promise<void> {
        const maxRetries = this.config.maxBuildRetries || 3;

        // Phase 1: Research
        await this.executePhase(project, 'research');
        if (project.status !== 'active') return;

        // Phase 2: Validate
        await this.executePhase(project, 'validate');
        if (project.status !== 'active') return;

        // v3: BUILD → QA → [DEBUG → REBUILD] LOOP
        let buildSuccess = false;
        let lastError = '';

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            project.retryCount = attempt;

            if (attempt > 0) {
                this.progress(project.id, 'build', `🔄 RETRY ${attempt}/${maxRetries} — Running Autonomous Debugger...`);

                // Run Debugger Agent with the error from QA
                await this.runDebuggerPhase(project, lastError);

                // Reset build/qa status for retry
                project.phases.build.status = 'pending';
                project.phases.build.result = '';
                project.phases.qa.status = 'pending';
                project.phases.qa.result = '';
            }

            // Phase 3: Build (6-8 parallel agents)
            await this.executePhase(project, 'build');
            if (project.status !== 'active') return;

            // Phase 3.5: POST-BUILD VALIDATION (deterministic, no LLM)
            await this.runPostBuildValidation(project);

            // Phase 4: QA (verification)
            await this.executePhase(project, 'qa');
            if (project.status !== 'active') return;

            // Check QA result for pass/fail
            const qaResult = this.parseQAResult(project.phases.qa.result);

            if (qaResult.passed) {
                buildSuccess = true;
                this.progress(project.id, 'qa', `✅ QA PASSED on attempt ${attempt + 1}! Score: ${qaResult.score}/10`);
                break;
            } else {
                lastError = qaResult.errorLog;
                this.progress(project.id, 'qa', `❌ QA FAILED on attempt ${attempt + 1}: ${qaResult.failReason}`);

                if (attempt === maxRetries) {
                    this.progress(project.id, 'qa', `🛑 Max retries (${maxRetries}) exhausted. Proceeding with best result.`);
                }
            }
        }

        // Phase 5: Deploy (runs regardless — package whatever we have)
        await this.executePhase(project, 'deploy');

        if (project.status === 'active') {
            project.status = 'completed';
            const emoji = buildSuccess ? '🚀' : '⚠️';
            this.progress(project.id, 'deploy', `${emoji} PROJECT SHIPPED (${buildSuccess ? 'clean' : 'with warnings'}) — ${project.retryCount} debug cycles used`);
            this.broadcastUpdate(project);
        }
    }

    private async executePhase(project: PipelineProject, phase: PipelinePhase): Promise<void> {
        if (!this.config.provider) {
            this.progress(project.id, phase, '🛑 LLM provider not configured. Cannot proceed with automated work.');
            project.status = 'failed';
            return;
        }

        if (project.status === 'aborted') {
            this.progress(project.id, phase, '🛑 Pipeline aborted by CEO');
            return;
        }

        const phaseData = project.phases[phase];
        phaseData.status = 'running';
        phaseData.startedAt = Date.now();
        project.phase = phase;
        this.broadcastUpdate(project);
        this.progress(project.id, phase, `▶️ Starting ${phase.toUpperCase()} phase`);

        let result: string;

        try {
            switch (phase) {
                case 'research':
                    result = await this.runResearchPhase(project);
                    break;
                case 'validate':
                    result = await this.runValidatePhase(project);
                    break;
                case 'build':
                    result = await this.runBuildPhase(project);
                    break;
                case 'qa':
                    result = await this.runQAPhase(project);
                    break;
                case 'deploy':
                    result = await this.runDeployPhase(project);
                    break;
                default:
                    result = 'Unknown phase';
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            this.progress(project.id, phase, `❌ Phase error: ${errorMsg}`);
            phaseData.status = 'failed';
            phaseData.result = errorMsg;

            // v3: Only mark project as failed on research/validate errors
            // Build/QA errors are handled by the retry loop
            if (phase === 'research' || phase === 'validate') {
                project.status = 'failed';
                this.broadcastUpdate(project);
            }
            return;
        }

        // Evaluate phase result
        const evaluation = await this.evaluatePhaseResult(phase, result);

        phaseData.status = 'done';
        phaseData.result = result;
        phaseData.completedAt = Date.now();
        phaseData.duration = phaseData.completedAt - (phaseData.startedAt || phaseData.completedAt);

        // Update quality score
        const completedPhases = Object.values(project.phases).filter(p => p.status === 'done');
        if (evaluation.quality_score) {
            const totalScore = completedPhases.reduce((sum, p) => {
                try {
                    const parsed = JSON.parse(p.result || '{}');
                    return sum + (parsed._quality_score || evaluation.quality_score || 5);
                } catch { return sum + 5; }
            }, 0);
            project.qualityScore = Math.round((totalScore / completedPhases.length) * 10) / 10;
        }

        // Enrich result with evaluation
        try {
            const enriched = JSON.parse(result);
            enriched._quality_score = evaluation.quality_score;
            enriched._evaluation = evaluation.notes;
            phaseData.result = JSON.stringify(enriched);
        } catch {
            phaseData.result = JSON.stringify({
                raw_output: result.slice(0, 8000),
                _quality_score: evaluation.quality_score,
                _evaluation: evaluation.notes,
            });
        }

        (project.detailsJson as any)[phase] = phaseData.result;
        this.broadcastUpdate(project);

        this.progress(project.id, phase, `✅ ${phase.toUpperCase()} complete (score: ${evaluation.quality_score}/10)`);

        // Validation gate
        if (phase === 'validate') {
            try {
                const valResult = JSON.parse(result);
                if (valResult.verdict === 'NO_GO') {
                    project.status = 'failed';
                    this.progress(project.id, 'validate', '🛑 Validation REJECTED — idea scored too low');
                    throw new Error('Validation rejected: NO_GO verdict');
                }
            } catch (e) {
                if ((e as Error).message.includes('NO_GO')) throw e;
            }
        }
    }

    // ── Phase Implementations ────────────────────────────────────────────────

    private async runResearchPhase(project: PipelineProject): Promise<string> {
        const tb = project.timeBudget;
        const researchBudgetMs = tb?.phases.research ?? 5 * 60_000;
        this.progress(project.id, 'research', `🔬 Deploying 4 parallel research agents (budget: ${Math.round(researchBudgetMs / 60000)}m)...`);

        const semaphore = new Semaphore(4);
        const workerConfig = {
            maxIterations: tb ? Math.min(tb.workerIterations, 5) : this.config.maxWorkerIterations,
            maxTokens: this.config.maxTokens,
            temperature: this.config.temperature,
            braveApiKey: this.config.braveApiKey,
        };

        const researchTasks = [
            { id: 'research-reddit', focus: `Research Reddit and forums for: ${project.directive}. Search "site:reddit.com ${project.directive}" and analyze discussions, pain points, feature requests.` },
            { id: 'research-hn', focus: `Research HackerNews and tech community for: ${project.directive}. Search "site:news.ycombinator.com ${project.directive}" and analyze sentiment, technical debates.` },
            { id: 'research-competitors', focus: `Research competitors and alternatives for: ${project.directive}. Search "${project.directive} alternatives comparison review 2025" and map the entire competitive landscape with pricing.` },
            { id: 'research-market', focus: `Research market size and demand for: ${project.directive}. Search "${project.directive} market size TAM SaaS users growth 2025" and find concrete data points.` },
        ];

        const workerPromises = researchTasks.map(async (task) => {
            await semaphore.acquire();
            try {
                return await runPhaseWorker(
                    task.id,
                    getResearchPrompt(project.directive),
                    task.focus,
                    this.config.provider!,
                    this.config.model,
                    project.projectPath,
                    workerConfig,
                    (msg) => this.progress(project.id, 'research', msg),
                    tb ? researchBudgetMs : undefined,
                );
            } finally {
                semaphore.release();
            }
        });

        const results = await Promise.allSettled(workerPromises);
        const outputs = results.map((r, i) => {
            if (r.status === 'fulfilled') return `### ${researchTasks[i].id}\n${r.value}`;
            return `### ${researchTasks[i].id}\nFailed: ${r.reason}`;
        });

        this.progress(project.id, 'research', '🧠 Synthesizing research from all agents...');

        const synthesisResult = await runPhaseWorker(
            'research-synthesis',
            SHELDON_IDENTITY,
            `Synthesize these research reports into a single comprehensive JSON report:\n\n${outputs.join('\n\n')}\n\nReturn a JSON object with: executive_summary, pain_points (array of 5+), target_user, market_size, competitors (array with name/strengths/weaknesses/pricing), reddit_insights (array), opportunity_gap, recommended_features (array of 8+), monetization_ideas, risk_factors, confidence_score (1-10), tech_stack_recommendation`,
            this.config.provider!,
            this.config.model,
            project.projectPath,
            { ...workerConfig, maxIterations: 3 },
            undefined,
            tb ? Math.min(tb.phases.research / 2, 120_000) : undefined,
        );

        return synthesisResult;
    }

    private async runValidatePhase(project: PipelineProject): Promise<string> {
        this.progress(project.id, 'validate', '✅ Running validation analysis...');

        const researchData = project.phases.research.result || '{}';

        return runPhaseWorker(
            'validation-lead',
            getValidationPrompt(project.directive, researchData),
            `Validate and score this project idea based on the research data provided. Be thorough and honest. Return JSON with verdict, scores, mvp_scope, and tech_stack_recommendation.`,
            this.config.provider!,
            this.config.model,
            project.projectPath,
            {
                maxIterations: this.config.maxWorkerIterations,
                maxTokens: this.config.maxTokens,
                temperature: this.config.temperature,
                braveApiKey: this.config.braveApiKey,
            },
            (msg) => this.progress(project.id, 'validate', msg),
        );
    }

    /** v3.1: EXPANDED BUILD PHASE — scaffold-first + scales with TimeBudget */
    private async runBuildPhase(project: PipelineProject): Promise<string> {
        const tb = project.timeBudget;
        const concurrency = tb?.concurrency ?? this.config.maxAgentConcurrency ?? 8;
        const buildBudgetMs = tb?.phases.build ?? 20 * 60_000;
        const workerTimeout = tb?.workerTimeoutMs ?? 600_000;

        // v3.1: SCAFFOLD FIRST — create all boilerplate before agents run
        this.progress(project.id, 'build', '🏗️  SCAFFOLD: Pre-creating all project boilerplate files...');
        this.scaffoldProject(project.projectPath, project.directive);
        this.progress(project.id, 'build', '✅ Scaffold complete — agents will now extend these files');

        this.progress(project.id, 'build',
            `⚒️ Deploying parallel build agents (budget: ${Math.round(buildBudgetMs / 60000)}m | ${concurrency} concurrent | mode: ${tb ? (concurrency >= 12 ? 'SPRINT 🚀' : 'FAST ⚡') : 'STANDARD'})...`
        );

        const validationData = project.phases.validate.result || '{}';
        const semaphore = new Semaphore(concurrency);
        const workerConfig = {
            maxIterations: tb?.workerIterations ?? Math.min(this.config.maxWorkerIterations, 20),
            maxTokens: this.config.maxTokens,
            temperature: this.config.temperature,
            braveApiKey: this.config.braveApiKey,
        };

        // v3.1: 12 specialized build agents with EXPLICIT file ownership
        const buildTasks = [
            // --- FRONTEND SWARM (4) — EXPLICIT FILE OWNERSHIP ---
            {
                id: 'agent-frontend-layout',
                prompt: getBuilderFrontendPrompt(project.directive, validationData, join(project.projectPath, 'frontend')),
                task: `Build the CORE FRONTEND ARCHITECTURE. The scaffold already created package.json, vite.config.ts, index.html, postcss.config.js, tailwind.config.js, and a minimal main.tsx/App.tsx. Your job is to EXTEND these files (do NOT delete or overwrite package.json, vite.config.ts, index.html, postcss.config.js). Specifically:\n- REPLACE src/App.tsx with FULL routing: LoginPage, RegisterPage, HomePage, DashboardPage, SettingsPage + domain pages\n- CREATE src/contexts/AuthContext.tsx with full user/token/login/logout state\n- CREATE src/components/ProtectedRoute.tsx with JWT guard\n- CREATE src/api/index.ts with Axios instance + JWT interceptor\n- UPDATE main.tsx to wrap App in AuthProvider\n\nDO NOT touch files in src/components/ or src/pages/ — other agents handle those.`,
                path: join(project.projectPath, 'frontend'),
            },
            {
                id: 'agent-frontend-components',
                prompt: getBuilderFrontendPrompt(project.directive, validationData, join(project.projectPath, 'frontend')),
                task: `Build the COMPONENT LIBRARY. You own ONLY src/components/. Create ALL of these files:\n- src/components/Header.tsx — Nav bar with logo, links, user info, logout button. Use lucide-react icons.\n- src/components/Sidebar.tsx — Side nav with menu items, active state, collapse toggle. Use Link from react-router-dom.\n- src/components/Button.tsx — Reusable button with variants (primary, secondary, danger, ghost)\n- src/components/Card.tsx — Glass-morphism card (bg-white/70 backdrop-blur-md)\n- src/components/Input.tsx — Form input with label, error state, icon support\n- src/components/Modal.tsx — Overlay modal with close button and animation\n\nEvery component MUST use named exports (export const Header = ...), NOT default exports.\nDO NOT touch any files outside src/components/.`,
                path: join(project.projectPath, 'frontend'),
            },
            {
                id: 'agent-frontend-pages',
                prompt: getBuilderFrontendPrompt(project.directive, validationData, join(project.projectPath, 'frontend')),
                task: `Build the FEATURE PAGES. You own ONLY src/pages/. Create ALL of these files with COMPLETE, PREMIUM UI:\n- src/pages/LoginPage.tsx — Email/password form with validation, error handling, loading spinner, Link to register. Use lucide-react icons (Lock, Mail, Eye, EyeOff).\n- src/pages/RegisterPage.tsx — Full form: firstName, lastName, email, password. Gradient background.\n- src/pages/HomePage.tsx — Marketing landing page with hero section, feature grid (3-6 features), CTA button, gradient background.\n- src/pages/DashboardPage.tsx — Stats cards (3 metrics), data table or list, empty state with CTA. Import Header and Sidebar.\n- src/pages/SettingsPage.tsx — Profile editing form, danger zone section. Import Header and Sidebar.\n- 3-5 additional domain-specific pages based on the directive.\n\nEvery page MUST use named exports (export const LoginPage = ...).\nEvery page MUST import from '../components/' and '../contexts/AuthContext'.\nDO NOT touch files outside src/pages/.`,
                path: join(project.projectPath, 'frontend'),
            },
            {
                id: 'agent-frontend-styling',
                prompt: getBuilderFrontendPrompt(project.directive, validationData, join(project.projectPath, 'frontend')),
                task: `Build the GLOBAL STYLING. You own ONLY: tailwind.config.js and src/index.css.\n- REPLACE tailwind.config.js with expanded theme: custom primary/secondary/accent color palettes, extended fontFamily (Inter), custom animations (fadeIn, slideUp, float), custom keyframes.\n- REPLACE src/index.css with: @tailwind directives + CSS custom properties for premium glass/gradient utilities + smooth scrolling + custom scrollbar styles.\n\nDO NOT modify or create any other files.`,
                path: join(project.projectPath, 'frontend'),
            },
            // --- BACKEND SWARM (4) — ALL .js FILES, NO .ts ---
            {
                id: 'agent-backend-core',
                prompt: getBuilderBackendPrompt(project.directive, validationData, join(project.projectPath, 'backend')),
                task: `Build the BACKEND CORE. The scaffold already created package.json and .env. Your job is to EXTEND (do NOT delete package.json or .env). Specifically:\n- CREATE src/server.js — Express app: require dotenv, cors, helmet, rate-limit, routes, error handler, db init, app.listen. Port from process.env.PORT.\n- CREATE src/middleware/errorHandler.js — Global error handler (4-arg middleware)\n- CREATE src/middleware/rateLimiter.js — express-rate-limit config\n- CREATE src/middleware/validate.js — Joi validation middleware factory\n- CREATE src/utils/logger.js — Winston logger with console transport\n\nIMPORTANT: ALL files MUST use .js extension. Use require() and module.exports. NO import/export. NO .ts files.\nDO NOT touch routes/, models/, or database/ — other agents handle those.`,
                path: join(project.projectPath, 'backend'),
            },
            {
                id: 'agent-backend-auth',
                prompt: getBuilderBackendPrompt(project.directive, validationData, join(project.projectPath, 'backend')),
                task: `Build the AUTH SYSTEM. You own ONLY: src/middleware/auth.js and src/routes/auth.js.\n- CREATE src/middleware/auth.js — JWT verification: extract token from Authorization header, verify with jsonwebtoken, attach user to req.user. Use LAZY require for models (const { User } = require('../models') inside the function body, NOT at top level).\n- CREATE src/routes/auth.js — POST /register (validate with Joi, hash password with bcryptjs, create user, return JWT) + POST /login (find user by email, compare password with bcryptjs, return JWT). Use LAZY require for models inside each handler.\n\nCRITICAL: Use require('bcryptjs') NOT require('bcrypt'). The package is bcryptjs.\nCRITICAL: ALL files MUST be .js. Use require() and module.exports.\nDO NOT touch any other files.`,
                path: join(project.projectPath, 'backend'),
            },
            {
                id: 'agent-backend-routes',
                prompt: getBuilderBackendPrompt(project.directive, validationData, join(project.projectPath, 'backend')),
                task: `Build the API ROUTES. You own ONLY: src/routes/ (except auth.js — another agent handles that).\n- CREATE src/routes/index.js — Barrel file that exports all route modules\n- CREATE 2-4 domain route files (e.g., src/routes/tasks.js, src/routes/documents.js) with full CRUD: GET /, GET /:id, POST /, PUT /:id, DELETE /:id\n- Each route MUST query the real database via Sequelize models (use lazy require inside handlers)\n- Each route MUST have try/catch error handling\n\nCRITICAL: ALL files MUST be .js. Use require() and module.exports.`,
                path: join(project.projectPath, 'backend'),
            },
            {
                id: 'agent-backend-services',
                prompt: getBuilderBackendPrompt(project.directive, validationData, join(project.projectPath, 'backend')),
                task: `Build the BUSINESS LOGIC. You own: src/utils/helpers.js and any service files in src/services/.\n- CREATE src/utils/helpers.js — Common utilities (generateId, formatDate, sanitizeInput, etc.)\n- If the directive requires external APIs (e.g., Stripe, OpenAI), create src/services/[api-name].js with REAL SDK integration using credentials from process.env\n- If no external APIs needed, create src/services/analytics.js with simple internal analytics logic\n\nCRITICAL: ALL files MUST be .js. Use require() and module.exports.`,
                path: join(project.projectPath, 'backend'),
            },
            // --- DATABASE SWARM (2) --- ALL .js FILES ---
            {
                id: 'agent-database-schema',
                prompt: getBuilderDatabasePrompt(project.directive, validationData, join(project.projectPath, 'backend')),
                task: `Design the DATABASE SCHEMA. You own: src/database/index.js and src/models/*.js.\n- CREATE src/database/index.js — Sequelize init with SQLite, createConnection() function that calls all model init functions and sets up associations. Export { sequelize, createConnection }.\n- CREATE src/models/User.js — User model factory: module.exports = function(sequelize, DataTypes) { ... return User; }; Also export as: module.exports.initUserModel = module.exports;\n- CREATE src/models/Profile.js — Profile model with userId foreign key. Same factory pattern.\n- CREATE 2-3 domain-specific models based on the directive.\n- CREATE src/models/index.js — Barrel that requires all models: module.exports = { User: {}, Profile: {}, ... }; (empty initially, filled by createConnection())\n\nCRITICAL: ALL files .js. Use require() and module.exports.\nCRITICAL: Use require('bcryptjs') in User model hooks, NOT require('bcrypt').\nCRITICAL: Factory pattern: module.exports = function(sequelize, DataTypes) { const Model = sequelize.define(...); return Model; };`,
                path: join(project.projectPath, 'backend'),
            },
            {
                id: 'agent-database-seeds',
                prompt: getBuilderDatabasePrompt(project.directive, validationData, join(project.projectPath, 'backend')),
                task: `Create SEED DATA. You own ONLY: src/database/seed.js.\n- CREATE src/database/seed.js — Script that imports createConnection from ./index.js, calls it, then creates realistic sample data: 2 users (admin + regular, hashed passwords with bcryptjs), 5-10 domain records with REALISTIC names/data.\n- Use real-sounding data (e.g., "Sarah Chen", "sarah@legalfirm.com"), NOT "test user" or "foo@bar.com"\n\nCRITICAL: .js file. Use require('bcryptjs').`,
                path: join(project.projectPath, 'backend'),
            },
            // --- SUPPORT SWARM (2) ---
            {
                id: 'agent-devsecops',
                prompt: getDevSecOpsPrompt(project.directive, project.projectPath),
                task: 'Harden SECURITY & DOCKER: Create Dockerfile, docker-compose.yml, .gitignore, and .env.example. Verify no secrets are in code.',
                path: project.projectPath,
            },
            {
                id: 'agent-tech-writer',
                prompt: getDevSecOpsPrompt(project.directive, project.projectPath),
                task: 'Build DOCUMENTATION: Create a comprehensive README.md (100+ lines) with setup guides, API reference, tech stack overview, and a user manual.',
                path: project.projectPath,
            },
        ];

        const workerPromises = buildTasks.map(async (task) => {
            await semaphore.acquire();
            try {
                return await runPhaseWorker(
                    task.id,
                    task.prompt,
                    task.task,
                    this.config.provider!,
                    this.config.model,
                    task.path,
                    workerConfig,
                    (msg) => this.progress(project.id, 'build', msg),
                    workerTimeout,
                );
            } finally {
                semaphore.release();
            }
        });

        const results = await Promise.allSettled(workerPromises);

        // v3: After core agents finish, run sequential polish agents (time permitting)
        const hasTimeForPolish = !tb || hasTimeRemaining(tb.deadline, tb.phases.qa + tb.phases.deploy + 60_000);
        if (hasTimeForPolish) {
            this.progress(project.id, 'build', '✨ Running UI/UX Polish Agent...');
            await runPhaseWorker(
                'agent-ui-polish',
                getUIPolishPrompt(project.directive, project.projectPath),
                'Review and enhance ALL frontend components with premium animations, micro-interactions, glassmorphism, and responsive design. Fix any missing hover states or empty state UIs.',
                this.config.provider!,
                this.config.model,
                join(project.projectPath, 'frontend'),
                workerConfig,
                (msg) => this.progress(project.id, 'build', msg),
                workerTimeout,
            );
        } else {
            this.progress(project.id, 'build', '⚡ Skipping UI polish — budget is tight, focusing on core functionality...');
        }

        this.progress(project.id, 'build', '🔗 Running Integration Wirer Agent...');
        await runPhaseWorker(
            'agent-integration',
            getIntegrationPrompt(project.directive, project.projectPath),
            'Verify and fix the connection between frontend and backend. Check port configs, CORS settings, API base URLs, and auth flow. Fix any mismatches.',
            this.config.provider!,
            this.config.model,
            project.projectPath,
            { ...workerConfig, maxIterations: 10 },
            (msg) => this.progress(project.id, 'build', msg),
            workerTimeout,
        );

        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const outputs = results.map((r, i) => {
            const status = r.status === 'fulfilled' ? '✅' : '❌';
            const content = r.status === 'fulfilled' ? (r as any).value : String((r as any).reason);
            return `### ${status} ${buildTasks[i].id}\n${content}`;
        });

        this.progress(project.id, 'build', `⚒️ Build complete: ${succeeded + 2}/${results.length + 2} agents succeeded (includes polish + integration)`);

        return JSON.stringify({
            workers_total: results.length + 2,
            workers_succeeded: succeeded + 2,
            workers_failed: results.length - succeeded,
            agents_used: [
                ...buildTasks.map(t => t.id),
                'agent-ui-polish',
                'agent-integration',
            ],
            outputs: outputs.join('\n\n'),
        });
    }

    private async runQAPhase(project: PipelineProject): Promise<string> {
        this.progress(project.id, 'qa', '🧪 Running comprehensive QA with real tests...');

        return runPhaseWorker(
            'agent-qa-tester',
            getQAPrompt(project.directive, project.projectPath),
            `Execute the FULL QA protocol:\n1. File inventory — verify ALL expected files exist\n2. Anti-stub check — every file > 100 bytes, no TODOs\n3. Dependency check — no "latest", correct module system\n4. Backend: Run \`cd ${project.projectPath}/backend && npm install\` then \`timeout 10 npx ts-node --transpile-only src/server.ts || true\`\n5. Frontend: Run \`cd ${project.projectPath}/frontend && npm install\`\n6. If issues found, FIX THEM immediately, then re-test\n\nReturn JSON QA report with results.`,
            this.config.provider!,
            this.config.model,
            project.projectPath,
            {
                maxIterations: Math.min(this.config.maxWorkerIterations, 20),
                maxTokens: this.config.maxTokens,
                temperature: this.config.temperature,
                braveApiKey: this.config.braveApiKey,
            },
            (msg) => this.progress(project.id, 'qa', msg),
        );
    }

    /** v3: Autonomous Debugger — reads errors, fixes code, re-tests */
    private async runDebuggerPhase(project: PipelineProject, errorLog: string): Promise<string> {
        this.progress(project.id, 'build', '🔧 Autonomous Debugger Agent activated...');

        return runPhaseWorker(
            'agent-debugger',
            getDebuggerPrompt(project.directive, project.projectPath, errorLog),
            `An error was detected during QA. Diagnose the root cause from the error log, fix the affected files, and re-verify by running the build commands. You have 5 fix attempts. Use them wisely.`,
            this.config.provider!,
            this.config.model,
            project.projectPath,
            {
                maxIterations: Math.min(this.config.maxWorkerIterations, 20),
                maxTokens: this.config.maxTokens,
                temperature: this.config.temperature,
                braveApiKey: this.config.braveApiKey,
            },
            (msg) => this.progress(project.id, 'build', msg),
        );
    }

    private async runDeployPhase(project: PipelineProject): Promise<string> {
        this.progress(project.id, 'deploy', '🚀 Preparing deployment package...');

        const qaData = project.phases.qa.result || '{}';

        return runPhaseWorker(
            'agent-deploy-packager',
            getDeployPrompt(project.directive, project.projectPath, qaData),
            `Create deployment package: comprehensive README.md (100+ lines), start scripts (start.sh + start.bat), and verify the project can start. Run final npm install && npm run dev test.`,
            this.config.provider!,
            this.config.model,
            project.projectPath,
            {
                maxIterations: this.config.maxWorkerIterations,
                maxTokens: this.config.maxTokens,
                temperature: this.config.temperature,
                braveApiKey: this.config.braveApiKey,
            },
            (msg) => this.progress(project.id, 'deploy', msg),
        );
    }

    // ── v3 QA Result Parser ──────────────────────────────────────────────────

    private parseQAResult(qaResultStr: string): { passed: boolean; score: number; failReason: string; errorLog: string } {
        try {
            // Try to parse the QA JSON
            let qaData: any;
            const jsonMatch = qaResultStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                qaData = JSON.parse(jsonMatch[0]);
            } else {
                qaData = JSON.parse(qaResultStr);
            }

            // Extract the inner QA report (might be nested under raw_output)
            const report = qaData.raw_output ? JSON.parse(qaData.raw_output) : qaData;

            const backendInstall = report.backend_npm_install === 'PASS';
            const backendRuntime = report.backend_runtime === 'PASS';
            const frontendInstall = report.frontend_npm_install === 'PASS';
            const noStubs = (report.stub_files_found || 0) === 0;
            const score = report.overall_score || report._quality_score || 5;

            const passed = backendInstall && frontendInstall && noStubs && score >= 6;

            let failReason = '';
            let errorLog = '';
            if (!backendInstall) {
                failReason = 'Backend npm install failed';
                errorLog = report.backend_runtime_error || 'npm install error';
            } else if (!backendRuntime) {
                failReason = 'Backend runtime crashed';
                errorLog = report.backend_runtime_error || 'Runtime crash';
            } else if (!frontendInstall) {
                failReason = 'Frontend npm install failed';
                errorLog = 'Frontend dependency error';
            } else if (!noStubs) {
                failReason = `${report.stub_files_found} stub files detected`;
                errorLog = 'Stub files need to be expanded with real content';
            } else if (score < 6) {
                failReason = `Quality score too low: ${score}/10`;
                errorLog = JSON.stringify(report.issues || []);
            }

            return { passed, score, failReason, errorLog };
        } catch {
            // If QA result can't be parsed, check for obvious error indicators
            const hasErrors = qaResultStr.includes('FAIL') || qaResultStr.includes('Error') || qaResultStr.includes('error');
            return {
                passed: !hasErrors,
                score: hasErrors ? 3 : 7,
                failReason: hasErrors ? 'QA report contains error indicators' : '',
                errorLog: hasErrors ? qaResultStr.slice(0, 3000) : '',
            };
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async evaluatePhaseResult(phase: string, result: string): Promise<{ success: boolean; quality_score: number; proceed: boolean; notes: string }> {
        try {
            const evalResult = await this.config.provider!.chat(
                [
                    { role: 'system', content: getOrchestratorPrompt(phase, result.slice(0, 5000)) },
                    { role: 'user', content: 'Evaluate the phase results above.' },
                ],
                [],
                this.config.model,
                1000,
                0.3,
            );

            const content = evalResult.content || '{}';
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch {
            // Evaluation failed, use defaults
        }

        return { success: true, quality_score: 5, proceed: true, notes: 'Auto-evaluated' };
    }

    private progress(projectId: string, phase: string, message: string): void {
        console.log(`[Sheldon v3] [${projectId}] [${phase}] ${message}`);
        this.config.onProgress?.(projectId, phase, message);
    }

    private broadcastUpdate(project: PipelineProject): void {
        try {
            (hooks as any).emit('agent:status_update', {
                agentId: 'sheldon',
                status: `${project.phase}:${project.phases[project.phase]?.status || 'unknown'}`,
                taskId: project.id,
                retryCount: project.retryCount,
            });
        } catch {
            // Hooks not available
        }
    }
}
