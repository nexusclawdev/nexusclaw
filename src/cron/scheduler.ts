/**
 * Cron Scheduler - Manage scheduled tasks with persistence
 */

import { CronJob } from 'cron';
import { randomUUID } from 'node:crypto';

export interface ScheduledTask {
    id: string;
    schedule: string;
    description: string;
    command: string;
    enabled: boolean;
    timeout: number;
    lastRun?: Date;
    nextRun?: Date;
}

export class CronScheduler {
    private jobs: Map<string, CronJob> = new Map();
    private tasks: Map<string, ScheduledTask> = new Map();

    /** Add a new scheduled task */
    addTask(schedule: string, description: string, command: string, timeout = 300000): string {
        const id = randomUUID();
        return this.addTaskWithId(id, schedule, description, command, timeout);
    }

    /** Add a new scheduled task with a specific ID */
    addTaskWithId(id: string, schedule: string, description: string, command: string, timeout = 300000): string {
        const task: ScheduledTask = {
            id,
            schedule,
            description,
            command,
            enabled: true,
            timeout,
        };

        this.tasks.set(id, task);
        this.scheduleTask(task);

        return id;
    }

    /** Remove a scheduled task */
    removeTask(id: string): boolean {
        const job = this.jobs.get(id);
        if (job) {
            job.stop();
            this.jobs.delete(id);
        }
        return this.tasks.delete(id);
    }

    /** Enable/disable a task */
    setTaskEnabled(id: string, enabled: boolean): boolean {
        const task = this.tasks.get(id);
        if (!task) return false;

        task.enabled = enabled;
        const job = this.jobs.get(id);

        if (enabled && !job) {
            this.scheduleTask(task);
        } else if (!enabled && job) {
            job.stop();
            this.jobs.delete(id);
        }

        return true;
    }

    /** Get all tasks */
    getTasks(): ScheduledTask[] {
        return Array.from(this.tasks.values());
    }

    /** Get a specific task */
    getTask(id: string): ScheduledTask | undefined {
        return this.tasks.get(id);
    }

    /** Schedule a task with cron */
    private scheduleTask(task: ScheduledTask): void {
        try {
            const job = new CronJob(
                task.schedule,
                async () => {
                    task.lastRun = new Date();
                    await this.executeTask(task);
                },
                null,
                true,
                'UTC'
            );

            this.jobs.set(task.id, job);
            task.nextRun = job.nextDate().toJSDate();
        } catch (err) {
            console.error(`Failed to schedule task ${task.id}:`, err);
        }
    }

    /** Execute a scheduled task */
    private async executeTask(task: ScheduledTask): Promise<void> {
        console.log(`[Cron] Executing: ${task.description}`);

        try {
            // Execute the command using child_process
            const { exec } = await import('node:child_process');
            const { promisify } = await import('node:util');
            const execAsync = promisify(exec);

            // Execute with timeout
            const { stdout, stderr } = await execAsync(task.command, {
                timeout: task.timeout,
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
            });

            if (stdout) {
                console.log(`[Cron] Output: ${stdout.trim()}`);
            }
            if (stderr) {
                console.error(`[Cron] Error output: ${stderr.trim()}`);
            }

            // Update last run time
            task.lastRun = new Date();
            console.log(`[Cron] Task completed: ${task.description}`);
        } catch (err: any) {
            console.error(`[Cron] Task failed: ${task.description}`, err.message);

            // If timeout error
            if (err.killed && err.signal === 'SIGTERM') {
                console.error(`[Cron] Task timed out after ${task.timeout}ms`);
            }
        }
    }

    /** Stop all jobs */
    stopAll(): void {
        for (const job of this.jobs.values()) {
            job.stop();
        }
        this.jobs.clear();
    }
}
