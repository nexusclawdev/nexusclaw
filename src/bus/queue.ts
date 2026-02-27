/**
 * Async message bus — decouples chat channels from the agent core.
 * TypeScript equivalent of nanobot's MessageBus with typed events.
 */

import { InboundMessage, OutboundMessage } from './events.js';

/**
 * Simple async queue — TypeScript port of Python's asyncio.Queue.
 */
class AsyncQueue<T> {
    private items: T[] = [];
    private waiters: Array<(item: T) => void> = [];

    async put(item: T): Promise<void> {
        if (this.waiters.length > 0) {
            const resolve = this.waiters.shift()!;
            resolve(item);
        } else {
            this.items.push(item);
        }
    }

    async get(timeoutMs?: number): Promise<T> {
        if (this.items.length > 0) {
            return this.items.shift()!;
        }

        return new Promise<T>((resolve, reject) => {
            let timer: ReturnType<typeof setTimeout> | undefined;

            const waiter = (item: T) => {
                if (timer) clearTimeout(timer);
                resolve(item);
            };

            this.waiters.push(waiter);

            if (timeoutMs !== undefined) {
                timer = setTimeout(() => {
                    const idx = this.waiters.indexOf(waiter);
                    if (idx !== -1) this.waiters.splice(idx, 1);
                    reject(new Error('Queue timeout'));
                }, timeoutMs);
            }
        });
    }

    get size(): number {
        return this.items.length;
    }
}

/**
 * MessageBus — async pub/sub between channels and agent.
 */
export class MessageBus {
    private inbound = new AsyncQueue<InboundMessage>();
    private outbound = new AsyncQueue<OutboundMessage>();

    async publishInbound(msg: InboundMessage): Promise<void> {
        await this.inbound.put(msg);
    }

    async consumeInbound(timeoutMs?: number): Promise<InboundMessage> {
        return this.inbound.get(timeoutMs);
    }

    async publishOutbound(msg: OutboundMessage): Promise<void> {
        await this.outbound.put(msg);
    }

    async consumeOutbound(timeoutMs?: number): Promise<OutboundMessage> {
        return this.outbound.get(timeoutMs);
    }

    get inboundSize(): number {
        return this.inbound.size;
    }

    get outboundSize(): number {
        return this.outbound.size;
    }
}
