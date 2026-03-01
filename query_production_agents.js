
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { homedir } from 'node:os';

try {
    const dbPath = join(homedir(), '.nexusclaw', 'workspace', 'claw.db');
    const db = new DatabaseSync(dbPath);
    const agents = db.prepare("SELECT id, name, role FROM agents").all();
    console.log('--- PRODUCTION AGENTS ---');
    console.log(JSON.stringify(agents, null, 2));
    db.close();
} catch (err) {
    console.error('❌ Failed to query database:', err.message);
}
