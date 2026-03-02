export { Tool, type ToolSchema, type ToolParameters } from './base.js';
export { ToolRegistry } from './registry.js';
export { ExecTool } from './shell.js';
export { ReadFileTool, WriteFileTool, EditFileTool, ListDirTool } from './filesystem.js';
export { WebSearchTool, WebFetchTool } from './web.js';
export { Context7ResolveTool, Context7DocsTool } from './context7.js';
export { MessageTool } from './message.js';
export { BrowseTool } from './browser.js';
export { SpawnTool } from './spawn.js';
export { createApplyPatchTool, type PatchSummary } from './patch.js';

// ── Extreme Features ──────────────────────────────────────────────────────────
export { FindUsagesTool, CodeAnalysisTool, CodeDiffTool } from './code-intel.js';
export { GitHubTool } from './github.js';
export { SwarmTool, type SwarmTask, type SwarmResult, type SwarmReport, type SwarmRunConfig } from './swarm.js';
export { TimeTravelTool } from './time-travel.js';
export { SkillFusionTool } from './skill-fusion.js';

// Generic tool definition interface used by non-class tools (e.g. apply_patch)
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (args: Record<string, unknown>) => Promise<string>;
}
