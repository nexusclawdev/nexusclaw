/**
 * LangGraph definition for NexusClaw Multi-Agent routing.
 * Connects the Supervisor, BrowserAgent, and DataAgent nodes.
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { browserAgentNode } from './browser-agent.js';
import { dataAgentNode } from './data-agent.js';

// Define the state shared across the graph
interface AgentState {
    messages: BaseMessage[];
}

// Initialize the StateGraph
// Initialize the StateGraph, add nodes and edges in a builder chain for proper TS inference
const graphBuilder = new StateGraph<AgentState>({
    channels: {
        messages: {
            value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
            default: () => [],
        }
    }
})
    .addNode('browserAgent', browserAgentNode)
    .addNode('dataAgent', dataAgentNode)
    .addEdge('dataAgent', END)
    .addEdge('browserAgent', END);

// Compile the executable graph
export const agentApp = graphBuilder.compile();

/** Helper function to execute a specific node logically */
export async function runAgentNode(nodeName: string, messages: BaseMessage[]) {
    console.log(`[Graph] Executing node: ${nodeName}`);
    if (nodeName === 'browserAgent') {
        const result = await browserAgentNode({ messages });
        return result.messages[result.messages.length - 1];
    } else {
        const result = await dataAgentNode({ messages });
        return result.messages[result.messages.length - 1];
    }
}
