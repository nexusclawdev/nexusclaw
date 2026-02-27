/**
 * Orchestrator (Supervisor) Agent
 * Routes tasks between specialized node agents.
 */

import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { runAgentNode } from './graph.js'; // Will be defined in graph.ts

/**
 * Basic routing logic mapping tasks to specific agents.
 * Connects closely to LangGraph conditional edges.
 */
export async function orchestrateTask(task: string): Promise<string> {
    console.log(`[Orchestrator] Directing Task: ${task}`);

    let targetNode = 'dataAgent';
    if (task.toLowerCase().includes('web') || task.toLowerCase().includes('browse') || task.toLowerCase().includes('search')) {
        targetNode = 'browserAgent';
    }

    // Call the LangGraph execution flow
    const response = await runAgentNode(targetNode, [new HumanMessage(task)]);
    return response.content as string;
}
