/**
 * Time-Travel Debugging Tool — Rewind, Fork, Replay, Compare agent timelines.
 *
 * Capabilities:
 *   - list_timelines: see all recorded execution timelines
 *   - view_timeline: see all events in a timeline
 *   - rewind: jump back to any event point in the timeline
 *   - fork: create a new timeline branch from any point
 *   - compare: diff two timelines side-by-side (decisions, tools, outcomes)
 *   - replay_from: get the message state at any point to re-execute
 */

import { Tool, ToolParameters } from './base.js';
import type { Database } from '../db/database.js';

export class TimeTravelTool extends Tool {
    constructor(private db: Database) { super(); }

    get name() { return 'time_travel'; }
    get description() {
        return 'Time-Travel Debugging: view execution timelines, rewind to any decision point, fork alternate timelines, ' +
            'compare outcomes. Actions: list_timelines, view_timeline, rewind, fork, compare, get_state. ' +
            'Use to debug agent failures, understand decision chains, and explore alternative approaches.';
    }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: 'Action: list_timelines | view_timeline | rewind | fork | compare | get_state | search_events',
                },
                timeline_id: { type: 'string', description: 'Timeline ID to operate on' },
                sequence: { type: 'number', description: 'Event sequence number (for rewind/fork/get_state)' },
                timeline_id_2: { type: 'string', description: 'Second timeline ID (for compare)' },
                reason: { type: 'string', description: 'Reason for forking (for fork)' },
                event_type: { type: 'string', description: 'Filter by event type (for search_events)' },
                limit: { type: 'number', description: 'Max results (default: 20)' },
            },
            required: ['action'],
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const action = String(params.action);
        const limit = Math.min(Number(params.limit || 20), 50);

        try {
            switch (action) {

                case 'list_timelines': {
                    const timelines = this.db.getTimelines(limit);
                    if (timelines.length === 0) return 'No timelines recorded yet. Timelines are automatically created when the agent processes messages.';
                    return [
                        '## 🕐 Execution Timelines',
                        '',
                        '| ID | Agent | Status | Events | Tools | LLM | Errors | Duration |',
                        '|---|---|---|---|---|---|---|---|',
                        ...timelines.map((t: any) => {
                            const dur = t.total_duration ? `${(Number(t.total_duration) / 1000).toFixed(1)}s` : '--';
                            const statusStr = String(t.status || 'unknown');
                            const icon = statusStr === 'completed' ? '✅' : statusStr === 'forked' ? '🍴' : statusStr === 'recording' ? '🔴' : '⏪';
                            const parent = t.parent_id ? ` (fork of ${String(t.parent_id).slice(0, 8)})` : '';
                            return `| \`${String(t.id).slice(0, 12)}\` | ${String(t.agent_id)}${parent} | ${icon} ${statusStr} | ${Number(t.event_count)} | ${Number(t.total_tool_calls)} | ${Number(t.total_llm_calls)} | ${Number(t.total_errors)} | ${dur} |`;
                        }),
                    ].join('\n');
                }

                case 'view_timeline': {
                    const tlId = String(params.timeline_id || '');
                    if (!tlId) return 'Error: timeline_id required';

                    const timeline = this.db.getTimeline(tlId);
                    if (!timeline) return `Timeline \`${tlId}\` not found.`;

                    const events = this.db.getTimelineEvents(tlId, limit);
                    const lines = [
                        `## 🕐 Timeline: \`${tlId}\``,
                        `**Agent:** ${(timeline as any).agent_id} | **Model:** ${(timeline as any).model} | **Status:** ${(timeline as any).status}`,
                        `**Events:** ${(timeline as any).event_count} | **Duration:** ${((timeline as any).total_duration / 1000).toFixed(1)}s`,
                        (timeline as any).parent_id ? `**Forked from:** \`${(timeline as any).parent_id}\` at event #${(timeline as any).fork_point}` : '',
                        '',
                        '### Event Timeline',
                    ];

                    for (const ev of events) {
                        const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
                        const time = new Date(ev.timestamp).toLocaleTimeString();
                        const icon = getEventIcon(ev.type);

                        switch (ev.type) {
                            case 'llm_call':
                                lines.push(`**#${ev.sequence}** ${icon} LLM Call → \`${data.model}\` (${data.messageCount} msgs, ${data.toolCount} tools) — ${time}`);
                                break;
                            case 'llm_response':
                                lines.push(`**#${ev.sequence}** ${icon} LLM Response → ${data.hasToolCalls ? `🔧 Tools: ${data.toolCallNames?.join(', ')}` : `💬 "${(data.content || '').slice(0, 100)}${(data.content || '').length > 100 ? '...' : ''}"`} — ${time}`);
                                break;
                            case 'tool_call':
                                lines.push(`**#${ev.sequence}** ${icon} Tool: \`${data.toolName}\`(${JSON.stringify(data.toolArgs || {}).slice(0, 80)}) — ${time}`);
                                break;
                            case 'tool_result':
                                lines.push(`**#${ev.sequence}** ${icon} Result: \`${data.toolName}\` → ${(data.toolResult || '').slice(0, 120)} (${data.duration}ms) — ${time}`);
                                break;
                            case 'state_snapshot':
                                lines.push(`**#${ev.sequence}** ${icon} Snapshot: ${data.messageCount} messages (hash: ${data.messageHash}) — ${time}`);
                                break;
                            case 'error':
                                lines.push(`**#${ev.sequence}** ${icon} ERROR: ${data.error} — ${time}`);
                                break;
                            case 'security_block':
                                lines.push(`**#${ev.sequence}** ${icon} BLOCKED: ${data.blockedAction} — ${data.blockReason} — ${time}`);
                                break;
                            case 'fork':
                                lines.push(`**#${ev.sequence}** ${icon} FORK → \`${data.parentTimelineId}\` — ${data.forkReason} — ${time}`);
                                break;
                            default:
                                lines.push(`**#${ev.sequence}** ${icon} ${ev.type}: ${JSON.stringify(data).slice(0, 100)} — ${time}`);
                        }
                    }

                    return lines.filter(Boolean).join('\n');
                }

                case 'rewind': {
                    const tlId = String(params.timeline_id || '');
                    const seq = Number(params.sequence);
                    if (!tlId || !seq) return 'Error: timeline_id and sequence required';

                    const events = this.db.getTimelineEvents(tlId, 1000);
                    const target = events.find((e: any) => e.sequence === seq);
                    if (!target) return `Event #${seq} not found in timeline \`${tlId}\`.`;

                    // Find closest state snapshot at or before this point
                    const snapshots = events
                        .filter((e: any) => e.type === 'state_snapshot' && e.sequence <= seq)
                        .sort((a: any, b: any) => b.sequence - a.sequence);

                    const eventsUpTo = events.filter((e: any) => e.sequence <= seq);
                    const toolCalls = eventsUpTo.filter((e: any) => e.type === 'tool_call');
                    const decisions = eventsUpTo.filter((e: any) => e.type === 'llm_response');

                    const lines = [
                        `## ⏪ Rewind to Event #${seq}`,
                        `**Timeline:** \`${tlId}\``,
                        `**Event:** ${target.type} at ${new Date(target.timestamp).toLocaleString()}`,
                        '',
                        `### State at this point`,
                        `- **Total events up to here:** ${eventsUpTo.length}`,
                        `- **Tool calls made:** ${toolCalls.length}`,
                        `- **LLM decisions:** ${decisions.length}`,
                    ];

                    if (snapshots.length > 0) {
                        const snap = snapshots[0];
                        const data = typeof snap.data === 'string' ? JSON.parse(snap.data) : snap.data;
                        lines.push(`- **Closest snapshot:** #${snap.sequence} (${data.messageCount} messages)`);
                        lines.push('');
                        lines.push('### Messages at snapshot:');
                        for (const msg of (data.messages || []).slice(-5)) {
                            lines.push(`- **${msg.role}:** ${(msg.content || '').slice(0, 150)}`);
                        }
                    }

                    lines.push('');
                    lines.push('### 💡 You can fork from this point to try a different approach:');
                    lines.push(`Use \`time_travel(action: "fork", timeline_id: "${tlId}", sequence: ${seq}, reason: "trying different approach")\``);

                    return lines.join('\n');
                }

                case 'fork': {
                    const tlId = String(params.timeline_id || '');
                    const seq = Number(params.sequence);
                    const reason = String(params.reason || 'manual fork');
                    if (!tlId) return 'Error: timeline_id required';

                    const timeline = this.db.getTimeline(tlId);
                    if (!timeline) return `Timeline \`${tlId}\` not found.`;

                    // Create fork record
                    const forkId = `tl_fork_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
                    this.db.addTimeline({
                        id: forkId,
                        session_key: (timeline as any).session_key,
                        parent_id: tlId,
                        fork_point: seq || (timeline as any).event_count,
                        agent_id: (timeline as any).agent_id,
                        model: (timeline as any).model,
                        status: 'forked',
                        event_count: 0,
                        total_tool_calls: 0,
                        total_llm_calls: 0,
                        total_errors: 0,
                        total_duration: 0,
                    });

                    // Update parent timeline
                    this.db.updateTimeline(tlId, { status: 'forked' });

                    return [
                        `## 🍴 Timeline Forked!`,
                        `**New Timeline:** \`${forkId}\``,
                        `**Forked from:** \`${tlId}\` at event #${seq || (timeline as any).event_count}`,
                        `**Reason:** ${reason}`,
                        '',
                        'The new timeline is ready. Any subsequent agent actions will be recorded on this fork.',
                        'You can compare this fork with the original using the `compare` action.',
                    ].join('\n');
                }

                case 'compare': {
                    const id1 = String(params.timeline_id || '');
                    const id2 = String(params.timeline_id_2 || '');
                    if (!id1 || !id2) return 'Error: timeline_id and timeline_id_2 required';

                    const tl1 = this.db.getTimeline(id1);
                    const tl2 = this.db.getTimeline(id2);
                    if (!tl1 || !tl2) return 'One or both timelines not found.';

                    const events1 = this.db.getTimelineEvents(id1, 200);
                    const events2 = this.db.getTimelineEvents(id2, 200);

                    const tools1 = events1.filter((e: any) => e.type === 'tool_call').map((e: any) => {
                        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                        return d.toolName;
                    });
                    const tools2 = events2.filter((e: any) => e.type === 'tool_call').map((e: any) => {
                        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                        return d.toolName;
                    });

                    const errors1 = events1.filter((e: any) => e.type === 'error').length;
                    const errors2 = events2.filter((e: any) => e.type === 'error').length;

                    const t1 = tl1 as any;
                    const t2 = tl2 as any;

                    return [
                        `## 🔀 Timeline Comparison`,
                        '',
                        '| Metric | Timeline A | Timeline B |',
                        '|--------|-----------|-----------|',
                        `| ID | \`${id1.slice(0, 12)}\` | \`${id2.slice(0, 12)}\` |`,
                        `| Status | ${t1.status} | ${t2.status} |`,
                        `| Events | ${t1.event_count} | ${t2.event_count} |`,
                        `| Duration | ${(t1.total_duration / 1000).toFixed(1)}s | ${(t2.total_duration / 1000).toFixed(1)}s |`,
                        `| Tool Calls | ${t1.total_tool_calls} | ${t2.total_tool_calls} |`,
                        `| LLM Calls | ${t1.total_llm_calls} | ${t2.total_llm_calls} |`,
                        `| Errors | ${errors1} | ${errors2} |`,
                        '',
                        '### Tool Usage Comparison',
                        `**Timeline A tools:** ${tools1.join(', ') || 'none'}`,
                        `**Timeline B tools:** ${tools2.join(', ') || 'none'}`,
                        '',
                        // Highlight differences
                        `### 🔍 Key Differences`,
                        t1.total_duration !== t2.total_duration
                            ? `- ⏱️ **Speed:** ${t1.total_duration < t2.total_duration ? 'A' : 'B'} was ${Math.abs(((t1.total_duration - t2.total_duration) / Math.max(t1.total_duration, 1)) * 100).toFixed(0)}% faster`
                            : '- ⏱️ Same duration',
                        errors1 !== errors2
                            ? `- ❌ **Errors:** ${errors1 < errors2 ? 'A' : 'B'} had fewer errors (${Math.min(errors1, errors2)} vs ${Math.max(errors1, errors2)})`
                            : '- ✅ Same error count',
                        t1.total_tool_calls !== t2.total_tool_calls
                            ? `- 🔧 **Efficiency:** ${t1.total_tool_calls < t2.total_tool_calls ? 'A' : 'B'} used fewer tool calls`
                            : '- 🔧 Same tool usage',
                    ].join('\n');
                }

                case 'get_state': {
                    const tlId = String(params.timeline_id || '');
                    const seq = Number(params.sequence);
                    if (!tlId || !seq) return 'Error: timeline_id and sequence required';

                    const events = this.db.getTimelineEvents(tlId, 1000);
                    const snapshots = events
                        .filter((e: any) => e.type === 'state_snapshot' && e.sequence <= seq)
                        .sort((a: any, b: any) => b.sequence - a.sequence);

                    if (snapshots.length === 0) return `No state snapshots found at or before event #${seq} in timeline \`${tlId}\`.`;

                    const snap = snapshots[0];
                    const data = typeof snap.data === 'string' ? JSON.parse(snap.data) : snap.data;
                    return [
                        `## 📸 State Snapshot at Event #${snap.sequence}`,
                        `**Timeline:** \`${tlId}\``,
                        `**Messages:** ${data.messageCount}`,
                        `**Hash:** ${data.messageHash}`,
                        '',
                        '### Message History at this point:',
                        ...(data.messages || []).map((m: any) => `**${m.role}:** ${m.content || '(empty)'}`),
                    ].join('\n');
                }

                case 'search_events': {
                    const tlId = String(params.timeline_id || '');
                    const eventType = String(params.event_type || '');
                    if (!tlId) return 'Error: timeline_id required';

                    let events = this.db.getTimelineEvents(tlId, 200);
                    if (eventType) {
                        events = events.filter((e: any) => e.type === eventType);
                    }

                    if (events.length === 0) return `No ${eventType || ''} events found in timeline \`${tlId}\`.`;

                    return [
                        `## 🔍 Events${eventType ? ` (${eventType})` : ''} in Timeline \`${tlId}\``,
                        '',
                        ...events.slice(0, limit).map((ev: any) => {
                            const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
                            return `**#${ev.sequence}** [${ev.type}] ${JSON.stringify(data).slice(0, 150)}`;
                        }),
                    ].join('\n');
                }

                default:
                    return `Unknown action: "${action}". Valid: list_timelines, view_timeline, rewind, fork, compare, get_state, search_events`;
            }
        } catch (err) {
            return `Time-Travel Error: ${err instanceof Error ? err.message : String(err)}`;
        }
    }
}

function getEventIcon(type: string): string {
    switch (type) {
        case 'llm_call': return '🧠';
        case 'llm_response': return '💭';
        case 'tool_call': return '🔧';
        case 'tool_result': return '📋';
        case 'state_snapshot': return '📸';
        case 'decision': return '🔀';
        case 'fork': return '🍴';
        case 'error': return '❌';
        case 'security_block': return '🛡️';
        default: return '📌';
    }
}
