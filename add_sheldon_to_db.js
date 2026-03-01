
import { DatabaseSync } from 'node:sqlite';

try {
    const db = new DatabaseSync('nexusclaw.db');
    const now = Date.now();

    // Check if Sheldon exists
    const existing = db.prepare("SELECT * FROM agents WHERE id = 'agent-000' OR name = 'Sheldon'").get();

    if (!existing) {
        db.prepare(`
            INSERT INTO agents (id, name, role, department_id, emoji, model, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run('agent-000', 'Sheldon', 'supreme_leader', 'planning', '🧠', 'gpt-4o', now, now);
        console.log('✅ Sheldon added to agents table.');
    } else {
        console.log('ℹ️ Sheldon already exists in agents table.');
    }

    db.close();
} catch (err) {
    console.error('❌ Failed to update database:', err.message);
}
