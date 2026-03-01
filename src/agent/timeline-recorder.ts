/**
 * Timeline Recorder — Records every agent decision, tool call, and state change.
 * The backbone of Time-Travel Debugging.
 *
 * Each execution session creates a "timeline" with sequential "events":
 *   - llm_call: what the LLM was asked and what it responded
 *   - tool_call: what tool was executed and its result
 *   - decision: branching points where the agent chose a path
 *   - state_snapshot: full message history at a point in time
 *   - fork: where a timeline was forked for parallel exploration
 *
 * Timelines can be:
 *   - Rewound: jump back to any event
 *   - Forked: create a new branch from any point and try a different approach
 *   - Replayed: re-execute from a point with modified parameters
 *   - Compared: diff two timelines (or forks) side-by-side
 */

import type { ChatMessage } from '../providers/base.js';
import type { Database } from '../db/database.js';

export type TimelineEventType =
    | 'llm_call'
    | 'llm_response'
    | 'tool_call'
    | 'tool_result'
    | 'decision'
    | 'state_snapshot'
    | 'fork'
    | 'error'
    | 'security_block';

export interface TimelineEvent {
    id: string;
    timelineId: string;
    sequence: number;
    type: TimelineEventType;
    timestamp: number;
    data: {
        // For llm_call
        model?: string;
        messageCount?: number;
        toolCount?: number;

        // For llm_response
        content?: string;
        hasToolCalls?: boolean;
        toolCallNames?: string[];

        // For tool_call / tool_result
        toolName?: string;
        toolArgs?: Record<string, unknown>;
        toolResult?: string;
        duration?: number;

        // For decision
        decisionType?: string;
        chosen?: string;
        alternatives?: string[];
        reason?: string;

        // For state_snapshot
        messages?: ChatMessage[];
        messageHash?: string;

        // For fork
        parentTimelineId?: string;
        forkPoint?: number;
        forkReason?: string;

        // For security_block
        blockedAction?: string;
        blockReason?: string;

        // For error
        error?: string;
        stack?: string;
    };
    metadata?: Record<string, unknown>;
}

export interface Timeline {
    id: string;
    sessionKey: string;
    parentId: string | null;      // null for root timeline, parent ID for forks
    forkPoint: number | null;     // event sequence where this was forked from
    agentId: string;
    model: string;
    status: 'recording' | 'completed' | 'forked' | 'rewound';
    eventCount: number;
    createdAt: number;
    completedAt: number | null;

    // Summary stats
    totalToolCalls: number;
    totalLlmCalls: number;
    totalErrors: number;
    totalDuration: number;
}

// ──────────────────────────────────────────────────────────────────────────────

export class TimelineRecorder {
    private currentTimeline: string | null = null;
    private sequence = 0;
    private events: TimelineEvent[] = [];
    private startTime = 0;
    private stats = { toolCalls: 0, llmCalls: 0, errors: 0 };

    constructor(private db: Database) { }

    /** Start recording a new timeline for a session */
    startTimeline(sessionKey: string, agentId: string, model: string, parentId?: string, forkPoint?: number): string {
        const id = `tl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        this.currentTimeline = id;
        this.sequence = 0;
        this.events = [];
        this.startTime = Date.now();
        this.stats = { toolCalls: 0, llmCalls: 0, errors: 0 };

        this.db.addTimeline({
            id,
            session_key: sessionKey,
            parent_id: parentId || null,
            fork_point: forkPoint ?? null,
            agent_id: agentId,
            model,
            status: 'recording',
            event_count: 0,
            total_tool_calls: 0,
            total_llm_calls: 0,
            total_errors: 0,
            total_duration: 0,
        });

        return id;
    }

    /** Record an event on the current timeline */
    record(type: TimelineEventType, data: TimelineEvent['data']): string {
        if (!this.currentTimeline) return '';

        this.sequence++;
        const eventId = `ev_${this.currentTimeline}_${this.sequence}`;
        const event: TimelineEvent = {
            id: eventId,
            timelineId: this.currentTimeline,
            sequence: this.sequence,
            type,
            timestamp: Date.now(),
            data,
        };

        this.events.push(event);

        // Update stats
        if (type === 'tool_call') this.stats.toolCalls++;
        if (type === 'llm_call') this.stats.llmCalls++;
        if (type === 'error') this.stats.errors++;

        // Persist event to DB
        this.db.addTimelineEvent({
            id: eventId,
            timeline_id: this.currentTimeline,
            sequence: this.sequence,
            type,
            timestamp: Date.now(),
            data: JSON.stringify(data),
        });

        return eventId;
    }

    /** Record an LLM call */
    recordLLMCall(model: string, messageCount: number, toolCount: number): string {
        return this.record('llm_call', { model, messageCount, toolCount });
    }

    /** Record an LLM response */
    recordLLMResponse(content: string | null, hasToolCalls: boolean, toolCallNames: string[]): string {
        return this.record('llm_response', {
            content: content?.slice(0, 2000) || undefined,
            hasToolCalls,
            toolCallNames,
        });
    }

    /** Record a tool call */
    recordToolCall(toolName: string, toolArgs: Record<string, unknown>): string {
        return this.record('tool_call', {
            toolName,
            toolArgs: truncateArgs(toolArgs),
        });
    }

    /** Record a tool result */
    recordToolResult(toolName: string, result: string, duration: number): string {
        return this.record('tool_result', {
            toolName,
            toolResult: result.slice(0, 3000),
            duration,
        });
    }

    /** Record a security block */
    recordSecurityBlock(action: string, reason: string): string {
        return this.record('security_block', {
            blockedAction: action,
            blockReason: reason,
        });
    }

    /** Record an error */
    recordError(error: string, stack?: string): string {
        return this.record('error', { error, stack: stack?.slice(0, 1000) });
    }

    /** Take a state snapshot (save full message history at this point) */
    recordSnapshot(messages: ChatMessage[]): string {
        // Hash the messages to detect state changes
        const hash = simpleHash(JSON.stringify(messages.map(m => m.content?.slice(0, 100))));
        return this.record('state_snapshot', {
            messageCount: messages.length,
            messageHash: hash,
            messages: messages.map(m => ({
                role: m.role,
                content: typeof m.content === 'string' ? m.content.slice(0, 500) : '(non-text)',
            })) as ChatMessage[],
        });
    }

    /** Record a fork point */
    recordFork(newTimelineId: string, reason: string): string {
        return this.record('fork', {
            parentTimelineId: this.currentTimeline!,
            forkPoint: this.sequence,
            forkReason: reason,
        });
    }

    /** Complete the current timeline */
    completeTimeline(): void {
        if (!this.currentTimeline) return;

        const duration = Date.now() - this.startTime;
        this.db.updateTimeline(this.currentTimeline, {
            status: 'completed',
            event_count: this.sequence,
            total_tool_calls: this.stats.toolCalls,
            total_llm_calls: this.stats.llmCalls,
            total_errors: this.stats.errors,
            total_duration: duration,
            completed_at: Date.now(),
        });

        this.currentTimeline = null;
    }

    /** Get current timeline ID */
    get activeTimeline(): string | null {
        return this.currentTimeline;
    }

    /** Get all events for the current timeline (in-memory) */
    get currentEvents(): TimelineEvent[] {
        return [...this.events];
    }

    /** Get events up to a specific sequence point */
    getEventsUpTo(sequence: number): TimelineEvent[] {
        return this.events.filter(e => e.sequence <= sequence);
    }

    /** Get the messages state at a specific event point (by rewinding) */
    getStateAtEvent(targetSequence: number): ChatMessage[] | null {
        // Find the latest snapshot at or before the target sequence
        const snapshots = this.events
            .filter(e => e.type === 'state_snapshot' && e.sequence <= targetSequence)
            .sort((a, b) => b.sequence - a.sequence);

        if (snapshots.length === 0) return null;
        return (snapshots[0].data.messages as ChatMessage[]) || null;
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash.toString(36);
}

function truncateArgs(args: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
        if (typeof v === 'string' && v.length > 500) {
            out[k] = v.slice(0, 500) + '…';
        } else {
            out[k] = v;
        }
    }
    return out;
}
