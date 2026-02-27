/**
 * Telegram channel — Telegraf-based bot integration.
 * Shows "typing..." indicator while the AI is generating a response.
 */

import { MessageBus, createInbound, OutboundMessage } from '../bus/index.js';
import type { Config } from '../config/schema.js';

// Tracks which chat IDs currently have an active typing indicator loop
const typingLoops = new Map<string, ReturnType<typeof setInterval>>();

function startTyping(bot: any, chatId: string) {
    // Send immediately, then repeat every 4s (Telegram clears it after ~5s)
    bot.telegram.sendChatAction(chatId, 'typing').catch(() => { });
    if (!typingLoops.has(chatId)) {
        console.log(`[telegram] Start typing for ${chatId}`);
        const interval = setInterval(() => {
            bot.telegram.sendChatAction(chatId, 'typing').catch(() => { });
        }, 4000);
        typingLoops.set(chatId, interval);

        // Safety timeout: auto-stop after 60s to prevent forever-typing if something hangs
        setTimeout(() => stopTyping(chatId), 60000);
    }
}

function stopTyping(chatId: string) {
    const interval = typingLoops.get(chatId);
    if (interval) {
        console.log(`[telegram] Stop typing for ${chatId}`);
        clearInterval(interval);
        typingLoops.delete(chatId);
    }
}

export class TelegramChannel {
    private bot: any = null;
    private running = false;

    constructor(
        private bus: MessageBus,
        private config: Config['channels']['telegram'],
    ) { }

    async start(): Promise<void> {
        if (!this.config.enabled || !this.config.token) {
            console.log('📱 Telegram: disabled (no token)');
            return;
        }

        const { Telegraf } = await import('telegraf');
        this.bot = new Telegraf(this.config.token);

        // Handle messages
        this.bot.on('text', async (ctx: any) => {
            const senderId = String(ctx.from.id);
            const chatId = String(ctx.chat.id);
            const text = ctx.message.text;

            // Access control
            if (this.config.allowFrom.length > 0 && !this.config.allowFrom.includes('*')) {
                const allowed = this.config.allowFrom.includes(senderId)
                    || this.config.allowFrom.includes(ctx.from.username || '');
                if (!allowed) {
                    await ctx.reply('⛔ You are not authorized to use this bot.');
                    return;
                }
            }

            // Start typing indicator immediately (user sees bot is "thinking")
            startTyping(this.bot, chatId);

            await this.bus.publishInbound(createInbound('telegram', senderId, chatId, text, {
                metadata: { messageId: String(ctx.message.message_id), username: ctx.from.username },
            }));
        });

        // Start bot and outbound listener in parallel
        this.running = true;

        // Listen for outbound messages immediately
        this.listenOutbound();

        console.log('📱 Telegram: connected');

        this.bot.launch().catch((err: any) => {
            console.error('Telegram polling error:', err);
        });
    }

    private async listenOutbound(): Promise<void> {
        while (this.running) {
            try {
                const msg = await this.bus.consumeOutbound(1000);
                if (msg.channel === 'telegram' && this.bot) {
                    // Skip intermediate progress messages (tool hints: browse, exec, etc.)
                    if ((msg.metadata as any)?._progress) continue;

                    // Stop typing indicator as soon as we have a reply ready
                    stopTyping(msg.chatId);

                    try {
                        // Suppress reasoning/thinking blocks
                        let finalContent = msg.content;
                        if (finalContent.includes('<thinking>') && finalContent.includes('</thinking>')) {
                            finalContent = finalContent.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
                        }
                        if (!finalContent) continue;

                        // Split long messages (Telegram 4096 char limit)
                        const chunks = this.splitMessage(finalContent, 4000);
                        for (const chunk of chunks) {
                            await this.bot.telegram.sendMessage(msg.chatId, chunk, { parse_mode: 'Markdown' })
                                .catch(() => this.bot.telegram.sendMessage(msg.chatId, chunk));
                        }
                    } catch (err) {
                        console.error('Telegram send error:', err);
                    }
                }
            } catch {
                continue; // Timeout
            }
        }
    }

    private splitMessage(text: string, maxLen: number): string[] {
        if (text.length <= maxLen) return [text];
        const chunks: string[] = [];
        let remaining = text;
        while (remaining.length > 0) {
            chunks.push(remaining.slice(0, maxLen));
            remaining = remaining.slice(maxLen);
        }
        return chunks;
    }

    async stop(): Promise<void> {
        this.running = false;
        // Clean up all active typing loops
        for (const [chatId, interval] of typingLoops) {
            clearInterval(interval);
            typingLoops.delete(chatId);
        }
        if (this.bot) {
            try {
                this.bot.stop('SIGTERM');
            } catch (err) {
                // Ignore "Bot is not running!" or similar errors on shutdown
            }
        }
    }
}
