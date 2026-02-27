import { Database } from '../src/db/database.js';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

async function runTests() {
    console.log(chalk.bold.cyan('\n🧪 NexusClaw Backend Verification\n'));

    const workspace = path.join(process.cwd(), 'test-workspace');
    if (!fs.existsSync(workspace)) fs.mkdirSync(workspace, { recursive: true });

    const dbPath = path.join(workspace, 'nexusclaw.db');
    if (fs.existsSync(dbPath)) {
        try { fs.unlinkSync(dbPath); } catch (e) { }
    }

    const db = new Database(workspace);
    console.log(chalk.green('✅ Database initialized at:'), dbPath);

    try {
        // 1. Projects Test
        console.log(chalk.yellow('\n1. Testing Projects...'));
        const projectId = db.createProject({
            name: 'Test Project',
            core_goal: 'Verify persistence',
            project_path: '/path/to/test'
        });
        console.log('   - Created Project:', projectId);

        db.updateProject(projectId, { core_goal: 'Updated Goal' });
        const projects = db.getProjects();
        const project = projects.find(p => p.id === projectId);
        if (project?.core_goal === 'Updated Goal') {
            console.log(chalk.green('   ✅ Project Update Success'));
        } else {
            throw new Error('Project Update Failed');
        }

        // 2. Settings Test
        console.log(chalk.yellow('\n2. Testing Settings...'));
        db.saveSetting('test_key', JSON.stringify({ foo: 'bar' }));
        const settingRaw = db.getSetting('test_key');
        const setting = settingRaw ? JSON.parse(settingRaw) : null;
        if (setting?.foo === 'bar') {
            console.log(chalk.green('   ✅ Setting Persistence Success'));
        } else {
            throw new Error('Setting Persistence Failed');
        }

        // 3. API Providers Test
        console.log(chalk.yellow('\n3. Testing API Providers...'));
        const providerId = db.createApiProvider({
            name: 'OpenAI Test',
            type: 'llm',
            base_url: 'https://api.openai.com',
            api_key: 'sk-123'
        });
        const providers = db.getApiProviders();
        if (providers.some(p => p.id === providerId)) {
            console.log(chalk.green('   ✅ API Provider CRUD Success'));
        } else {
            throw new Error('API Provider CRUD Failed');
        }

        // 4. Auth Tokens Test
        console.log(chalk.yellow('\n4. Testing Auth Tokens...'));
        db.saveAuthToken({
            provider: 'github-test',
            access_token: 'gho_123',
            expires_at: Date.now() + 3600000,
            scope: 'repo'
        });
        const tokens = db.getAuthTokens();
        if (tokens.some(t => t.provider === 'github-test' && t.access_token === 'gho_123')) {
            console.log(chalk.green('   ✅ Auth Token Persistence Success'));
        } else {
            throw new Error('Auth Token Persistence Failed');
        }

        // 5. Cron Jobs Test
        console.log(chalk.yellow('\n5. Testing Cron Jobs...'));
        db.saveCronJob({
            id: 'test-cron',
            schedule: '0 0 * * *',
            description: 'Testing',
            command: 'echo test',
            enabled: 1,
            timeout: 5000,
            last_run: 0
        });
        const jobs = db.getCronJobs();
        if (jobs.some(j => j.id === 'test-cron')) {
            console.log(chalk.green('   ✅ Cron Job Persistence Success'));
        } else {
            throw new Error('Cron Job Persistence Failed');
        }

        // 6. Subtasks Test (Requires parent Task)
        console.log(chalk.yellow('\n6. Testing Subtasks...'));
        // We need a dummy task first due to FK constraint
        const taskId = `task-${Date.now()}`;
        // Note: We'd normally use db.createTask, but let's just insert it raw for the test
        // or check if we have a createAgent/createTask.
        // Let's use getAgents to get a valid agent ID.
        const agents = db.getAgents();
        const agentId = agents[0].id;

        // Use a direct SQL insert for the dummy task to bypass any complex logic
        (db as any).db.prepare(`
            INSERT INTO tasks (id, title, department_id, assigned_agent_id)
            VALUES (?, ?, ?, ?)
        `).run(taskId, 'Parent Task', 'planning', agentId);

        const subtaskId = db.createSubtask({
            task_id: taskId,
            title: 'Test Subtask',
            status: 'todo'
        });
        const subtasks = db.getSubtasks(taskId);
        if (subtasks.some(s => s.id === subtaskId)) {
            console.log(chalk.green('   ✅ Subtask CRUD Success'));
        } else {
            throw new Error('Subtask CRUD Failed');
        }

        // 7. Worktrees Test
        console.log(chalk.yellow('\n7. Testing Worktrees...'));
        const wtId = db.createWorktree({
            id: 'wt-123',
            name: 'Main Worktree',
            path: '/tmp/wt',
            repo_url: 'https://github.com/test/repo'
        });
        const worktrees = db.getWorktrees();
        if (worktrees.some(w => w.id === wtId)) {
            console.log(chalk.green('   ✅ Worktree CRUD Success'));
        } else {
            throw new Error('Worktree CRUD Failed');
        }

        console.log(chalk.bold.green('\n🎉 ALL BACKEND PERSISTENCE TESTS PASSED!\n'));

    } catch (err) {
        console.error(chalk.red('\n❌ TEST FAILED:'), err);
        throw err;
    } finally {
        db.close();
        if (fs.existsSync(workspace)) {
            // fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}

runTests().catch(err => {
    process.exit(1);
});
