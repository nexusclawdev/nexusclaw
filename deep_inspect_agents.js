
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { homedir } from 'node:os';

try {
    const dbPath = join(homedir(), '.nexusclaw', 'workspace', 'claw.db');
    const db = new DatabaseSync(dbPath);
    // Get all columns from agents table
    const statement = db.prepare("PRAGMA table_info(agents)");
    const columns = statement.all();
    console.log('--- AGENTS TABLE COLUMNS ---');
    console.log(JSON.stringify(columns, null, 2));

    const agents = db.prepare("SELECT * FROM agents").all();
    console.log('--- FULL AGENT DATA ---');
    console.log(JSON.stringify(agents, null, 2));
    db.close();
} catch (err) {
    console.error('❌ Failed to query database:', err.message);
}
