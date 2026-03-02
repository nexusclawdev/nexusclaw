#!/usr/bin/env node
/**
 * Test script for conversation recovery system
 * Simulates API error and verifies state saving/loading
 */

import { MemoryPersistence } from './dist/agent/memory-persistence.js';
import { join } from 'node:path';

const workspace = process.cwd();
const persistence = new MemoryPersistence(workspace);

console.log('🧪 Testing Conversation Recovery System\n');

// Test 1: Save conversation state
console.log('Test 1: Saving conversation state...');
const testState = {
    timestamp: new Date().toISOString(),
    conversationId: 'test-session-001',
    lastUserMessage: 'Build a REST API with authentication',
    taskInProgress: 'Build REST API with JWT authentication',
    completedSteps: [
        'Created server.js with Express setup',
        'Implemented user model with Sequelize',
        'Added JWT middleware for token validation',
        'Created authentication routes (login, register)',
        'Set up PostgreSQL database connection'
    ],
    pendingSteps: [
        'Add password reset functionality',
        'Implement refresh token mechanism',
        'Write unit tests for auth endpoints',
        'Add rate limiting to prevent brute force',
        'Deploy to production environment'
    ],
    filesModified: [
        'src/server.js',
        'src/routes/auth.js',
        'src/config/database.js'
    ],
    filesCreated: [
        'src/middleware/jwt.js',
        'src/models/user.js',
        'src/controllers/authController.js'
    ],
    currentContext: 'Working on REST API authentication system. Just finished implementing JWT middleware and user routes. About to add password reset when API error occurred.',
    importantDecisions: [
        'Using Express.js framework for simplicity',
        'JWT tokens with 24h expiration',
        'PostgreSQL for user data storage',
        'bcrypt for password hashing (10 rounds)'
    ],
    nextActions: [
        'Resume from where the API error occurred',
        'Verify JWT middleware is working correctly',
        'Continue with password reset implementation',
        'Add comprehensive error handling',
        'Write integration tests'
    ],
    errorEncountered: '429: Rate limit exceeded - too many requests'
};

try {
    const savedPath = persistence.saveConversationState(testState);
    console.log('✅ State saved successfully to:', savedPath);
} catch (error) {
    console.error('❌ Failed to save state:', error.message);
    process.exit(1);
}

// Test 2: Load conversation state
console.log('\nTest 2: Loading conversation state...');
try {
    const loadedState = persistence.loadLatestConversationState();
    if (!loadedState) {
        console.error('❌ No state found');
        process.exit(1);
    }
    console.log('✅ State loaded successfully');
    console.log('   Task:', loadedState.taskInProgress);
    console.log('   Completed:', loadedState.completedSteps.length, 'steps');
    console.log('   Pending:', loadedState.pendingSteps.length, 'steps');
    console.log('   Files modified:', loadedState.filesModified.length);
    console.log('   Files created:', loadedState.filesCreated.length);
} catch (error) {
    console.error('❌ Failed to load state:', error.message);
    process.exit(1);
}

// Test 3: Generate continuation prompt
console.log('\nTest 3: Generating continuation prompt...');
try {
    const loadedState = persistence.loadLatestConversationState();
    const prompt = persistence.generateContinuationPrompt(loadedState);
    console.log('✅ Continuation prompt generated');
    console.log('   Length:', prompt.length, 'characters');
    console.log('\n--- Preview (first 500 chars) ---');
    console.log(prompt.substring(0, 500) + '...');
    console.log('--- End Preview ---\n');
} catch (error) {
    console.error('❌ Failed to generate prompt:', error.message);
    process.exit(1);
}

console.log('\n🎉 All tests passed! Conversation recovery system is working correctly.\n');
console.log('📝 Next steps:');
console.log('   1. Start a new chat session');
console.log('   2. Type: /continue');
console.log('   3. Agent will resume with full context restored\n');
