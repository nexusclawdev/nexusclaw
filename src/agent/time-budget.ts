/**
 * Time-Budget Engine for Sheldon v3
 *
 * Parses time constraints from natural language directives and distributes
 * them across pipeline phases. Scales agent concurrency to use all available
 * time effectively.
 *
 * Understood patterns:
 *   "you have 10 minutes"  | "finish in 2 hours"  | "complete by 9am"
 *   "done in 30 mins"      | "6 hour deadline"    | "within 1h 30m"
 */

export interface TimeBudget {
    totalMs: number;            // Total time budget in milliseconds
    deadline: number;           // Absolute epoch deadline (Date.now() + totalMs)
    phases: {
        research: number;       // ms allocated to research phase
        validate: number;       // ms allocated to validate phase
        build: number;          // ms allocated to build phase
        qa: number;             // ms allocated to qa phase
        deploy: number;         // ms allocated to deploy phase
    };
    workerIterations: number;   // Max iterations per worker (scaled from time)
    workerTimeoutMs: number;    // Timeout per individual worker
    concurrency: number;        // Agent concurrency (more time = can be careful; less time = max parallel)
    label: string;              // Human readable e.g. "10 minutes" or "6 hours"
}

// Phase weights — how to distribute total budget (must sum to 1.0)
const PHASE_WEIGHTS = {
    research: 0.12,  // 12% — fast parallel web research
    validate: 0.05,  // 5%  — quick score/verdict
    build: 0.58,  // 58% — the heavy lifting
    qa: 0.15,  // 15% — testing + self-healing
    deploy: 0.10,  // 10% — packaging + README
};

/**
 * Parse a time duration from a natural language string.
 * Returns milliseconds, or null if no time constraint found.
 */
export function parseTimeBudget(text: string): number | null {
    const lc = text.toLowerCase();

    // "by 9am", "by 9:00", "by 9 pm" → absolute clock time target
    const byClockMatch = lc.match(/\bby\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
    if (byClockMatch) {
        const now = new Date();
        let hours = parseInt(byClockMatch[1], 10);
        const mins = parseInt(byClockMatch[2] || '0', 10);
        const ampm = byClockMatch[3];
        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;

        const target = new Date(now);
        target.setHours(hours, mins, 0, 0);
        // If target is in the past, assume tomorrow
        if (target <= now) target.setDate(target.getDate() + 1);
        const diffMs = target.getTime() - now.getTime();
        return diffMs > 0 ? diffMs : null;
    }

    // Compound: "1 hour 30 minutes", "2h 15m", "1h30m"
    const compoundMatch = lc.match(/(\d+)\s*h(?:ours?)?\s*(\d+)\s*(?:m(?:in(?:utes?)?)?)/);
    if (compoundMatch) {
        return (parseInt(compoundMatch[1], 10) * 3600 + parseInt(compoundMatch[2], 10) * 60) * 1000;
    }

    // Single unit patterns
    const patterns: Array<[RegExp, number]> = [
        [/(\d+(?:\.\d+)?)\s*(?:hours?|h(?:\b|rs?))/, 3600_000],
        [/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m(?:\b))/, 60_000],
        [/(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s(?:\b))/, 1_000],
        [/(\d+(?:\.\d+)?)\s*(?:days?|d(?:\b))/, 86400_000],
    ];

    for (const [regex, multiplier] of patterns) {
        const m = lc.match(regex);
        if (m) {
            return Math.round(parseFloat(m[1]) * multiplier);
        }
    }

    return null;
}

/**
 * Extract a human-readable label from the budget ms.
 */
function humanLabel(ms: number): string {
    if (ms >= 3600_000) {
        const h = ms / 3600_000;
        return h === Math.floor(h) ? `${h} hour${h !== 1 ? 's' : ''}` : `${h.toFixed(1)} hours`;
    }
    if (ms >= 60_000) {
        const m = Math.round(ms / 60_000);
        return `${m} minute${m !== 1 ? 's' : ''}`;
    }
    return `${Math.round(ms / 1000)} seconds`;
}

/**
 * Build a full TimeBudget from total milliseconds.
 * Scales concurrency and worker iterations based on urgency.
 */
export function buildTimeBudget(totalMs: number): TimeBudget {
    const deadline = Date.now() + totalMs;

    // Give a 2% buffer for overhead / startup
    const usableMs = Math.floor(totalMs * 0.98);

    const phases = {
        research: Math.floor(usableMs * PHASE_WEIGHTS.research),
        validate: Math.floor(usableMs * PHASE_WEIGHTS.validate),
        build: Math.floor(usableMs * PHASE_WEIGHTS.build),
        qa: Math.floor(usableMs * PHASE_WEIGHTS.qa),
        deploy: Math.floor(usableMs * PHASE_WEIGHTS.deploy),
    };

    // Short time → max concurrency (15 agents), all-out sprint
    // Long  time → moderate (6 agents), more careful/sequential
    let concurrency: number;
    let workerIterations: number;

    if (totalMs <= 10 * 60_000) {        // ≤ 10 minutes: SPRINT MODE
        concurrency = 15;
        workerIterations = 6;
    } else if (totalMs <= 30 * 60_000) { // ≤ 30 minutes: FAST MODE
        concurrency = 12;
        workerIterations = 10;
    } else if (totalMs <= 2 * 3600_000) { // ≤ 2 hours: NORMAL MODE
        concurrency = 8;
        workerIterations = 15;
    } else if (totalMs <= 6 * 3600_000) { // ≤ 6 hours: THOROUGH MODE
        concurrency = 6;
        workerIterations = 20;
    } else {                              // > 6 hours: DEEP MODE
        concurrency = 6;
        workerIterations = 25;
    }

    // Per-worker timeout = build phase budget / concurrency (how long one agent can run in parallel)
    // Minimum 60s, Maximum 30 minutes per worker
    const workerTimeoutMs = Math.min(
        Math.max(phases.build / concurrency, 60_000),
        30 * 60_000
    );

    return {
        totalMs,
        deadline,
        phases,
        workerIterations,
        workerTimeoutMs,
        concurrency,
        label: humanLabel(totalMs),
    };
}

/**
 * Check if there is enough remaining time to continue a phase.
 * Use inside phase workers before starting new iterations.
 */
export function hasTimeRemaining(deadline: number, minimumBufferMs = 30_000): boolean {
    return Date.now() + minimumBufferMs < deadline;
}

/**
 * Get ms remaining until deadline.
 */
export function msRemaining(deadline: number): number {
    return Math.max(0, deadline - Date.now());
}
