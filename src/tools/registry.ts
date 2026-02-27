/**
 * Tool registry for dynamic tool management.
 * Mirrors nanobot's ToolRegistry — register, execute, get definitions.
 * Supports both class-based Tools and plain ToolDefinition objects.
 */

import { Tool, ToolSchema } from './base.js';

/** Plain object tool — used by apply_patch and other functional tools */
interface PlainToolDef {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (args: Record<string, unknown>) => Promise<string>;
}

type AnyTool = Tool | PlainToolDef;

function isClassTool(t: AnyTool): t is Tool {
    return typeof (t as Tool).toSchema === 'function';
}

export class ToolRegistry {
    private tools = new Map<string, AnyTool>();

    register(tool: AnyTool): void {
        this.tools.set(tool.name, tool);
    }

    unregister(name: string): void {
        this.tools.delete(name);
    }

    get(name: string): AnyTool | undefined {
        return this.tools.get(name);
    }

    has(name: string): boolean {
        return this.tools.has(name);
    }

    /** Get all tool definitions in OpenAI function-calling format */
    getDefinitions(): ToolSchema[] {
        return Array.from(this.tools.values()).map(t => {
            if (isClassTool(t)) return t.toSchema();
            return {
                type: 'function' as const,
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters as any,
                },
            };
        });
    }

    /** Execute a tool by name */
    async execute(name: string, params: Record<string, unknown>): Promise<string> {
        const tool = this.tools.get(name);
        if (!tool) {
            return `Error: Tool '${name}' not found. Available: ${this.toolNames.join(', ')}`;
        }

        try {
            if (isClassTool(tool)) {
                const errors = tool.validateParams(params);
                if (errors.length > 0) {
                    return `Error: Invalid parameters for '${name}': ${errors.join('; ')}`;
                }
            }
            return await tool.execute(params);
        } catch (err) {
            return `Error executing ${name}: ${err instanceof Error ? err.message : String(err)}`;
        }
    }

    get toolNames(): string[] {
        return Array.from(this.tools.keys());
    }

    get size(): number {
        return this.tools.size;
    }
}
