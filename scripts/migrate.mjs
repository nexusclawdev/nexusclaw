import { DatabaseSync } from 'node:sqlite';
import * as path from 'node:path';
import * as os from 'node:os';

const dbPath = path.join(os.homedir(), '.nexusclaw', 'workspace', 'claw.db');

try {
    const db = new DatabaseSync(dbPath);
    const info = db.prepare("UPDATE learned_skills SET repo = 'nexusclaw/skills' WHERE repo IN ('legacy/skills', 'old/skills')").run();
    console.log('Updated ' + info.changes + ' rows');
} catch (err) {
    console.error(err);
}
