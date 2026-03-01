
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { homedir } from 'node:os';

try {
    const dbPath = join(homedir(), '.nexusclaw', 'workspace', 'claw.db');
    console.log('Opening production database at:', dbPath);
    const db = new DatabaseSync(dbPath);
    const now = Date.now();

    // Check if Sheldon exists
    const existing = db.prepare("SELECT * FROM agents WHERE id = 'agent-000' OR name = 'Sheldon'").get();

    if (!existing) {
        db.prepare(`
            INSERT INTO agents (id, name, role, department_id, status, xp, level, tasks_completed, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run('agent-000', 'Sheldon', 'supreme_leader', 'planning', 'idle', 1000, 10, 100, now, now);
        console.log('✅ Sheldon added to production database.');
    } else {
        console.log('ℹ️ Sheldon already exists in production database.');
        // Update his role/status just in case
        db.prepare("UPDATE agents SET role = 'supreme_leader', status = 'idle' WHERE name = 'Sheldon'").run();
        console.log('✅ Sheldon updated in production database.');
    }

    db.close();
} catch (err) {
    console.error('❌ Failed to update database:', err.message);
}
