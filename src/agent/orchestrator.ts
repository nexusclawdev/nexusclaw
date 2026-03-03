/**
 * Orchestrator (Supervisor) Agent
 * Routes tasks between specialized node agents.
 */

import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { runAgentNode } from './graph.js';
import { ClaudeAgentProvider } from '../providers/claude-agent.js';

/**
 * Basic routing logic mapping tasks to specific agents.
 * Connects closely to LangGraph conditional edges.
 */
export async function orchestrateTask(task: string): Promise<string> {
    console.log(`[Orchestrator] Directing Task: ${task}`);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
        const provider = new ClaudeAgentProvider(apiKey);
        const orchestrationPrompt = `
You are the NexusClaw Orchestrator. Your role is to analyze the user's task and delegate it to the most appropriate specialized node agent.
Available Nodes:
- 'dataAgent': For general data processing and analysis.
- 'browserAgent': For web searching, fetching content, and browser automation.
- 'devAgent': For code writing, debugging, and technical implementation.
- 'planningAgent': For complex task breakdown and project management.

Task: "${task}"

Your goal is to decide which node should handle this, or if you should handle it yourself using built-in tools.
Execute the necessary steps autonomously.
`;
        return await provider.runAgenticTask(orchestrationPrompt, {
            allowedTools: ['Bash', 'Read', 'Edit', 'Glob'], // Allow core tools for the orchestrator
        });
    }

    // Fallback to simple hardcoded routing if no API key
    let targetNode = 'dataAgent';
    if (task.toLowerCase().includes('web') || task.toLowerCase().includes('browse') || task.toLowerCase().includes('search')) {
        targetNode = 'browserAgent';
    }

    const response = await runAgentNode(targetNode, [new HumanMessage(task)]);
    return response.content as string;
}
