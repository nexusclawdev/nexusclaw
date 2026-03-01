
import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

try {
    const sessionDir = join(homedir(), '.nexusclaw', 'workspace', 'sessions');
    if (existsSync(sessionDir)) {
        const files = readdirSync(sessionDir);
        for (const file of files) {
            unlinkSync(join(sessionDir, file));
        }
        console.log(`✅ Purged ${files.length} sessions from production.`);
    } else {
        console.log('ℹ️ No sessions directory found.');
    }
} catch (err) {
    console.error('❌ Failed to purge sessions:', err.message);
}
