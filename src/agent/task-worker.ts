/**
 * Autonomous Task Worker
 * Polls database for in_progress tasks and executes them autonomously
 */

import type { Database, Task, Agent } from '../db/database.js';
import type { AgentLoop } from './loop.js';
import { hooks } from '../hooks/index.js';
import { MessageBus, createOutbound } from '../bus/index.js';
import { NotificationService, type NotificationConfig } from '../notifications/index.js';

export class TaskWorker {
    private db: Database;
    private agentLoop: AgentLoop;
    private bus: MessageBus;
    private notificationService?: NotificationService;
    private running = false;
    private pollInterval = 3000; // 3 seconds (faster polling)
    private processingTasks = new Set<string>();

    constructor(db: Database, agentLoop: AgentLoop, bus: MessageBus, notificationConfig?: NotificationConfig) {
        this.db = db;
        this.agentLoop = agentLoop;
        this.bus = bus;
        if (notificationConfig) {
            this.notificationService = new NotificationService(notificationConfig);
        }
    }

    async start(): Promise<void> {
        this.running = true;
        console.log('🤖 Autonomous Task Worker started');

        while (this.running) {
            try {
                await this.processTasks();
            } catch (err) {
                console.error('[TaskWorker] Error:', err);
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, this.pollInterval));
        }
    }

    stop(): void {
        this.running = false;
        console.log('🤖 Autonomous Task Worker stopped');
    }

    private async processTasks(): Promise<void> {
        // Get all agents with assigned tasks
        const agents = this.db.getAgents();

        for (const agent of agents) {
            // Skip if agent has no task or is already being processed
            if (!agent.current_task_id || this.processingTasks.has(agent.current_task_id)) {
                continue;
            }

            const tasks = this.db.getTasks({ assigned_agent_id: agent.id, status: 'in_progress' });
            const task = tasks.find(t => t.id === agent.current_task_id);

            // Only process tasks that are in_progress
            if (!task) {
                continue;
            }

            // Mark as processing
            this.processingTasks.add(task.id);

            // Process task asynchronously
            this.executeTask(agent, task).catch(err => {
                console.error(`[TaskWorker] Failed to execute task ${task.id}:`, err);
            }).finally(() => {
                this.processingTasks.delete(task.id);
            });
        }
    }

    private async executeTask(agent: Agent, task: Task): Promise<void> {
        console.log(`🔨 [${agent.name}] Starting autonomous execution: ${task.title}`);

        // Update agent status to working
        this.db.updateAgent(agent.id, { status: 'working' });

        try {
            // Build task execution prompt
            const prompt = this.buildTaskPrompt(agent, task);

            // Execute via agent loop
            const result = await this.agentLoop.nexusDirect(
                prompt,
                'autonomous',
                `task-${task.id}`,
                async (progress) => {
                    console.log(`[${agent.name}] ${progress}`);
                }
            );

            // Check if task was completed
            const updatedTasks = this.db.getTasks({ assigned_agent_id: agent.id });
            const updatedTask = updatedTasks.find(t => t.id === task.id);

            if (updatedTask && updatedTask.status === 'in_progress') {
                // Task still in progress, mark as done
                this.db.updateTask(task.id, {
                    status: 'done',
                    completed_at: Date.now()
                });

                // Update agent
                this.db.updateAgent(agent.id, {
                    status: 'idle',
                    current_task_id: null,
                    tasks_completed: (agent.tasks_completed || 0) + 1,
                    xp: (agent.xp || 0) + 50
                });

                console.log(`✅ [${agent.name}] Completed: ${task.title}`);

                // Send notification to owner
                if (this.notificationService) {
                    await this.notificationService.notifyTaskComplete(updatedTask, agent);
                }

                // Note: Hook emission removed - not in HookEventType
            }

        } catch (err) {
            console.error(`❌ [${agent.name}] Task execution failed:`, err);

            // Update task with error
            this.db.updateTask(task.id, {
                status: 'planned', // Reset to planned so it can be retried
            });

            // Update agent back to idle
            this.db.updateAgent(agent.id, {
                status: 'idle',
                current_task_id: null
            });
        }
    }

    private buildTaskPrompt(agent: Agent, task: Task): string {
        return `# AUTONOMOUS TASK EXECUTION MODE

You have been assigned a task to complete autonomously. This is not a conversation - this is a work assignment.

## Your Task
**Title**: ${task.title}
**Description**: ${task.description}
**Priority**: ${task.priority || 'medium'}
**Status**: ${task.status}

## Execution Requirements

### 1. DELIVERABLES
- Write REAL, working code - not pseudocode or placeholders
- Create actual files in the workspace using write_file tool
- Test your implementation using exec tool if applicable
- Provide a completion summary with file paths

### 2. QUALITY STANDARDS
- Production-ready code with error handling
- Security best practices (input validation, no hardcoded secrets)
- Clean, maintainable code with comments where needed
- Follow project conventions and patterns

### 3. WORKSPACE
- Base directory: ${task.project_path || 'C:\\Users\\THOR\\.nexusclaw\\workspace'}
- Create subdirectories as needed
- Use absolute paths for all file operations
- Organize files logically

### 4. TESTING
- Test your code before marking complete
- Fix any errors or bugs discovered
- Verify all functionality works as expected

### 5. COMPLETION CRITERIA
- All requirements met
- Code tested and working
- Files created in workspace
- Summary provided with deliverables list

## Execution Flow
1. **Analyze**: Understand requirements completely
2. **Design**: Plan your implementation approach
3. **Implement**: Write code using tools
4. **Test**: Verify functionality
5. **Report**: Summarize what you built

## Important Notes
- You have full autonomy - make decisions and execute
- Use tools efficiently - parallelize when possible
- If blocked, try alternative approaches
- Focus on completion, not perfection
- Real code only - no "TODO" or "implement later"
- For HTML files: Create self-contained files with embedded CSS/JS (never reference external files unless you create them)

Begin execution now. Create the deliverables.`;
    }
}
