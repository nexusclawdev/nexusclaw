import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'node:child_process';
import { platform } from 'node:os';

export const setupCommand = new Command('setup')
    .description('Universal zero-setup for global nexusclaw access')
    .option('--global', 'Link the command globally (requires sudo/admin)')
    .action(async (opts) => {
        console.log(`\n${chalk.cyan('🐾')}  ${chalk.bold('NexusClaw Universal Setup')}`);
        console.log(chalk.dim('─'.repeat(40)));

        try {
            console.log(`\n${chalk.blue('⏳')}  Linking ${chalk.bold('nexusclaw')} command...`);

            // We use 'npm link' as it's the most reliable across all node managers for global paths
            const isWindows = platform() === 'win32';
            const cmd = isWindows ? 'npm link' : 'sudo npm link';

            execSync(cmd, { stdio: 'inherit' });

            console.log(`\n${chalk.green('✅')}  ${chalk.bold('Success!')} NexusClaw is now available globally.`);
            console.log(`   Try running ${chalk.cyan('nexusclaw status')} from any directory.\n`);
        } catch (err) {
            console.error(`\n${chalk.red('❌')}  ${chalk.bold('Setup Failed')}`);
            console.log(`   ${chalk.dim('Try running this command as Administrator or with sudo.')}\n`);
        }
    });
