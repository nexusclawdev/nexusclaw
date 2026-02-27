import { DatabaseSync } from 'node:sqlite';
import { getWorkspaceDir } from './src/utils/config.js';
import { join } from 'node:path';

const dbPath = join(getWorkspaceDir(), 'claw.db');
console.log('Checking database at:', dbPath);

const db = new DatabaseSync(dbPath);

const stmt = db.prepare("SELECT repo, skill_id, provider, learned_at FROM learned_skills");
const rows = stmt.all();

console.log("----- LEARNED SKILLS IN DB -----");
for (const row of rows) {
    console.log(`[SKILL] ${row.provider} learned ${row.repo}/${row.skill_id} at ${new Date(row.learned_at).toISOString()}`);
}
console.log("--------------------------------");

db.close();
