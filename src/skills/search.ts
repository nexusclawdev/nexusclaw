/**
 * Skills Search - Search and discover skills from marketplace
 */

export interface SearchResult {
    id: string;
    name: string;
    description: string;
    author: string;
    downloads: number;
    rating: number;
    tags: string[];
    version?: string;
    repository?: string;
}

export class SkillsSearch {
    private cache: SearchResult[] | null = null;
    private cacheTimestamp: number = 0;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    /** Fetch skills from GitHub repository or local registry */
    private async fetchSkills(): Promise<SearchResult[]> {
        // Check cache first
        if (this.cache && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
            return this.cache;
        }

        try {
            // Try to fetch from GitHub skills repository
            const response = await fetch('https://raw.githubusercontent.com/nexusclaw/skills-registry/main/registry.json', {
                signal: AbortSignal.timeout(5000),
            });

            if (response.ok) {
                const data = await response.json();
                const skills = Array.isArray(data.skills) ? data.skills : [];
                this.cache = skills;
                this.cacheTimestamp = Date.now();
                return skills;
            }
        } catch (err) {
            // Fallback to local built-in skills if network fails
            console.warn('[SkillsSearch] Failed to fetch from remote registry, using local skills');
        }

        // Fallback to local built-in skills
        const localSkills: SearchResult[] = [
            {
                id: 'web-search',
                name: 'Web Search',
                description: 'Search the internet for information using multiple search engines',
                author: 'NexusClaw',
                downloads: 0,
                rating: 5.0,
                tags: ['search', 'web', 'utility'],
                version: '1.0.0',
            },
            {
                id: 'file-manager',
                name: 'File Manager',
                description: 'Advanced file operations including batch processing and organization',
                author: 'NexusClaw',
                downloads: 0,
                rating: 5.0,
                tags: ['files', 'utility', 'productivity'],
                version: '1.0.0',
            },
            {
                id: 'code-analyzer',
                name: 'Code Analyzer',
                description: 'Analyze code quality, detect issues, and suggest improvements',
                author: 'NexusClaw',
                downloads: 0,
                rating: 5.0,
                tags: ['code', 'analysis', 'development'],
                version: '1.0.0',
            },
        ];

        this.cache = localSkills;
        this.cacheTimestamp = Date.now();
        return localSkills;
    }

    /** Search for skills on marketplace */
    async search(query: string): Promise<SearchResult[]> {
        const allSkills = await this.fetchSkills();

        if (!query) return allSkills;

        const lowerQuery = query.toLowerCase();
        return allSkills.filter(
            r =>
                r.name.toLowerCase().includes(lowerQuery) ||
                r.description.toLowerCase().includes(lowerQuery) ||
                r.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
                r.id.toLowerCase().includes(lowerQuery)
        );
    }

    /** Get featured skills */
    async getFeatured(): Promise<SearchResult[]> {
        const allSkills = await this.fetchSkills();
        // Return top rated skills
        return allSkills
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 10);
    }

    /** Clear cache to force refresh */
    clearCache(): void {
        this.cache = null;
        this.cacheTimestamp = 0;
    }
}
