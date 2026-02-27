/**
 * NexusClaw Rate Limiter — token bucket algorithm per sender.
 * Protects the agent from flood attacks and runaway loops.
 *
 * Advanced features:
 *   - Token bucket (smooth bursts, not hard windows)
 *   - Per-channel + per-sender granularity
 *   - Configurable burst and refill rate
 *   - Automatic GC of idle buckets
 *   - Soft warning before hard block
 */

export interface RateLimitConfig {
    /** Max tokens (burst capacity). Default: 10 */
    capacity: number;
    /** Tokens added per second. Default: 0.5 (1 per 2s) */
    refillRate: number;
    /** Warn the user when tokens fall to this level. Default: 2 */
    warnAt: number;
    /** How long to keep idle bucket before GC (ms). Default: 10 min */
    idleTtlMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
    capacity: 10,
    refillRate: 0.5,
    warnAt: 2,
    idleTtlMs: 600_000,
};

interface Bucket {
    tokens: number;
    lastRefill: number;
    lastUsed: number;
}

export type RateLimitOutcome =
    | { allowed: true; warning?: string; tokens: number }
    | { allowed: false; retryAfterMs: number; tokens: number };

export class RateLimiter {
    private buckets = new Map<string, Bucket>();
    private config: RateLimitConfig;
    private gcTimer: NodeJS.Timeout | null = null;

    constructor(config: Partial<RateLimitConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        // Run GC every 5 minutes
        this.gcTimer = setInterval(() => this.gc(), 5 * 60 * 1000);
        if (this.gcTimer.unref) this.gcTimer.unref();
    }

    private key(channel: string, senderId: string): string {
        return `${channel}:${senderId}`;
    }

    private refill(bucket: Bucket): void {
        const now = Date.now();
        const elapsed = (now - bucket.lastRefill) / 1000;
        const added = elapsed * this.config.refillRate;
        bucket.tokens = Math.min(this.config.capacity, bucket.tokens + added);
        bucket.lastRefill = now;
    }

    /** Check and consume one token for a sender. Returns outcome. */
    consume(channel: string, senderId: string, tokens = 1): RateLimitOutcome {
        const k = this.key(channel, senderId);
        let bucket = this.buckets.get(k);
        const now = Date.now();

        if (!bucket) {
            bucket = { tokens: this.config.capacity, lastRefill: now, lastUsed: now };
            this.buckets.set(k, bucket);
        }

        this.refill(bucket);
        bucket.lastUsed = now;

        if (bucket.tokens < tokens) {
            // How long until they get 1 token back
            const deficit = tokens - bucket.tokens;
            const retryAfterMs = Math.ceil((deficit / this.config.refillRate) * 1000);
            return { allowed: false, retryAfterMs, tokens: bucket.tokens };
        }

        bucket.tokens -= tokens;

        const warning =
            bucket.tokens <= this.config.warnAt
                ? `⚠️ Rate limit warning: ${Math.floor(bucket.tokens)} message${Math.floor(bucket.tokens) === 1 ? '' : 's'} remaining. Please slow down.`
                : undefined;

        return { allowed: true, warning, tokens: bucket.tokens };
    }

    /** Build a user-friendly message when blocked */
    buildBlockMessage(outcome: Extract<RateLimitOutcome, { allowed: false }>): string {
        const secs = Math.ceil(outcome.retryAfterMs / 1000);
        return `⏱️ You're sending too fast. Please wait ${secs}s before trying again.`;
    }

    /** Reset a sender's bucket (e.g., after approving pairing) */
    reset(channel: string, senderId: string): void {
        this.buckets.delete(this.key(channel, senderId));
    }

    /** Remove idle buckets */
    private gc(): void {
        const expiry = Date.now() - this.config.idleTtlMs;
        for (const [k, b] of this.buckets) {
            if (b.lastUsed < expiry) this.buckets.delete(k);
        }
    }

    stop(): void {
        if (this.gcTimer) clearInterval(this.gcTimer);
    }
}
