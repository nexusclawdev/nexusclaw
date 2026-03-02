/**
 * Context7 MCP Integration — Up-to-date library documentation for all agents.
 * Uses the Context7 REST API to resolve library IDs and fetch current docs.
 * This ensures agents never hallucinate APIs or use outdated patterns.
 *
 * API Reference: https://context7.com/api
 */

import { Tool, ToolParameters } from './base.js';

const C7_BASE = 'https://context7.com/api/v2';
const C7_TIMEOUT = 15_000;

export class Context7ResolveTool extends Tool {
    private apiKey?: string;

    constructor(apiKey?: string) {
        super();
        this.apiKey = apiKey;
    }

    get name() { return 'context7_resolve'; }
    get description() {
        return 'Resolve a library name to a Context7 library ID for documentation lookup. Use this FIRST before querying docs. Example: "react" → "/facebook/react", "express" → "/expressjs/express".';
    }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'What you are trying to do (e.g., "set up JWT authentication")',
                },
                libraryName: {
                    type: 'string',
                    description: 'Library name to resolve (e.g., "react", "express", "sequelize")',
                },
            },
            required: ['query', 'libraryName'],
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const query = String(params.query || '');
        const libraryName = String(params.libraryName || '');

        try {
            const url = `${C7_BASE}/libs/search?query=${encodeURIComponent(query)}&libraryName=${encodeURIComponent(libraryName)}`;
            const headers: Record<string, string> = {
                'Accept': 'application/json',
            };
            if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

            const res = await fetch(url, {
                headers,
                signal: AbortSignal.timeout(C7_TIMEOUT),
            });

            if (!res.ok) {
                return `Context7 API error: HTTP ${res.status}. Try using web_search instead.`;
            }

            const data = await res.json() as any;
            const results = Array.isArray(data) ? data : (data.results || data.libraries || []);

            if (!results.length) {
                return `No Context7 libraries found for "${libraryName}". Try a different name.`;
            }

            // Return top 5 matches
            const top = results.slice(0, 5);
            const formatted = top.map((lib: any, i: number) =>
                `${i + 1}. **${lib.title || lib.name || 'Unknown'}**\n   ID: \`${lib.id || lib.libraryId || 'unknown'}\`\n   ${lib.description || ''}`
            ).join('\n\n');

            return `Found ${results.length} libraries. Top matches:\n\n${formatted}\n\nUse the library ID with context7_docs to get documentation.`;
        } catch (e) {
            return `Context7 resolve error: ${e instanceof Error ? e.message : String(e)}. Falling back to web_search.`;
        }
    }
}

export class Context7DocsTool extends Tool {
    private apiKey?: string;

    constructor(apiKey?: string) {
        super();
        this.apiKey = apiKey;
    }

    get name() { return 'context7_docs'; }
    get description() {
        return 'Fetch up-to-date documentation and code examples for a library using its Context7 library ID. Use context7_resolve first to get the ID. Returns current, version-specific docs — much more reliable than training data.';
    }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                libraryId: {
                    type: 'string',
                    description: 'Context7 library ID (e.g., "/facebook/react", "/expressjs/express"). Get this from context7_resolve.',
                },
                query: {
                    type: 'string',
                    description: 'What you need docs about (e.g., "useEffect cleanup", "middleware setup", "model associations")',
                },
                tokens: {
                    type: 'string',
                    description: 'Max tokens in response (default: 5000). Increase for detailed docs.',
                },
            },
            required: ['libraryId', 'query'],
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const libraryId = String(params.libraryId || '');
        const query = String(params.query || '');
        const tokens = Number(params.tokens ?? 5000);

        if (!libraryId) return 'Error: libraryId is required. Use context7_resolve first.';

        try {
            const url = `${C7_BASE}/context?libraryId=${encodeURIComponent(libraryId)}&query=${encodeURIComponent(query)}&tokens=${tokens}`;
            const headers: Record<string, string> = {
                'Accept': 'application/json',
            };
            if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

            const res = await fetch(url, {
                headers,
                signal: AbortSignal.timeout(C7_TIMEOUT),
            });

            if (!res.ok) {
                return `Context7 docs API error: HTTP ${res.status}. Try using web_fetch with the library's official docs URL instead.`;
            }

            const data = await res.json() as any;

            // Extract content from response
            const content = data.context || data.content || data.text || '';
            if (!content) {
                return `No documentation found for "${query}" in library ${libraryId}. Try a different query.`;
            }

            // Truncate if too large
            const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
            if (text.length > 12000) {
                return text.slice(0, 12000) + `\n\n... (truncated, ${text.length - 12000} more chars)`;
            }

            return text;
        } catch (e) {
            return `Context7 docs error: ${e instanceof Error ? e.message : String(e)}. Try using web_search for "${query} ${libraryId}" instead.`;
        }
    }
}
