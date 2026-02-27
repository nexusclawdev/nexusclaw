/**
 * NexusClaw entry point — re-exports core for programmatic usage.
 */

export { AgentLoop } from './agent/loop.js';
export { MessageBus } from './bus/index.js';
export { loadConfig, saveConfig } from './config/schema.js';
export { createProvider } from './providers/index.js';
export { SecurityGuard } from './security/guard.js';
export { encrypt, decrypt } from './security/encryption.js';
export { TelegramChannel, WhatsAppChannel, DiscordChannel, WebChannel } from './channels/index.js';
export { ToolRegistry, Tool } from './tools/index.js';
