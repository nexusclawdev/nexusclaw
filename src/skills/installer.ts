/**
 * Skills Installer - Install/remove skills from marketplace
 * Dynamic skill management with version control
 */

import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SkillsRegistry } from './registry.js';

export interface InstallResult {
    success: boolean;
    message: string;
}

export class SkillsInstaller {
    private registry: SkillsRegistry;

    constructor() {
        this.registry = new SkillsRegistry();
    }

    /** Install a skill from marketplace or URL */
    async install(skillId: string, source?: string): Promise<InstallResult> {
        // Check if already installed
        if (this.registry.hasSkill(skillId)) {
            return {
                success: false,
                message: `Skill '${skillId}' is already installed`,
            };
        }

        const skillsDir = this.registry.getSkillsDir();
        const skillPath = join(skillsDir, skillId);

        try {
            // Create skill directory
            mkdirSync(skillPath, { recursive: true });

            // Fetch skill from source
            let skillData: any;

            if (source) {
                // Install from custom URL or path
                skillData = await this.fetchFromSource(source, skillId);
            } else {
                // Install from GitHub registry
                skillData = await this.fetchFromRegistry(skillId);
            }

            if (!skillData) {
                rmSync(skillPath, { recursive: true, force: true });
                return {
                    success: false,
                    message: `Skill '${skillId}' not found in registry`,
                };
            }

            // Write skill metadata
            writeFileSync(
                join(skillPath, 'skill.json'),
                JSON.stringify(skillData.metadata, null, 2),
                'utf-8'
            );

            // Write skill content
            writeFileSync(
                join(skillPath, 'skill.md'),
                skillData.content || `# ${skillData.metadata.name}\n\n${skillData.metadata.description}`,
                'utf-8'
            );

            return {
                success: true,
                message: `Skill '${skillId}' installed successfully`,
            };
        } catch (err) {
            // Cleanup on failure
            if (existsSync(skillPath)) {
                rmSync(skillPath, { recursive: true, force: true });
            }
            return {
                success: false,
                message: `Failed to install skill: ${err}`,
            };
        }
    }

    /** Fetch skill from GitHub registry */
    private async fetchFromRegistry(skillId: string): Promise<any> {
        try {
            const baseUrl = 'https://raw.githubusercontent.com/nexusclaw/skills-registry/main/skills';

            // Fetch metadata
            const metadataResponse = await fetch(`${baseUrl}/${skillId}/skill.json`, {
                signal: AbortSignal.timeout(10000),
            });

            if (!metadataResponse.ok) {
                return null;
            }

            const metadata = await metadataResponse.json();

            // Fetch content
            const contentResponse = await fetch(`${baseUrl}/${skillId}/skill.md`, {
                signal: AbortSignal.timeout(10000),
            });

            const content = contentResponse.ok ? await contentResponse.text() : null;

            return { metadata, content };
        } catch (err) {
            console.warn(`[SkillsInstaller] Failed to fetch from registry: ${err}`);
            return null;
        }
    }

    /** Fetch skill from custom source */
    private async fetchFromSource(source: string, skillId: string): Promise<any> {
        // Check if source is a URL
        if (source.startsWith('http://') || source.startsWith('https://')) {
            try {
                const response = await fetch(source, {
                    signal: AbortSignal.timeout(10000),
                });

                if (!response.ok) {
                    return null;
                }

                const data = await response.json();
                return {
                    metadata: data.metadata || data,
                    content: data.content || null,
                };
            } catch (err) {
                console.warn(`[SkillsInstaller] Failed to fetch from URL: ${err}`);
                return null;
            }
        }

        // Check if source is a local file path
        if (existsSync(source)) {
            try {
                const data = JSON.parse(readFileSync(source, 'utf-8'));
                return {
                    metadata: data.metadata || data,
                    content: data.content || null,
                };
            } catch (err) {
                console.warn(`[SkillsInstaller] Failed to read from file: ${err}`);
                return null;
            }
        }

        return null;
    }

    /** Remove an installed skill */
    async remove(skillId: string): Promise<InstallResult> {
        const skill = this.registry.getSkill(skillId);

        if (!skill) {
            return {
                success: false,
                message: `Skill '${skillId}' not found`,
            };
        }

        if (skill.type === 'builtin') {
            return {
                success: false,
                message: `Cannot remove built-in skill '${skillId}'`,
            };
        }

        try {
            rmSync(skill.path, { recursive: true, force: true });
            return {
                success: true,
                message: `Skill '${skillId}' removed successfully`,
            };
        } catch (err) {
            return {
                success: false,
                message: `Failed to remove skill: ${err}`,
            };
        }
    }
}
