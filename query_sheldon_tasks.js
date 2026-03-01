
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('nexusclaw.db');
const tasks = db.prepare("SELECT * FROM tasks WHERE id LIKE 'sheldon_%' OR title LIKE '%Sheldon%' ORDER BY created_at DESC LIMIT 5").all();
console.log('--- SHELDON TASKS ---');
console.log(JSON.stringify(tasks, null, 2));

for (const task of tasks) {
    const logs = db.prepare("SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at ASC").all(task.id);
    console.log(`\n--- LOGS FOR TASK: ${task.id} (${task.title}) ---`);
    console.log(JSON.stringify(logs, null, 2));
}

db.close();
