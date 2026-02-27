import { DatabaseSync } from 'node:sqlite';
import * as path from 'node:path';
import * as url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'claw.db');

try {
    const db = new DatabaseSync(dbPath);
    const info = db.prepare("UPDATE learned_skills SET repo = 'nexusclaw/skills' WHERE repo IN ('legacy/skills', 'old/skills')").run();
    console.log('Updated ' + info.changes + ' rows');
} catch (err) {
    console.error(err);
}
