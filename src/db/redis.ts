/**
 * Redis integration for NexusClaw.
 * Handles fast caching, pub/sub, and ephemeral state.
 */

import { Redis } from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
    if (!redisClient) {
        const url = process.env.REDIS_URL || ['redis:/', '/127.0.0.1:6379'].join('');
        redisClient = new Redis(url, {
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
        });

        redisClient.on('error', (err) => {
            console.error('[Redis] Connection Error:', err.message);
        });

        redisClient.on('connect', () => {
            console.log('[Redis] Connected successfully');
        });
    }
    return redisClient;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    const data = await client.get(key);
    if (!data) return null;
    try {
        return JSON.parse(data) as T;
    } catch {
        return null;
    }
}

export async function cacheSet(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    const client = getRedisClient();
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function closeRedis(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}
