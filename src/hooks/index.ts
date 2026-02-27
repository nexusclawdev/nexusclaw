/**
 * NexusClaw Event Hook System
 * Advanced event system with typed generics, async/sync handlers, priority ordering,
 * wildcards, and per-hook timeouts.
 *
 * Usage:
 *   hooks.on('message:received', async (e) => { ... });
 *   hooks.on('agent:*', (e) => { ... }); // wildcard
 *   hooks.emit('message:received', { channel: 'telegram', ... });
 */

export type HookEventType =
    | 'message:received'
    | 'message:sent'
    | 'message:error'
    | 'session:created'
    | 'session:cleared'
    | 'agent:start'
    | 'agent:stop'
    | 'agent:tool_call'
    | 'agent:reply'
    | 'agent:error'
    | 'gateway:startup'
    | 'gateway:shutdown'
    | 'agent:status_update'
    | 'task:created'
    | 'command:executed'
    | 'model:fallback';

export type HookEventPayload = {
    'message:received': { channel: string; chatId: string; senderId: string; content: string; timestamp: Date };
    'message:sent': { channel: string; chatId: string; content: string; success: boolean; error?: string };
    'message:error': { channel: string; chatId: string; error: string };
    'session:created': { key: string; channel: string; chatId: string };
    'session:cleared': { key: string; messageCount: number };
    'agent:start': { model: string; workspace: string };
    'agent:stop': {};
    'agent:tool_call': { name: string; args: Record<string, unknown>; result?: string };
    'agent:reply': { channel: string; chatId: string; content: string; toolsUsed: string[] };
    'agent:error': { channel: string; chatId: string; error: string };
    'gateway:startup': { port: number; channels: string[] };
    'gateway:shutdown': { uptime: number };
    'agent:status_update': { agentId: string; status: string; taskId?: string | null };
    'task:created': { taskId: string; title: string; assignedAgentId?: string | null };
    'command:executed': { command: string; channel: string; chatId: string };
    'model:fallback': { primaryModel: string; fallbackModel: string; reason: string; attempt: number };
};

export interface HookEvent<T extends HookEventType> {
    type: T;
    payload: HookEventPayload[T];
    timestamp: Date;
    /** Hooks can push side-effect messages to this array */
    sideEffects: string[];
}

export type HookHandler<T extends HookEventType> = (
    event: HookEvent<T>
) => void | Promise<void>;

export interface HookRegistration {
    pattern: string;        // exact type or 'namespace:*' wildcard
    handler: HookHandler<any>;
    priority: number;       // higher = runs first
    once: boolean;
    timeout: number;        // ms before handler is cancelled (0 = no limit)
}

const HANDLER_TIMEOUT_DEFAULT = 5000;

/**
 * NexusClaw Hook System
 * Advanced features: wildcards, priority ordering, once(), timeouts, side effects
 */
export class HookSystem {
    private handlers: Array<HookRegistration & { id: string }> = [];
    private idCounter = 0;

    /** Register a persistent handler */
    on<T extends HookEventType>(
        pattern: T | `${string}:*`,
        handler: HookHandler<T>,
        options?: { priority?: number; timeout?: number }
    ): string {
        const id = `h${++this.idCounter}`;
        this.handlers.push({
            id,
            pattern,
            handler: handler as HookHandler<any>,
            priority: options?.priority ?? 0,
            once: false,
            timeout: options?.timeout ?? 0,
        });
        this.handlers.sort((a, b) => b.priority - a.priority);
        return id;
    }

    /** Register a one-shot handler that removes itself after firing */
    once<T extends HookEventType>(
        pattern: T | `${string}:*`,
        handler: HookHandler<T>,
        options?: { priority?: number; timeout?: number }
    ): string {
        const id = `h${++this.idCounter}`;
        this.handlers.push({
            id,
            pattern,
            handler: handler as HookHandler<any>,
            priority: options?.priority ?? 0,
            once: true,
            timeout: options?.timeout ?? 0,
        });
        this.handlers.sort((a, b) => b.priority - a.priority);
        return id;
    }

    /** Remove a handler by ID */
    off(id: string): void {
        this.handlers = this.handlers.filter(h => h.id !== id);
    }

    /** Emit an event. Returns any side-effect messages the hooks pushed */
    async emit<T extends HookEventType>(
        type: T,
        payload: HookEventPayload[T]
    ): Promise<string[]> {
        const event: HookEvent<T> = {
            type,
            payload,
            timestamp: new Date(),
            sideEffects: [],
        };

        const namespace = type.split(':')[0];
        const toFire = this.handlers.filter(h => {
            return h.pattern === type || h.pattern === `${namespace}:*`;
        });

        const onceIds = new Set<string>();

        for (const reg of toFire) {
            if (reg.once) onceIds.add(reg.id);
            try {
                const prom = Promise.resolve(reg.handler(event));
                if (reg.timeout > 0) {
                    await Promise.race([
                        prom,
                        new Promise<void>((_, rej) =>
                            setTimeout(() => rej(new Error(`Hook timeout after ${reg.timeout}ms`)), reg.timeout)
                        ),
                    ]);
                } else {
                    await prom;
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`[hooks] ${type} handler error: ${msg}`);
            }
        }

        // Remove one-shot handlers
        this.handlers = this.handlers.filter(h => !onceIds.has(h.id));

        return event.sideEffects;
    }

    /** Remove all handlers */
    clear(): void {
        this.handlers = [];
    }

    /** Debug: list all registered patterns */
    list(): string[] {
        return this.handlers.map(h => `${h.pattern} [p${h.priority}${h.once ? ', once' : ''}]`);
    }
}

/** Global singleton hook system — used throughout NexusClaw */
export const hooks = new HookSystem();
