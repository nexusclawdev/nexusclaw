/**
 * Skills Registry - Manages built-in and custom skills
 * Marketplace integration for dynamic skill management
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getWorkspaceDir } from '../config/schema.js';

export interface Skill {
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    type: 'builtin' | 'custom';
    path: string;
    enabled: boolean;
}

export interface SkillMetadata {
    name: string;
    description: string;
    version: string;
    author: string;
    dependencies?: string[];
}

export class SkillsRegistry {
    private skillsDir: string;
    private builtinSkillsDir: string;

    constructor() {
        this.skillsDir = join(getWorkspaceDir(), 'skills');
        this.builtinSkillsDir = join(process.cwd(), 'skills');
        this.ensureSkillsDir();
    }

    private ensureSkillsDir(): void {
        if (!existsSync(this.skillsDir)) {
            mkdirSync(this.skillsDir, { recursive: true });
        }
    }

    /** List all available skills */
    listSkills(): Skill[] {
        const skills: Skill[] = [];

        // Load built-in skills
        if (existsSync(this.builtinSkillsDir)) {
            const builtinDirs = readdirSync(this.builtinSkillsDir, { withFileTypes: true });
            for (const dir of builtinDirs) {
                if (dir.isDirectory()) {
                    const skillPath = join(this.builtinSkillsDir, dir.name);
                    const metadataPath = join(skillPath, 'skill.json');
                    if (existsSync(metadataPath)) {
                        const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8')) as SkillMetadata;
                        skills.push({
                            id: dir.name,
                            name: metadata.name,
                            description: metadata.description,
                            version: metadata.version,
                            author: metadata.author,
                            type: 'builtin',
                            path: skillPath,
                            enabled: true,
                        });
                    }
                }
            }
        }

        // Load custom skills
        if (existsSync(this.skillsDir)) {
            const customDirs = readdirSync(this.skillsDir, { withFileTypes: true });
            for (const dir of customDirs) {
                if (dir.isDirectory()) {
                    const skillPath = join(this.skillsDir, dir.name);
                    const metadataPath = join(skillPath, 'skill.json');
                    if (existsSync(metadataPath)) {
                        const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8')) as SkillMetadata;
                        skills.push({
                            id: dir.name,
                            name: metadata.name,
                            description: metadata.description,
                            version: metadata.version,
                            author: metadata.author,
                            type: 'custom',
                            path: skillPath,
                            enabled: true,
                        });
                    }
                }
            }
        }

        return skills;
    }

    /** Get a specific skill by ID */
    getSkill(id: string): Skill | null {
        const skills = this.listSkills();
        return skills.find(s => s.id === id) || null;
    }

    /** Get skill content (markdown) */
    getSkillContent(id: string): string | null {
        const skill = this.getSkill(id);
        if (!skill) return null;

        const mdPath = join(skill.path, 'skill.md');
        if (!existsSync(mdPath)) return null;

        return readFileSync(mdPath, 'utf-8');
    }

    /** Check if a skill exists */
    hasSkill(id: string): boolean {
        return this.getSkill(id) !== null;
    }

    /** Get skills directory path */
    getSkillsDir(): string {
        return this.skillsDir;
    }
}
