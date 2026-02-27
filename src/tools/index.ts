export { Tool, type ToolSchema, type ToolParameters } from './base.js';
export { ToolRegistry } from './registry.js';
export { ExecTool } from './shell.js';
export { ReadFileTool, WriteFileTool, EditFileTool, ListDirTool } from './filesystem.js';
export { WebSearchTool, WebFetchTool } from './web.js';
export { MessageTool } from './message.js';
export { BrowseTool } from './browser.js';
export { SpawnTool } from './spawn.js';
export { createApplyPatchTool, type PatchSummary } from './patch.js';

// Generic tool definition interface used by non-class tools (e.g. apply_patch)
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (args: Record<string, unknown>) => Promise<string>;
}
