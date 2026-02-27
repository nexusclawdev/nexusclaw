/**
 * Abstract base class for agent tools.
 * TypeScript equivalent of nanobot's Tool ABC — same interface, stronger types.
 */

export interface ToolParameters {
    type: 'object';
    properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
        default?: unknown;
    }>;
    required?: string[];
}

export interface ToolSchema {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: ToolParameters;
    };
}

export abstract class Tool {
    abstract get name(): string;
    abstract get description(): string;
    abstract get parameters(): ToolParameters;
    abstract execute(params: Record<string, unknown>): Promise<string>;

    /** Convert to OpenAI function schema format */
    toSchema(): ToolSchema {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: this.parameters,
            },
        };
    }

    /** Validate params against schema */
    validateParams(params: Record<string, unknown>): string[] {
        const errors: string[] = [];
        const required = this.parameters.required ?? [];

        for (const key of required) {
            if (!(key in params) || params[key] === undefined) {
                errors.push(`Missing required parameter: ${key}`);
            }
        }

        for (const [key, val] of Object.entries(params)) {
            const schema = this.parameters.properties[key];
            if (!schema) continue;

            if (schema.enum && !schema.enum.includes(String(val))) {
                errors.push(`${key} must be one of: ${schema.enum.join(', ')}`);
            }
        }

        return errors;
    }
}
