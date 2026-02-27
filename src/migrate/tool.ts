/**
 * Migration Tool - Import configuration and workspace from other AI agent platforms
 * Supports importing from various agent framework installations
 */

import { existsSync, readFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getHomeDir, getWorkspaceDir, saveConfig, type Config } from '../config/schema.js';

export interface MigrationResult {
    success: boolean;
    message: string;
    warnings?: string[];
}

export class MigrationTool {
    /** Import from legacy agent platform (Type A) */
    async migrateFromLegacyPlatformA(sourcePath: string): Promise<MigrationResult> {
        const warnings: string[] = [];

        if (!existsSync(sourcePath)) {
            return {
                success: false,
                message: `Source directory not found: ${sourcePath}`,
            };
        }

        try {
            // Migrate config
            const sourceConfig = join(sourcePath, 'config.yaml');
            if (existsSync(sourceConfig)) {
                warnings.push('Config migration from YAML not fully implemented - manual review needed');
            }

            // Migrate workspace files
            const sourceWorkspace = join(sourcePath, 'workspace');
            if (existsSync(sourceWorkspace)) {
                const nexusWorkspace = getWorkspaceDir();
                mkdirSync(nexusWorkspace, { recursive: true });

                // Copy workspace files
                const workspaceFiles = ['AGENT.md', 'IDENTITY.md', 'SOUL.md', 'USER.md'];
                for (const file of workspaceFiles) {
                    const src = join(sourceWorkspace, file);
                    const dest = join(nexusWorkspace, file);
                    if (existsSync(src)) {
                        copyFileSync(src, dest);
                    }
                }
            }

            // Migrate skills
            const sourceSkills = join(sourcePath, 'skills');
            if (existsSync(sourceSkills)) {
                const nexusSkills = join(getWorkspaceDir(), 'skills');
                mkdirSync(nexusSkills, { recursive: true });
                warnings.push('Skills directory found - manual migration recommended');
            }

            return {
                success: true,
                message: 'Migration completed successfully',
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        } catch (err) {
            return {
                success: false,
                message: `Migration failed: ${err}`,
            };
        }
    }

    /** Import from legacy agent platform (Type B) */
    async migrateFromLegacyPlatformB(sourcePath: string): Promise<MigrationResult> {
        const warnings: string[] = [];

        if (!existsSync(sourcePath)) {
            return {
                success: false,
                message: `Source directory not found: ${sourcePath}`,
            };
        }

        try {
            // Migrate workspace
            const sourceWorkspace = join(sourcePath, 'workspace');
            if (existsSync(sourceWorkspace)) {
                const nexusWorkspace = getWorkspaceDir();
                mkdirSync(nexusWorkspace, { recursive: true });

                // Copy AGENTS.md and split if needed
                const agentsFile = join(sourceWorkspace, 'AGENTS.md');
                if (existsSync(agentsFile)) {
                    copyFileSync(agentsFile, join(nexusWorkspace, 'AGENT.md'));
                    warnings.push('AGENTS.md copied as AGENT.md - consider splitting into IDENTITY.md and SOUL.md');
                }
            }

            return {
                success: true,
                message: 'Migration completed successfully',
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        } catch (err) {
            return {
                success: false,
                message: `Migration failed: ${err}`,
            };
        }
    }

    /** Detect existing agent platform installations */
    detectExistingInstallations(): { platform: string; path: string }[] {
        const installations: { platform: string; path: string }[] = [];
        const homeDir = require('os').homedir();

        // Check for legacy platform A
        const pathA = join(homeDir, '.picoclaw');
        if (existsSync(pathA)) {
            installations.push({ platform: 'Legacy Platform A', path: pathA });
        }

        // Check for legacy platform B
        const pathB = join(homeDir, '.openclaw');
        if (existsSync(pathB)) {
            installations.push({ platform: 'Legacy Platform B', path: pathB });
        }

        return installations;
    }
}
