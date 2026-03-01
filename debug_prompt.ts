
import { Database } from './src/db/database.js';
import { ContextBuilder } from './src/agent/context.js';
import { MessageBus } from './src/bus/queue.js';
import { Config } from './src/config/schema.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

async function debug() {
    const db = new Database('nexusclaw.db');
    const context = new ContextBuilder(process.cwd(), db);

    const elena = db.getAgent('agent-002');
    console.log('--- AGENT ---');
    console.log(elena);

    const prompt = (context as any).buildSystemPrompt({
        channel: 'telegram',
        agentName: elena.name,
        agentRole: elena.role,
        agentId: elena.id
    });

    console.log('\n--- GENERATED SYSTEM PROMPT ---');
    console.log(prompt);
}

debug().catch(console.error);
