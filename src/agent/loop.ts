/**
 * Agent Loop — the core processing engine.
 * TypeScript equivalent of nanobot's AgentLoop: the heart of the system.
 *
 * Flow: Receive message → Build context → Call LLM → Execute tools → Loop → Send response
 *
 * Improvements over nanobot:
 * - Browser tool integration (Playwright)
 * - SecurityGuard checks on every URL navigation and command execution
 * - Typed tool calls and responses
 * - Progress streaming via callback
 */

import { MessageBus, InboundMessage, OutboundMessage, createOutbound, sessionKey } from '../bus/index.js';
import { ContextBuilder } from './context.js';
import { MemoryStore } from './memory.js';
import { ToolRegistry, ExecTool, ReadFileTool, WriteFileTool, EditFileTool, ListDirTool, WebSearchTool, WebFetchTool, MessageTool, BrowseTool, SpawnTool, createApplyPatchTool, FindUsagesTool, CodeAnalysisTool, CodeDiffTool, GitHubTool, SwarmTool, TimeTravelTool, SkillFusionTool } from '../tools/index.js';
import { TimelineRecorder } from './timeline-recorder.js';
import { FusionEngine } from './fusion-engine.js';
import { SecurityGuard } from '../security/guard.js';
import { SessionManager } from '../session/manager.js';
import { LLMProvider, LLMResponse, ChatMessage, hasToolCalls } from '../providers/index.js';
import { Database } from '../db/database.js';
import type { Config } from '../config/schema.js';
import { resolvePrimaryModel } from '../config/schema.js';
import { RateLimiter } from '../security/rate-limiter.js';
import { hooks } from '../hooks/index.js';

export class AgentLoop {
    private bus: MessageBus;
    private provider: LLMProvider;
    private db: Database;
    private workspace: string;
    private agentId: string = 'agent-001'; // Default as Atlas
    private model: string;
    private maxIterations: number;
    private temperature: number;
    private maxTokens: number;
    private memoryWindow: number;
    private pruningEnabled: boolean;
    private pruningMax: number;
    private pruningKeep: number;

    private context: ContextBuilder;
    private sessions: SessionManager;
    private tools: ToolRegistry;
    private security: SecurityGuard;
    private memory: MemoryStore;
    private rateLimiter: RateLimiter | null;
    private running = false;
    private consolidating = new Set<string>();
    private timeline: TimelineRecorder;
    private fusion: FusionEngine;

    constructor(
        bus: MessageBus,
        provider: LLMProvider,
        db: Database,
        workspace: string,
        config: Config,
    ) {
        this.bus = bus;
        this.provider = provider;
        this.db = db;
        this.workspace = workspace;
        this.model = resolvePrimaryModel(config.agents.defaults.model);
        this.maxIterations = config.agents.defaults.maxIterations;
        this.temperature = config.agents.defaults.temperature;
        this.maxTokens = config.agents.defaults.maxTokens;
        this.memoryWindow = config.agents.defaults.memoryWindow;
        this.pruningEnabled = config.agents.defaults.sessionPruning.enabled;
        this.pruningMax = config.agents.defaults.sessionPruning.maxMessages;
        this.pruningKeep = config.agents.defaults.sessionPruning.keepLast;
        this.rateLimiter = config.agents.defaults.rateLimiting.enabled
            ? new RateLimiter({
                capacity: config.agents.defaults.rateLimiting.capacity,
                refillRate: config.agents.defaults.rateLimiting.refillRate,
            })
            : null;

        this.context = new ContextBuilder(workspace, db);
        this.sessions = new SessionManager(workspace);
        this.tools = new ToolRegistry();
        this.security = new SecurityGuard(config.security);
        this.memory = new MemoryStore(workspace);

        this.timeline = new TimelineRecorder(db);
        this.fusion = new FusionEngine(db);

        this.registerDefaultTools(config);

        // Log fallback notices to console
        hooks.on('model:fallback', (e) => {
            console.warn(`[loop] ↪️ Model fallback: ${e.payload.primaryModel} → ${e.payload.fallbackModel} (${e.payload.reason})`);
        });
    }

    private registerDefaultTools(config: Config): void {
        const allowedDir = config.tools.restrictToWorkspace ? this.workspace : null;

        // File tools
        this.tools.register(new ReadFileTool(this.workspace, allowedDir));
        this.tools.register(new WriteFileTool(this.workspace, allowedDir));
        this.tools.register(new EditFileTool(this.workspace, allowedDir));
        this.tools.register(new ListDirTool(this.workspace, allowedDir));

        // Shell
        this.tools.register(new ExecTool(
            this.workspace,
            config.tools.execTimeout,
            config.tools.restrictToWorkspace,
        ));

        // Web
        this.tools.register(new WebSearchTool(config.providers.brave?.apiKey));
        this.tools.register(new WebFetchTool());

        // Browser (NexusClaw exclusive)
        if (config.browser.enabled) {
            this.tools.register(new BrowseTool(
                config.browser.headless,
                config.browser.timeout,
            ));
        }

        // Message
        this.tools.register(new MessageTool(
            (msg: OutboundMessage) => this.bus.publishOutbound(msg),
        ));

        // Spawn
        this.tools.register(new SpawnTool(async (req) => {
            const msg: InboundMessage = {
                channel: 'system',
                senderId: 'subagent',
                chatId: `${req.channel}:${req.chatId}`,
                content: req.task,
                timestamp: new Date(),
                media: [],
                metadata: {},
            };
            await this.bus.publishInbound(msg);
        }));

        // Apply Patch tool for code modifications
        this.tools.register(createApplyPatchTool(this.workspace));

        // ── Extreme Features ─────────────────────────────────────────────────
        // Code Intelligence: find usages, complexity, diffs
        this.tools.register(new FindUsagesTool(this.workspace));
        this.tools.register(new CodeAnalysisTool(this.workspace));
        this.tools.register(new CodeDiffTool(this.workspace));

        // GitHub Integration: real REST API for PRs, issues, branches
        const githubToken = config.providers?.github?.apiKey || process.env.GITHUB_TOKEN;
        this.tools.register(new GitHubTool(githubToken));

        // Parallel Swarm Engine: true 15x parallel multi-agent execution
        this.tools.register(new SwarmTool({
            provider: this.provider,
            model: this.model,
            workspace: this.workspace,
            maxIterations: Math.min(this.maxIterations, 8), // cap sub-agent iterations
            maxTokens: this.maxTokens,
            temperature: this.temperature,
            githubToken,
            braveApiKey: config.providers.brave?.apiKey,
            onProgress: (taskId, msg) => {
                console.log(`[swarm] ${msg}`);
            },
        }));
        // Time-Travel Debugging: view/rewind/fork/compare timelines
        this.tools.register(new TimeTravelTool(this.db));

        // Skill Fusion: dynamic skill sharing between agents
        this.tools.register(new SkillFusionTool(this.fusion));
    }

    /** Run the agent loop — process messages from the bus */
    async run(): Promise<void> {
        this.running = true;

        // Reset stale UI/Agent states before starting the loop
        this.db.cleanupStaleState();

        console.log('🐾 NexusClaw agent loop started');

        while (this.running) {
            try {
                const msg = await this.bus.consumeInbound(1000);
                try {
                    const response = await this.processNexusInbound(msg);
                    if (response) {
                        await this.bus.publishOutbound(response);
                    }
                } catch (err) {
                    console.error('Error processing message:', err instanceof Error ? err.message : String(err));
                    await this.bus.publishOutbound(createOutbound(
                        msg.channel,
                        msg.chatId,
                        `Sorry, I encountered an error: ${err instanceof Error ? err.message : String(err)}`,
                    ));
                }
            } catch {
                // Timeout — no message, continue loop
                continue;
            }
        }
    }

    stop(): void {
        this.running = false;
        console.log('🐾 NexusClaw agent loop stopping');
    }

    /** Process a message directly (for CLI mode) using the Nexus engine */
    async nexusDirect(
        content: string,
        channel: string = 'cli',
        chatId: string = 'direct',
        onProgress?: (text: string) => Promise<void>,
    ): Promise<{ content: string; routedAgentId?: string }> {
        const msg: InboundMessage = {
            channel,
            senderId: 'user',
            chatId,
            content,
            timestamp: new Date(),
            media: [],
            metadata: {},
        };

        const response = await this.processNexusInbound(msg, onProgress);
        return {
            content: response?.content || '',
            routedAgentId: msg.metadata.routedAgentId as string | undefined,
        };
    }

    /**
     * Main entry point for processing incoming messages through the Nexus engine.
     */
    async processNexusInbound(
        msg: InboundMessage,
        onProgress?: (text: string) => Promise<void>,
    ): Promise<OutboundMessage | null> {
        const preview = msg.content.length > 80
            ? msg.content.slice(0, 80) + '...'
            : msg.content;
        console.log(`📩 [${msg.channel}:${msg.senderId}] ${preview}`);

        const key = sessionKey(msg);
        const session = this.sessions.getOrCreate(key);

        // ── Rate limiting ────────────────────────────────────────────────────────
        if (this.rateLimiter) {
            const outcome = this.rateLimiter.consume(msg.channel, msg.senderId);
            if (!outcome.allowed) {
                return createOutbound(msg.channel, msg.chatId, this.rateLimiter.buildBlockMessage(outcome));
            }
            if (outcome.warning) {
                // Non-blocking — we'll append this to the reply below instead
            }
        }

        // ── Hook: message received ───────────────────────────────────────────────
        await hooks.emit('message:received', {
            channel: msg.channel,
            chatId: msg.chatId,
            senderId: msg.senderId,
            content: msg.content,
            timestamp: msg.timestamp,
        });

        // ── Slash commands for session management ────────────────────────────────
        const cmd = msg.content.trim().toLowerCase();
        if (cmd === '/new' || cmd === '/reset') {
            session.clear();
            this.sessions.save(session);
            return createOutbound(msg.channel, msg.chatId, '✨ New session started. Previous context cleared.');
        }
        if (cmd === '/help') {
            return createOutbound(msg.channel, msg.chatId,
                '🐾 **NexusClaw Commands:**\n' +
                '`/new` or `/reset` — Clear conversation context\n' +
                '`/help` — Show this help\n' +
                '`/status` — Show agent status + token estimate\n' +
                '`/compact` — Summarize & compress session context\n' +
                '`/think low|high|off` — Set thinking depth\n' +
                '`/verbose on|off` — Toggle verbose tool output\n'
            );
        }
        if (cmd === '/status') {
            const msgCount = session.messages.length;
            const tokenEst = session.messages.reduce((acc, m) =>
                acc + Math.ceil(m.content.length / 4), 0);
            const mem = this.memory.getMemory();
            return createOutbound(msg.channel, msg.chatId,
                `🐾 **NexusClaw Status**\n` +
                `Model: \`${this.model}\`\n` +
                `Session messages: ${msgCount}\n` +
                `~Token estimate: ${tokenEst.toLocaleString()}\n` +
                `Memory: ${mem ? `${Math.ceil(mem.length / 4)} tokens` : 'empty'}\n` +
                `Tools (${this.tools.toolNames.length}): ${this.tools.toolNames.join(', ')}\n` +
                `Max iterations: ${this.maxIterations}\n`
            );
        }
        if (cmd === '/compact') {
            if (session.messages.length < 5) {
                return createOutbound(msg.channel, msg.chatId, '📦 Session too short to compact (need 5+ messages).');
            }
            try {
                await this.memory.consolidate(session, this.provider, this.model);
                const kept = Math.min(10, session.messages.length);
                session.messages = session.messages.slice(-kept);
                session.lastConsolidated = 0;
                this.sessions.save(session);
                return createOutbound(msg.channel, msg.chatId,
                    `📦 Session compacted. Kept last ${kept} messages. Memory updated.`);
            } catch {
                return createOutbound(msg.channel, msg.chatId, '❌ Compact failed. Try again later.');
            }
        }
        if (cmd.startsWith('/think ')) {
            const level = cmd.slice(7).trim() as 'off' | 'low' | 'high';
            if (!['off', 'low', 'high'].includes(level)) {
                return createOutbound(msg.channel, msg.chatId, '❌ Usage: `/think off|low|high`');
            }
            (session as any).thinkingLevel = level;
            this.sessions.save(session);
            const hint = level === 'off' ? 'Thinking disabled.' : level === 'low' ? 'Light reasoning enabled.' : 'Deep thinking enabled.';
            return createOutbound(msg.channel, msg.chatId, `🧠 ${hint}`);
        }
        if (cmd.startsWith('/verbose ')) {
            const toggle = cmd.slice(9).trim();
            (session as any).verbose = toggle === 'on';
            this.sessions.save(session);
            return createOutbound(msg.channel, msg.chatId,
                `🔊 Verbose mode: **${toggle === 'on' ? 'ON' : 'OFF'}**`);
        }

        // Memory consolidation (background)
        if (session.messages.length > this.memoryWindow && !this.consolidating.has(key)) {
            this.consolidating.add(key);
            this.memory.consolidate(session, this.provider, this.model)
                .finally(() => this.consolidating.delete(key));
        }

        // Progress callback (moved up for agent routing)
        const progressFn = onProgress || (async (content: string) => {
            await this.bus.publishOutbound(createOutbound(
                msg.channel,
                msg.chatId,
                content,
                { metadata: { _progress: true } },
            ));
        });

        // ── Dynamic Agent Routing (Zero-Process Persona Switching) ──
        const allAgents = this.db.getAgents();
        const contentLower = msg.content.toLowerCase();
        let routedAgentId: string | null = null;

        // First priority: Check if chatId explicitly specifies an agent (e.g., "dashboard:agent:agent-003" or "agent:agent-003")
        const chatIdMatch = msg.chatId.match(/agent:(agent-\d+)$/);
        console.log(`[loop] 🔎 ChatId: ${msg.chatId}, Match: ${chatIdMatch ? chatIdMatch[1] : 'none'}`);
        if (chatIdMatch) {
            const targetAgentId = chatIdMatch[1];
            const targetAgent = this.db.getAgent(targetAgentId);
            if (targetAgent) {
                routedAgentId = targetAgentId;
                console.log(`[loop] 🎯 ChatId routing: ${targetAgent.name} (${targetAgentId})`);
                if ((session as any).agentId !== targetAgentId) {
                    (session as any).agentId = targetAgentId;
                    this.sessions.save(session);
                    if (progressFn) {
                        await progressFn(`🔄 **Routing to agent:** ${targetAgent.name} (${targetAgent.role})`);
                    }
                }
            }
        }

        // Second priority: Check message content for agent mentions (always check, even if chatId matched)
        const mentionedAgents: string[] = [];
        for (const agent of allAgents) {
            // Match "@elena", "use elena", "ask elena", or just "elena" as a distinct word
            const mentionRegex = new RegExp(`\\b(?:use|ask|@)?\\s*${agent.name}\\b`, 'i');
            if (mentionRegex.test(contentLower)) {
                mentionedAgents.push(agent.id);
                console.log(`[loop] 🎯 Agent mention detected: ${agent.name} (${agent.id})`);
                console.log(`[loop] 🔍 Debug: routedAgentId=${routedAgentId}, session.agentId=${(session as any).agentId}, agent.id=${agent.id}`);
                // ALWAYS route to mentioned agent, even if chatId routing happened
                // This allows mentioning other agents while in a specific agent's chat
                if ((session as any).agentId !== agent.id) {
                    (session as any).agentId = agent.id;
                    // DON'T clear session - just switch the agent identity
                    // Clearing removes all context and causes empty responses
                    this.sessions.save(session);
                    routedAgentId = agent.id; // Override any previous routing
                    console.log(`[loop] ✅ Routed to agent: ${agent.name} (${agent.id})`);
                    if (progressFn) {
                        await progressFn(`🔄 **Routing to agent:** ${agent.name} (${agent.role})`);
                    }
                } else {
                    console.log(`[loop] ⚠️ Routing skipped: already on this agent`);
                }
            }
        }

        // Trigger meeting presence for all mentioned agents
        if (mentionedAgents.length > 0) {
            for (const agentId of mentionedAgents) {
                this.db.updateAgent(agentId, { status: 'meeting' });
                hooks.emit('agent:status_update', { agentId, status: 'meeting', taskId: null });
            }
        }

        // Determine which agent is assigned to this session (fallback to default Atlas/Cipher)
        const activeAgentId = (session as any).agentId || this.agentId;
        const activeAgent = this.db.getAgent(activeAgentId) || allAgents[0];

        // Store the routed agent ID in metadata ONLY if explicitly routed, otherwise use activeAgentId
        // This ensures that when an agent is mentioned, we use that agent's ID for the response
        msg.metadata.routedAgentId = routedAgentId;
        console.log(`[loop] 📝 Active agent: ${activeAgent?.name} (${activeAgentId}), Routed: ${routedAgentId || 'none'}`);

        // Set tool context
        const messageTool = this.tools.get('message');
        if (messageTool instanceof MessageTool) {
            messageTool.setContext(msg.channel, msg.chatId);
            messageTool.startTurn();
        }

        const spawnTool = this.tools.get('spawn');
        if (spawnTool instanceof SpawnTool) {
            spawnTool.setContext(msg.channel, msg.chatId);
        }

        // Build messages
        const initialMessages = this.context.buildMessages({
            history: session.getHistory(this.memoryWindow) as any,
            currentMessage: msg.content,
            channel: msg.channel,
            chatId: msg.chatId,
            agentName: activeAgent?.name,
            agentRole: activeAgent?.role,
        });

        console.log(`[loop] 📋 Building context: ${initialMessages.length} messages, agent: ${activeAgent?.name}, history: ${session.messages.length} msgs`);

        // Determine taskId
        let taskId = msg.metadata.taskId as string | undefined;
        if (!taskId) {
            // Create a "Ghost Task" for transient sessions (Telegram/CLI) to trigger UI feedback
            taskId = this.db.createTask({
                title: msg.channel === 'telegram' ? 'Telegram Assignment' : 'Direct Directive',
                description: msg.content.slice(0, 100),
                status: 'in_progress',
                assigned_agent_id: activeAgentId,
                department_id: activeAgent?.department_id || 'development',
                task_type: 'general',
                project_path: this.workspace
            });
            msg.metadata.taskId = taskId;

            // Broadcast task creation for UI reactivity
            hooks.emit('task:created', {
                taskId,
                title: msg.channel === 'telegram' ? 'Telegram Assignment' : 'Direct Directive',
                assignedAgentId: activeAgentId
            });
        }

        // Update agent status to working and link to taskId
        this.db.updateAgent(activeAgentId, { status: 'working', current_task_id: taskId });
        hooks.emit('agent:status_update', { agentId: activeAgentId, status: 'working', taskId });

        // Run Nexus execution cycle
        const { content: finalContent, toolsUsed } = await this.executeNexusCycle(
            initialMessages,
            msg, // Pass msg here
            progressFn,
        );

        const responseText = finalContent || "I've completed processing but have no response.";
        console.log(`[loop] 💭 LLM Response: ${responseText.substring(0, 150)}`);

        // Reward XP and set back to idle for the active agent
        if (activeAgent) {
            this.db.updateAgent(activeAgent.id, {
                status: 'idle',
                current_task_id: null,
                xp: (activeAgent.xp || 0) + 10,
                tasks_completed: (activeAgent.tasks_completed || 0) + (toolsUsed.length > 0 ? 1 : 0)
            });
            hooks.emit('agent:status_update', { agentId: activeAgent.id, status: 'idle', taskId: null });
        }

        // Save to session
        session.addMessage('user', msg.content);
        session.addMessage('assistant', responseText, {
            toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
        });
        this.sessions.save(session);

        // ── Auto session pruning with memory consolidation ──
        if (this.pruningEnabled && session.messages.length > this.pruningMax) {
            const pruneKey = `prune:${key}`;
            if (!this.consolidating.has(pruneKey)) {
                this.consolidating.add(pruneKey);
                this.memory.consolidate(session, this.provider, this.model)
                    .then(() => {
                        session.messages = session.messages.slice(-this.pruningKeep);
                        session.lastConsolidated = 0;
                        this.sessions.save(session);
                        console.log(`[loop] 📦 Session pruned: kept ${this.pruningKeep} of ${session.messages.length + this.pruningKeep} messages`);
                    })
                    .finally(() => this.consolidating.delete(pruneKey));
            }
        }

        // ── Hook: agent reply ──
        await hooks.emit('agent:reply', {
            channel: msg.channel,
            chatId: msg.chatId,
            content: responseText,
            toolsUsed,
        });

        // If message tool already sent response, don't send again
        if (messageTool instanceof MessageTool && messageTool.sentInTurn) {
            return null;
        }

        // ── Dashboard agent mention handling ──
        // If we're on dashboard and an agent was routed, just return the response
        // The API will handle adding the message to DB and broadcasting it
        if (msg.channel === 'dashboard' && routedAgentId && activeAgent) {
            console.log(`[loop] 📨 Dashboard routing: returning response for ${activeAgent.name}`);
            // Return the response so the API can use it
            return createOutbound(msg.channel, msg.chatId, responseText, {
                metadata: msg.metadata,
            });
        }

        return createOutbound(msg.channel, msg.chatId, responseText, {
            metadata: msg.metadata,
        });
    }

    /**
     * Core execution cycle for the Nexus agent.
     */
    private async executeNexusCycle(
        messages: ChatMessage[],
        msg: InboundMessage,
        onProgress: (text: string) => Promise<void>,
    ): Promise<{ content: string | null; toolsUsed: string[] }> {
        let currentMessages = [...messages];
        let iteration = 0;
        let finalContent: string | null = null;
        const toolsUsed: string[] = [];
        const taskId = msg.metadata.taskId as string | undefined;

        // Start timeline recording
        const activeAgentId = (msg.metadata as any).routedAgentId || this.agentId;
        const tlId = this.timeline.startTimeline(
            sessionKey(msg),
            activeAgentId,
            this.model,
        );
        this.timeline.recordSnapshot(currentMessages);

        while (iteration < this.maxIterations) {
            iteration++;

            const response = await this.provider.chat(
                currentMessages,
                this.tools.getDefinitions() as any,
                this.model,
                this.maxTokens,
                this.temperature,
            );

            // Record LLM call + response on the timeline
            this.timeline.recordLLMCall(this.model, currentMessages.length, this.tools.size);

            if (hasToolCalls(response)) {
                // Record LLM response with tool call info
                this.timeline.recordLLMResponse(
                    response.content,
                    true,
                    response.toolCalls.map(tc => tc.name),
                );
                // Stream progress
                const cleaned = this.stripThink(response.content);
                if (cleaned) await onProgress(cleaned);
                await onProgress(this.toolHint(response));

                // Add assistant message with tool calls
                const toolCallDicts = response.toolCalls.map(tc => ({
                    id: tc.id,
                    type: 'function' as const,
                    function: {
                        name: tc.name,
                        arguments: JSON.stringify(tc.arguments),
                    },
                }));

                currentMessages = this.context.addAssistantMessage(
                    currentMessages,
                    response.content,
                    toolCallDicts,
                );

                // Execute each tool
                for (const tc of response.toolCalls) {
                    toolsUsed.push(tc.name);
                    console.log(`🔧 ${tc.name}(${JSON.stringify(tc.arguments).slice(0, 100)})`);

                    // Security check for browse tool
                    if (tc.name === 'browse' && tc.arguments.url) {
                        const check = this.security.checkUrl(String(tc.arguments.url));
                        if (!check.allowed) {
                            if (taskId) this.db.addTaskLog(taskId, 'security', `🚫 URL Denied: ${tc.arguments.url}`);
                            currentMessages = this.context.addToolResult(
                                currentMessages,
                                tc.id,
                                tc.name,
                                `🚫 ${check.reason}`,
                            );
                            continue;
                        }
                    }

                    // Security check for exec tool
                    if (tc.name === 'exec' && tc.arguments.command) {
                        const check = this.security.checkCommand(String(tc.arguments.command));
                        if (!check.allowed) {
                            if (taskId) this.db.addTaskLog(taskId, 'security', `🚫 Command Denied: ${tc.arguments.command}`);
                            currentMessages = this.context.addToolResult(
                                currentMessages,
                                tc.id,
                                tc.name,
                                `🚫 ${check.reason}`,
                            );
                            continue;
                        }
                    }

                    const toolStart = Date.now();
                    const result = await this.tools.execute(tc.name, tc.arguments);
                    const toolDuration = Date.now() - toolStart;

                    // Record tool call and result on timeline
                    this.timeline.recordToolCall(tc.name, tc.arguments);
                    this.timeline.recordToolResult(tc.name, result, toolDuration);

                    // Record task log if taskId is present
                    if (taskId) {
                        this.db.addTaskLog(taskId, 'tool', `🔧 ${tc.name}: ${result.slice(0, 500)}`);
                    }

                    currentMessages = this.context.addToolResult(
                        currentMessages,
                        tc.id,
                        tc.name,
                        result,
                    );
                }
            } else {
                // No tool calls — final response
                finalContent = this.stripThink(response.content);

                // Record final LLM response
                this.timeline.recordLLMResponse(finalContent, false, []);
                this.timeline.recordSnapshot(currentMessages);

                // Record completion if taskId is present
                if (taskId && finalContent) {
                    this.db.addTaskLog(taskId, 'agent', `✅ Final: ${finalContent.slice(0, 500)}`);
                    this.db.updateTask(taskId, { status: 'done', completed_at: Date.now() });
                }
                break;
            }
        }

        // Complete the timeline
        this.timeline.completeTimeline();

        return { content: finalContent, toolsUsed };
    }

    /** Remove <think>…</think> blocks from model output */
    private stripThink(text: string | null): string | null {
        if (!text) return null;
        return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim() || null;
    }

    /** Format tool calls as concise hint */
    private toolHint(response: LLMResponse): string {
        return response.toolCalls.map(tc => {
            const firstVal = Object.values(tc.arguments)[0];
            if (typeof firstVal === 'string') {
                const display = firstVal.length > 40 ? firstVal.slice(0, 40) + '…' : firstVal;
                return `${tc.name}("${display}")`;
            }
            return tc.name;
        }).join(', ');
    }
}
