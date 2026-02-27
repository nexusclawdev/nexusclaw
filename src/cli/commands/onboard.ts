import { Command } from 'commander';
import { runOnboardWizard } from '../onboard.js';

export const onboardCommand = new Command('onboard')
    .description('Interactive setup wizard — no manual editing needed')
    .option('--auto-start', 'Start gateway after setup')
    .action(async (opts) => {
        try {
            await runOnboardWizard(opts.autoStart ?? false);
        } catch (error: any) {
            // Handle user cancellation gracefully
            if (error.name === 'ExitPromptError' || error.message?.includes('SIGINT') || error.message?.includes('force closed')) {
                console.log('\n\n🛑 Onboarding cancelled by user.');
                process.exit(0);
            }
            // Log unexpected errors
            console.error('Onboarding error:', error.message);
            process.exit(1);
        }
    });
