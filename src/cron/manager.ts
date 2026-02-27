import { Database, type CronJobData } from '../db/database.js';
import { CronScheduler, type ScheduledTask } from './scheduler.js';

export class CronManager {
    private scheduler: CronScheduler;

    constructor(private db: Database) {
        this.scheduler = new CronScheduler();
        this.loadJobs();
    }

    /** Load jobs from database */
    private loadJobs(): void {
        try {
            const jobs = this.db.getCronJobs();

            for (const job of jobs) {
                if (job.enabled) {
                    this.scheduler.addTaskWithId(
                        job.id,
                        job.schedule,
                        job.description,
                        job.command,
                        job.timeout
                    );
                }
            }
        } catch (err) {
            console.error('Failed to load cron jobs:', err);
        }
    }

    /** Save jobs to database */
    private saveJobs(): void {
        try {
            const jobs = this.scheduler.getTasks();
            for (const job of jobs) {
                this.db.saveCronJob({
                    id: job.id,
                    schedule: job.schedule,
                    description: job.description,
                    command: job.command,
                    enabled: job.enabled ? 1 : 0,
                    timeout: job.timeout,
                    last_run: job.lastRun?.getTime()
                });
            }
        } catch (err) {
            console.error('Failed to save cron jobs:', err);
        }
    }

    /** Add a new cron job */
    addJob(schedule: string, description: string, command: string, timeout?: number): string {
        const id = this.scheduler.addTask(schedule, description, command, timeout);
        const job = this.scheduler.getTask(id)!;
        this.db.saveCronJob({
            id: job.id,
            schedule: job.schedule,
            description: job.description,
            command: job.command,
            enabled: job.enabled ? 1 : 0,
            timeout: job.timeout
        });
        return id;
    }

    /** Remove a cron job */
    removeJob(id: string): boolean {
        const result = this.scheduler.removeTask(id);
        if (result) {
            this.db.deleteCronJob(id);
        }
        return result;
    }

    /** Enable/disable a job */
    setJobEnabled(id: string, enabled: boolean): boolean {
        const result = this.scheduler.setTaskEnabled(id, enabled);
        if (result) {
            const job = this.scheduler.getTask(id)!;
            this.db.saveCronJob({
                id: job.id,
                schedule: job.schedule,
                description: job.description,
                command: job.command,
                enabled: job.enabled ? 1 : 0,
                timeout: job.timeout,
                last_run: job.lastRun?.getTime()
            });
        }
        return result;
    }

    /** List all jobs */
    listJobs(): ScheduledTask[] {
        return this.scheduler.getTasks();
    }

    /** Get a specific job */
    getJob(id: string): ScheduledTask | undefined {
        return this.scheduler.getTask(id);
    }

    /** Stop all jobs */
    shutdown(): void {
        this.scheduler.stopAll();
    }
}
