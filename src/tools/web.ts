/**
 * Web tools — search and fetch.
 * Like nanobot's WebSearchTool and WebFetchTool.
 */

import { Tool, ToolParameters } from './base.js';

export class WebSearchTool extends Tool {
    constructor(private apiKey?: string) { super(); }

    get name() { return 'web_search'; }
    get description() { return 'Search the web using Brave Search API. Returns relevant results.'; }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
                count: { type: 'string', description: 'Number of results (default: 5)' },
            },
            required: ['query'],
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        if (!this.apiKey) {
            return 'Error: No Brave Search API key configured. Set it in config.json under providers.brave.apiKey';
        }

        const query = String(params.query);
        const count = Number(params.count ?? 5);

        try {
            const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`;
            const res = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip',
                    'X-Subscription-Token': this.apiKey,
                },
            });

            if (!res.ok) return `Error: Search API returned ${res.status}`;

            const data = await res.json() as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
            const results = data.web?.results ?? [];

            if (results.length === 0) return 'No results found.';

            return results
                .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description}`)
                .join('\n\n');
        } catch (e) {
            return `Error searching: ${e instanceof Error ? e.message : String(e)}`;
        }
    }
}

export class WebFetchTool extends Tool {
    get name() { return 'web_fetch'; }
    get description() { return 'Fetch a web page and return its text content. Strips HTML.'; }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to fetch' },
            },
            required: ['url'],
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const url = String(params.url);

        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': 'NexusClaw/1.0' },
                signal: AbortSignal.timeout(15000),
            });

            if (!res.ok) return `Error: HTTP ${res.status}`;

            const html = await res.text();

            // Strip HTML tags for text content
            const text = html
                .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (text.length > 15000) {
                return text.slice(0, 15000) + `\n... (truncated, ${text.length - 15000} more chars)`;
            }

            return text || '(empty page)';
        } catch (e) {
            return `Error fetching URL: ${e instanceof Error ? e.message : String(e)}`;
        }
    }
}
