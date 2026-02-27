import { Command } from 'commander';
import { loadConfig, saveConfig } from '../config/schema.js';

/** Set a nested property in an object using dot notation */
function setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }

    const lastKey = keys[keys.length - 1];

    // Try to parse value as JSON for objects/arrays/booleans/numbers
    try {
        current[lastKey] = JSON.parse(value);
    } catch {
        // If not valid JSON, treat as string
        current[lastKey] = value;
    }
}

export const configCmd = new Command('config')
    .description('Manage NexusClaw configuration')
    .action(() => {
        // Parent action if needed
    });

configCmd
    .command('set <key> <value>')
    .description('Set a configuration parameter (supports dot notation: providers.openai.apiKey)')
    .action(async (key: string, value: string) => {
        const config = await loadConfig();

        try {
            setNestedProperty(config, key, value);
            await saveConfig(config);
            console.log(`✅ Set ${key} to ${value}`);
        } catch (err: any) {
            console.error(`❌ Failed to set ${key}: ${err.message}`);
            process.exit(1);
        }
    });

configCmd
    .command('show')
    .description('Show current configuration')
    .action(async () => {
        const config = await loadConfig();
        console.log(JSON.stringify(config, null, 2));
    });
