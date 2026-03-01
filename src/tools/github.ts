/**
 * GitHub Integration Tool — Real GitHub REST API calls.
 * Enables agents to autonomously create PRs, post comments,
 * list issues, get diffs, and create branches.
 *
 * Requires: GITHUB_TOKEN environment variable
 */

import { Tool, ToolParameters } from './base.js';

const GITHUB_API = 'https://api.github.com';

export class GitHubTool extends Tool {
    private token: string | undefined;

    constructor(token?: string) {
        super();
        this.token = token;
    }

    get name() { return 'github'; }
    get description() {
        return 'Real GitHub REST API integration. Actions: list_prs, get_pr, create_pr, comment_issue, ' +
            'get_diff, create_branch, list_issues, close_issue, get_repo_info, search_code. ' +
            'Use for autonomous code review, PR creation, and GitHub operations.';
    }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: 'GitHub action to perform: list_prs | get_pr | create_pr | comment_issue | get_diff | create_branch | list_issues | close_issue | get_repo_info | search_code | list_commits | merge_pr',
                },
                owner: { type: 'string', description: 'GitHub repository owner (user or org)' },
                repo: { type: 'string', description: 'Repository name' },
                // PR creation
                title: { type: 'string', description: 'PR or issue title' },
                body: { type: 'string', description: 'PR or comment body (markdown supported)' },
                head: { type: 'string', description: 'Source branch for PR' },
                base: { type: 'string', description: 'Target branch for PR (default: main)' },
                draft: { type: 'boolean', description: 'Create PR as draft' },
                // Issue/PR number
                number: { type: 'number', description: 'Issue or PR number' },
                // Branch creation
                branch: { type: 'string', description: 'New branch name' },
                from_ref: { type: 'string', description: 'Ref (branch/tag/SHA) to create branch from (default: main)' },
                // Search
                query: { type: 'string', description: 'Search query (for search_code)' },
                // Pagination
                per_page: { type: 'number', description: 'Results per page (default: 10, max: 30)' },
                state: { type: 'string', description: 'Filter by state: open | closed | all (default: open)' },
            },
            required: ['action'],
        };
    }

    private get headers(): Record<string, string> {
        const h: Record<string, string> = {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'NexusClaw/1.0',
            'X-GitHub-Api-Version': '2022-11-28',
        };
        if (this.token) h['Authorization'] = `Bearer ${this.token}`;
        return h;
    }

    private async request(method: string, path: string, body?: unknown): Promise<any> {
        if (!this.token) {
            throw new Error('GITHUB_TOKEN not configured. Add it to your .env file.');
        }
        const res = await fetch(`${GITHUB_API}${path}`, {
            method,
            headers: this.headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(20000),
        });

        const text = await res.text();
        let data: any;
        try { data = JSON.parse(text); } catch { data = { message: text }; }

        if (!res.ok) {
            const msg = data?.message || data?.errors?.[0]?.message || 'Unknown error';
            throw new Error(`GitHub API ${res.status}: ${msg}`);
        }
        return data;
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const action = String(params.action);
        const owner = params.owner ? String(params.owner) : '';
        const repo = params.repo ? String(params.repo) : '';
        const perPage = Math.min(Number(params.per_page || 10), 30);
        const state = String(params.state || 'open');

        try {
            switch (action) {

                case 'get_repo_info': {
                    if (!owner || !repo) return 'Error: owner and repo required';
                    const data = await this.request('GET', `/repos/${owner}/${repo}`);
                    return [
                        `## ${data.full_name}`,
                        `**Description:** ${data.description || 'N/A'}`,
                        `**Stars:** ⭐ ${data.stargazers_count.toLocaleString()} | **Forks:** 🍴 ${data.forks_count}`,
                        `**Language:** ${data.language || 'N/A'}`,
                        `**Default branch:** \`${data.default_branch}\``,
                        `**Open issues:** ${data.open_issues_count}`,
                        `**Created:** ${new Date(data.created_at).toLocaleDateString()}`,
                        `**URL:** ${data.html_url}`,
                    ].join('\n');
                }

                case 'list_prs': {
                    if (!owner || !repo) return 'Error: owner and repo required';
                    const prs = await this.request('GET', `/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}`);
                    if (prs.length === 0) return `No ${state} pull requests found in ${owner}/${repo}.`;
                    return [
                        `## Pull Requests — ${owner}/${repo} (${state})`,
                        ...prs.map((pr: any) => [
                            `\n### #${pr.number}: ${pr.title}`,
                            `**Status:** ${pr.draft ? '📋 Draft' : '🟢 Ready'} | **By:** @${pr.user.login}`,
                            `**Branch:** \`${pr.head.ref}\` → \`${pr.base.ref}\``,
                            `**Created:** ${new Date(pr.created_at).toLocaleDateString()}`,
                            `**URL:** ${pr.html_url}`,
                            pr.body ? `**Description:** ${pr.body.slice(0, 200)}${pr.body.length > 200 ? '...' : ''}` : '',
                        ].filter(Boolean).join('\n')),
                    ].join('\n');
                }

                case 'get_pr': {
                    if (!owner || !repo || !params.number) return 'Error: owner, repo, number required';
                    const pr = await this.request('GET', `/repos/${owner}/${repo}/pulls/${params.number}`);
                    const reviews = await this.request('GET', `/repos/${owner}/${repo}/pulls/${params.number}/reviews`);
                    const files = await this.request('GET', `/repos/${owner}/${repo}/pulls/${params.number}/files`);
                    return [
                        `## PR #${pr.number}: ${pr.title}`,
                        `**Author:** @${pr.user.login} | **State:** ${pr.state} | **Draft:** ${pr.draft}`,
                        `**Branch:** \`${pr.head.ref}\` → \`${pr.base.ref}\``,
                        `**Commits:** ${pr.commits} | **Files:** ${pr.changed_files} | **+${pr.additions}/-${pr.deletions}**`,
                        `**Mergeable:** ${pr.mergeable ?? 'unknown'} | **Labels:** ${pr.labels.map((l: any) => l.name).join(', ') || 'none'}`,
                        `\n**Description:**\n${pr.body || 'No description'}`,
                        `\n**Reviews (${reviews.length}):**`,
                        ...reviews.map((r: any) => `- @${r.user.login}: **${r.state}** — ${r.body?.slice(0, 100) || ''}`),
                        `\n**Changed Files (${files.length}):**`,
                        ...files.slice(0, 20).map((f: any) => `- \`${f.filename}\` +${f.additions}/-${f.deletions} [${f.status}]`),
                    ].join('\n');
                }

                case 'get_diff': {
                    if (!owner || !repo || !params.number) return 'Error: owner, repo, number required';
                    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${params.number}`, {
                        headers: { ...this.headers, 'Accept': 'application/vnd.github.v3.diff' },
                    });
                    if (!res.ok) return `Error: HTTP ${res.status}`;
                    const diff = await res.text();
                    return diff.length > 20000 ? diff.slice(0, 20000) + '\n... (diff truncated)' : diff;
                }

                case 'create_pr': {
                    if (!owner || !repo) return 'Error: owner and repo required';
                    if (!params.title || !params.head) return 'Error: title and head branch required';
                    const pr = await this.request('POST', `/repos/${owner}/${repo}/pulls`, {
                        title: params.title,
                        body: params.body || '',
                        head: params.head,
                        base: params.base || 'main',
                        draft: params.draft || false,
                    });
                    return [
                        `✅ **Pull Request Created!**`,
                        `**#${pr.number}:** ${pr.title}`,
                        `**URL:** ${pr.html_url}`,
                        `**Branch:** \`${pr.head.ref}\` → \`${pr.base.ref}\``,
                    ].join('\n');
                }

                case 'merge_pr': {
                    if (!owner || !repo || !params.number) return 'Error: owner, repo, number required';
                    const result = await this.request('PUT', `/repos/${owner}/${repo}/pulls/${params.number}/merge`, {
                        commit_title: params.title || `Merge pull request #${params.number}`,
                        commit_message: params.body || '',
                        merge_method: 'squash',
                    });
                    return `✅ PR #${params.number} merged! SHA: \`${result.sha}\``;
                }

                case 'comment_issue': {
                    if (!owner || !repo || !params.number || !params.body) return 'Error: owner, repo, number, body required';
                    const comment = await this.request('POST', `/repos/${owner}/${repo}/issues/${params.number}/comments`, {
                        body: String(params.body),
                    });
                    return `✅ Comment posted on #${params.number}: ${comment.html_url}`;
                }

                case 'list_issues': {
                    if (!owner || !repo) return 'Error: owner and repo required';
                    const issues = await this.request('GET', `/repos/${owner}/${repo}/issues?state=${state}&per_page=${perPage}`);
                    if (issues.length === 0) return `No ${state} issues found.`;
                    return [
                        `## Issues — ${owner}/${repo} (${state})`,
                        ...issues
                            .filter((i: any) => !i.pull_request) // exclude PRs from issues list
                            .map((i: any) => `- **#${i.number}** [${i.labels.map((l: any) => l.name).join(', ') || 'no labels'}] ${i.title} — @${i.user.login}`),
                    ].join('\n');
                }

                case 'close_issue': {
                    if (!owner || !repo || !params.number) return 'Error: owner, repo, number required';
                    await this.request('PATCH', `/repos/${owner}/${repo}/issues/${params.number}`, { state: 'closed' });
                    return `✅ Issue #${params.number} closed.`;
                }

                case 'create_branch': {
                    if (!owner || !repo || !params.branch) return 'Error: owner, repo, branch required';
                    const fromRef = String(params.from_ref || 'main');
                    // Get SHA of ref
                    const ref = await this.request('GET', `/repos/${owner}/${repo}/git/ref/heads/${fromRef}`);
                    const sha = ref.object.sha;
                    await this.request('POST', `/repos/${owner}/${repo}/git/refs`, {
                        ref: `refs/heads/${params.branch}`,
                        sha,
                    });
                    return `✅ Branch \`${params.branch}\` created from \`${fromRef}\` (SHA: ${sha.slice(0, 7)})`;
                }

                case 'list_commits': {
                    if (!owner || !repo) return 'Error: owner and repo required';
                    const commits = await this.request('GET', `/repos/${owner}/${repo}/commits?per_page=${perPage}`);
                    return [
                        `## Recent Commits — ${owner}/${repo}`,
                        ...commits.map((c: any) => [
                            `- **${c.sha.slice(0, 7)}** ${c.commit.message.split('\n')[0]}`,
                            `  👤 ${c.commit.author.name} | 📅 ${new Date(c.commit.author.date).toLocaleDateString()}`,
                        ].join('\n')),
                    ].join('\n');
                }

                case 'search_code': {
                    if (!params.query) return 'Error: query required';
                    const q = repo && owner ? `${params.query}+repo:${owner}/${repo}` : String(params.query);
                    const results = await this.request('GET', `/search/code?q=${encodeURIComponent(q)}&per_page=${perPage}`);
                    if (results.total_count === 0) return `No results found for "${params.query}"`;
                    return [
                        `## Code Search: "${params.query}" (${results.total_count} total)`,
                        ...results.items.slice(0, 10).map((item: any) =>
                            `- **${item.repository.full_name}** → \`${item.path}\`\n  ${item.html_url}`
                        ),
                    ].join('\n');
                }

                default:
                    return `Unknown action: "${action}". Valid: list_prs, get_pr, create_pr, comment_issue, get_diff, create_branch, list_issues, close_issue, get_repo_info, search_code, list_commits, merge_pr`;
            }
        } catch (e) {
            return `GitHub Error: ${e instanceof Error ? e.message : String(e)}`;
        }
    }
}
