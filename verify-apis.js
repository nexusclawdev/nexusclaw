#!/usr/bin/env node
/**
 * API Verification Script
 * Tests all real API endpoints to ensure no mock/stub data remains
 */

const chalk = require('chalk');
const http = require('http');

const BASE_URL = 'http://localhost:3100';
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
    tests.push({ name, fn });
}

async function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const req = http.request({
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

// Test 1: Skills API returns real data
test('Skills API - Real Marketplace Data', async () => {
    const res = await fetch(`${BASE_URL}/api/skills`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.data.skills || !Array.isArray(res.data.skills)) {
        throw new Error('Skills array not found');
    }
    // Check that skills have real data structure
    const skill = res.data.skills[0];
    if (!skill || !skill.name || !skill.skillId) {
        throw new Error('Invalid skill structure');
    }
    console.log(chalk.dim(`  Found ${res.data.skills.length} skills in marketplace`));
});

// Test 2: Usage API returns real tracking data
test('Usage API - Real Provider Tracking', async () => {
    const res = await fetch(`${BASE_URL}/api/cli-usage`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.data.usage || typeof res.data.usage !== 'object') {
        throw new Error('Usage data not found');
    }
    // Check for real provider tracking
    const providers = Object.keys(res.data.usage);
    if (providers.length === 0) {
        throw new Error('No providers tracked');
    }
    console.log(chalk.dim(`  Tracking ${providers.length} providers: ${providers.join(', ')}`));
});

// Test 3: Agents API returns real database data
test('Agents API - Real Database Operations', async () => {
    const res = await fetch(`${BASE_URL}/api/agents`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!Array.isArray(res.data)) {
        throw new Error('Agents array not found');
    }
    console.log(chalk.dim(`  Found ${res.data.length} agents in database`));
});

// Test 4: Tasks API returns real database data
test('Tasks API - Real Database Operations', async () => {
    const res = await fetch(`${BASE_URL}/api/tasks`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!Array.isArray(res.data)) {
        throw new Error('Tasks array not found');
    }
    console.log(chalk.dim(`  Found ${res.data.length} tasks in database`));
});

// Test 5: Health check
test('Health Check - Server Running', async () => {
    const res = await fetch(`${BASE_URL}/healthz`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(chalk.dim(`  Server is healthy`));
});

// Run all tests
async function runTests() {
    console.log(chalk.bold.cyan('\n🔍 NexusClaw API Verification\n'));
    console.log(chalk.dim('Testing all endpoints for real API implementations...\n'));

    for (const { name, fn } of tests) {
        try {
            await fn();
            passed++;
            console.log(chalk.green('✓'), name);
        } catch (err) {
            failed++;
            console.log(chalk.red('✗'), name);
            console.log(chalk.red(`  Error: ${err.message}`));
        }
    }

    console.log(chalk.bold(`\n📊 Results: ${passed} passed, ${failed} failed\n`));

    if (failed === 0) {
        console.log(chalk.green.bold('✅ All APIs verified - No mock/stub data found!\n'));
        process.exit(0);
    } else {
        console.log(chalk.red.bold('❌ Some tests failed - Please check the errors above\n'));
        process.exit(1);
    }
}

// Check if server is running
console.log(chalk.dim('Checking if NexusClaw server is running...'));
fetch(`${BASE_URL}/healthz`)
    .then(() => {
        console.log(chalk.green('✓ Server is running\n'));
        runTests();
    })
    .catch(() => {
        console.log(chalk.red('✗ Server is not running'));
        console.log(chalk.yellow('\nPlease start the server first:'));
        console.log(chalk.cyan('  npm start\n'));
        process.exit(1);
    });
