import { Command } from 'commander';
import { runDoctor } from '../doctor.js';

export const doctorCommand = new Command('doctor')
    .description('Diagnose NexusClaw configuration issues')
    .action(async () => {
        await runDoctor();
    });
