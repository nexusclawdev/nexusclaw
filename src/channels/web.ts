/**
 * Web channel — Fastify HTTP + WebSocket for dashboard integration.
 * Provides REST API + real-time WebSocket for live agent interaction.
 */

import Fastify from 'fastify';
import { MessageBus, createInbound, OutboundMessage } from '../bus/index.js';
import type { Config } from '../config/schema.js';

export class WebChannel {
    private server: ReturnType<typeof Fastify> | null = null;
    private running = false;
    private wsClients = new Set<any>();

    constructor(
        private bus: MessageBus,
        private config: Config['channels']['web'],
    ) { }

    async start(): Promise<void> {
        if (!this.config.enabled) {
            console.log('🌐 Web: disabled');
            return;
        }

        this.server = Fastify({ logger: false });

        // CORS
        await this.server.register(import('@fastify/cors'), {
            origin: true,
            methods: ['GET', 'POST'],
        });

        // WebSocket
        await this.server.register(import('@fastify/websocket'));

        // Health check
        this.server.get('/health', async () => ({
            status: 'ok',
            service: 'nexusclaw',
            uptime: process.uptime(),
        }));

        // REST API: send message
        this.server.post('/api/chat', async (req: any) => {
            const { message, chatId } = req.body as { message: string; chatId?: string };
            const id = chatId || 'web-' + Date.now();

            await this.bus.publishInbound(createInbound('web', 'web-user', id, message));

            return { status: 'received', chatId: id };
        });

        // WebSocket: real-time chat
        this.server.get('/ws', { websocket: true }, (socket: any) => {
            this.wsClients.add(socket);
            console.log('🌐 WebSocket client connected');

            socket.on('message', async (data: Buffer) => {
                try {
                    const parsed = JSON.parse(data.toString());
                    if (parsed.type === 'message' && parsed.content) {
                        const chatId = parsed.chatId || 'ws-' + Date.now();
                        await this.bus.publishInbound(createInbound('web', 'ws-user', chatId, parsed.content));
                    }
                } catch (err) {
                    socket.send(JSON.stringify({ type: 'error', content: 'Invalid message format' }));
                }
            });

            socket.on('close', () => {
                this.wsClients.delete(socket);
            });
        });

        // Start server
        await this.server.listen({
            port: this.config.port,
            host: this.config.host,
        });

        this.running = true;
        console.log(`🌐 Web: listening on http://${this.config.host}:${this.config.port}`);

        this.listenOutbound();
    }

    private async listenOutbound(): Promise<void> {
        while (this.running) {
            try {
                const msg = await this.bus.consumeOutbound(1000);
                if (msg.channel === 'web') {
                    // Broadcast to all WebSocket clients
                    const payload = JSON.stringify({
                        type: 'response',
                        chatId: msg.chatId,
                        content: msg.content,
                        timestamp: new Date().toISOString(),
                    });

                    for (const client of this.wsClients) {
                        try {
                            client.send(payload);
                        } catch {
                            this.wsClients.delete(client);
                        }
                    }
                }
            } catch {
                continue;
            }
        }
    }

    async stop(): Promise<void> {
        this.running = false;
        if (this.server) {
            await this.server.close();
        }
    }
}
