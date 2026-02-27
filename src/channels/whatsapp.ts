/**
 * WhatsApp channel — whatsapp-web.js integration.
 * Connects via QR code scan using Puppeteer.
 */

import { MessageBus, createInbound, OutboundMessage } from '../bus/index.js';
import type { Config } from '../config/schema.js';

export class WhatsAppChannel {
    private client: any = null;
    private running = false;

    constructor(
        private bus: MessageBus,
        private config: Config['channels']['whatsapp'],
    ) { }

    async start(): Promise<void> {
        if (!this.config.enabled) {
            console.log('💬 WhatsApp: disabled');
            return;
        }

        try {
            const whatsappWeb = await import('whatsapp-web.js');
            const { Client, LocalAuth } = whatsappWeb.default || whatsappWeb;

            this.client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: './.nexusclaw-whatsapp-session'
                }),
                puppeteer: {
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                }
            });

            this.client.on('qr', async (qr: string) => {
                console.log('\n📱 WhatsApp QR Code:\n');
                try {
                    // Use dynamic require for CommonJS module
                    const { createRequire } = await import('node:module');
                    const require = createRequire(import.meta.url);
                    const QRCode = require('qrcode-terminal');
                    QRCode.generate(qr, { small: true });
                    console.log('\n👆 Scan this QR code with WhatsApp on your phone');
                    console.log('   WhatsApp -> Linked Devices -> Link a Device\n');
                } catch (err) {
                    console.log('QR Code String:', qr);
                    console.log('\nCouldn\'t display QR code:', err);
                }
            });

            this.client.on('ready', () => {
                console.log('✅ WhatsApp: Successfully connected!');
            });

            this.client.on('authenticated', () => {
                console.log('💬 WhatsApp: Authenticated');
            });

            this.client.on('auth_failure', (msg: any) => {
                console.error('💬 WhatsApp: Authentication failed', msg);
            });

            this.client.on('disconnected', (reason: any) => {
                console.log('💬 WhatsApp: Disconnected', reason);
            });

            this.client.on('message', async (msg: any) => {
                console.log('💬 WhatsApp: Message received from:', msg.from, 'fromMe:', msg.fromMe);

                if (msg.fromMe) {
                    console.log('💬 WhatsApp: Ignoring message from self');
                    return;
                }

                const senderId = msg.from;
                const chatId = msg.from;
                const text = msg.body;

                console.log('💬 WhatsApp: Message text:', text);

                if (!text) return;

                // Access control
                if (senderId.includes('@g.us') || senderId.includes('channel:') || senderId.includes('group:')) {
                    console.log('💬 WhatsApp: Ignoring group message');
                    return;
                }
                if (this.config.allowFrom.length > 0 && !this.config.allowFrom.includes('*') && !this.config.allowFrom.includes(senderId)) {
                    console.log('💬 WhatsApp: Sender not in allowlist');
                    return;
                }

                console.log('💬 WhatsApp: Publishing message to bus');
                await this.bus.publishInbound(createInbound('whatsapp', senderId, chatId, text, {
                    metadata: { messageId: msg.id._serialized },
                }));
            });

            await this.client.initialize();

            this.running = true;
            this.listenOutbound();
        } catch (err) {
            console.error('WhatsApp init failed:', err);
        }
    }

    private async listenOutbound(): Promise<void> {
        while (this.running) {
            try {
                const msg = await this.bus.consumeOutbound(1000);
                if (msg.channel === 'whatsapp' && this.client) {
                    try {
                        let finalContent = msg.content;
                        if (finalContent.includes('<thinking>') && finalContent.includes('</thinking>')) {
                            finalContent = finalContent.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
                        }

                        if (!finalContent) continue;

                        const redactedId = msg.chatId.replace(/^(\d{2})(\d+)(\d{2})(@.*)$/, '$1***$3$4');
                        console.log(`💬 WhatsApp: sending to ${redactedId}...`);

                        await this.client.sendMessage(msg.chatId, finalContent);
                    } catch (err) {
                        console.error('WhatsApp send error:', err);
                    }
                }
            } catch {
                continue;
            }
        }
    }

    async stop(): Promise<void> {
        this.running = false;
        if (this.client) {
            await this.client.destroy();
        }
    }
}
