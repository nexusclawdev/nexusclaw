/**
 * Discord channel — Discord.js bot integration.
 * Shows "typing..." indicator while the AI is generating a response.
 */

import { Client, GatewayIntentBits, Message, TextChannel } from 'discord.js';
import { MessageBus, createInbound } from '../bus/index.js';
import type { Config } from '../config/schema.js';

// Tracks which channel IDs currently have an active typing indicator
const typingChannels = new Map<string, NodeJS.Timeout>();

function startTyping(channel: TextChannel) {
    const channelId = channel.id;

    // Send typing indicator immediately
    channel.sendTyping().catch(() => {});

    if (!typingChannels.has(channelId)) {
        console.log(`[discord] Start typing for ${channelId}`);

        // Discord typing indicator lasts ~10s, refresh every 8s
        const interval = setInterval(() => {
            channel.sendTyping().catch(() => {});
        }, 8000);

        typingChannels.set(channelId, interval);

        // Safety timeout: auto-stop after 60s
        setTimeout(() => stopTyping(channelId), 60000);
    }
}

function stopTyping(channelId: string) {
    const interval = typingChannels.get(channelId);
    if (interval) {
        console.log(`[discord] Stop typing for ${channelId}`);
        clearInterval(interval);
        typingChannels.delete(channelId);
    }
}

export class DiscordChannel {
    private client: Client | null = null;
    private running = false;

    constructor(
        private bus: MessageBus,
        private config: Config['channels']['discord'],
    ) {}

    async start(): Promise<void> {
        if (!this.config.enabled || !this.config.token) {
            console.log('💬 Discord: disabled (no token)');
            return;
        }

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
        });

        this.client.on('ready', () => {
            console.log(`💬 Discord: connected as ${this.client?.user?.tag}`);
        });

        this.client.on('messageCreate', async (message: Message) => {
            // Ignore bot messages
            if (message.author.bot) return;

            // Ignore empty messages
            if (!message.content.trim()) return;

            const senderId = message.author.id;
            const chatId = message.channel.id;
            const text = message.content;

            // Access control
            if (this.config.allowFrom.length > 0 && !this.config.allowFrom.includes('*')) {
                const allowed = this.config.allowFrom.includes(senderId)
                    || this.config.allowFrom.includes(message.author.username)
                    || this.config.allowFrom.includes(message.author.tag);

                if (!allowed) {
                    await message.reply('⛔ You are not authorized to use this bot.');
                    return;
                }
            }

            // Start typing indicator
            if (message.channel instanceof TextChannel) {
                startTyping(message.channel);
            }

            await this.bus.publishInbound(createInbound('discord', senderId, chatId, text, {
                metadata: {
                    messageId: message.id,
                    username: message.author.username,
                    tag: message.author.tag,
                    guildId: message.guildId,
                    channelType: message.channel.type,
                },
            }));
        });

        this.client.on('error', (error) => {
            console.error('[discord] Client error:', error);
        });

        // Start listening for outbound messages
        this.running = true;
        this.listenOutbound();

        // Login to Discord
        try {
            await this.client.login(this.config.token);
        } catch (err) {
            console.error('[discord] Login failed:', err);
            throw err;
        }
    }

    private async listenOutbound(): Promise<void> {
        while (this.running) {
            try {
                const msg = await this.bus.consumeOutbound(1000);

                if (msg.channel === 'discord' && this.client) {
                    // Skip intermediate progress messages
                    if ((msg.metadata as any)?._progress) continue;

                    // Stop typing indicator
                    stopTyping(msg.chatId);

                    try {
                        // Suppress reasoning/thinking blocks
                        let finalContent = msg.content;
                        if (finalContent.includes('<thinking>') && finalContent.includes('</thinking>')) {
                            finalContent = finalContent.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
                        }
                        if (!finalContent) continue;

                        // Get the channel
                        const channel = await this.client.channels.fetch(msg.chatId);
                        if (!channel || !channel.isTextBased()) continue;

                        // Split long messages (Discord 2000 char limit)
                        const chunks = this.splitMessage(finalContent, 1900);

                        for (const chunk of chunks) {
                            await (channel as TextChannel).send(chunk);
                        }
                    } catch (err) {
                        console.error('[discord] Send error:', err);
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
            // Try to split at newline or space near the limit
            let splitAt = maxLen;
            if (remaining.length > maxLen) {
                const lastNewline = remaining.lastIndexOf('\n', maxLen);
                const lastSpace = remaining.lastIndexOf(' ', maxLen);
                splitAt = lastNewline > maxLen / 2 ? lastNewline :
                         lastSpace > maxLen / 2 ? lastSpace : maxLen;
            }

            chunks.push(remaining.slice(0, splitAt).trim());
            remaining = remaining.slice(splitAt).trim();
        }

        return chunks;
    }

    async stop(): Promise<void> {
        this.running = false;

        // Clean up all active typing indicators
        for (const [channelId, interval] of typingChannels) {
            clearInterval(interval);
            typingChannels.delete(channelId);
        }

        if (this.client) {
            await this.client.destroy();
            this.client = null;
        }
    }
}
