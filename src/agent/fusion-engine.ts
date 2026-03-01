/**
 * Fusion Engine — Dynamic Skill Sharing Between Agents.
 *
 * Core concepts:
 *   - Skill Registry: each agent has a set of skills/tools they specialize in
 *   - Skill Transfer: an agent can "borrow" another agent's skill temporarily
 *   - Skill Injection: inject a capability into an agent for a specific task
 *   - Skill Composition: combine multiple agents' skills into a hybrid agent
 *   - Fusion Session: a temporary merged agent with combined capabilities
 *
 * Unlike silos: agents here share tools, knowledge, and context dynamically.
 */

import type { Database } from '../db/database.js';
import type { ToolRegistry } from '../tools/registry.js';

export interface AgentSkillProfile {
    agentId: string;
    agentName: string;
    department: string;
    skills: string[];           // skill/tool names this agent specializes in
    shareableSkills: string[];  // skills available for lending
    borrowedSkills: string[];   // skills currently borrowed from others
}

export interface SkillTransfer {
    id: string;
    sourceAgentId: string;
    targetAgentId: string;
    skill: string;
    status: 'active' | 'returned' | 'expired';
    createdAt: number;
    expiresAt: number;
    reason: string;
}

export interface FusionSession {
    id: string;
    name: string;
    agentIds: string[];        // participating agents
    combinedSkills: string[];  // all skills available in this fusion
    status: 'active' | 'completed' | 'dissolved';
    createdAt: number;
    taskDescription: string;
}

// Default skill mappings for NexusClaw agents
const AGENT_SKILL_MAP: Record<string, { department: string; skills: string[] }> = {
    'agent-001': { department: 'planning', skills: ['strategic_planning', 'task_delegation', 'resource_allocation', 'risk_assessment', 'code_analyze', 'code_find_usages'] },
    'agent-002': { department: 'development', skills: ['code_writing', 'code_review', 'debugging', 'architecture_design', 'refactoring', 'github', 'code_diff'] },
    'agent-003': { department: 'research', skills: ['web_search', 'data_analysis', 'web_fetch', 'information_synthesis', 'competitive_analysis', 'browse'] },
    'agent-004': { department: 'qa', skills: ['test_writing', 'bug_detection', 'regression_testing', 'performance_analysis', 'security_audit', 'code_find_usages'] },
    'agent-005': { department: 'devsecops', skills: ['infrastructure', 'deployment', 'monitoring', 'security_scanning', 'exec', 'container_management'] },
    'agent-006': { department: 'operations', skills: ['reporting', 'communication', 'scheduling', 'documentation', 'message', 'project_management'] },
};

// Tool-to-skill mapping (which tools enable which skills)
const TOOL_SKILL_MAP: Record<string, string[]> = {
    'web_search': ['research', 'competitive_analysis', 'information_gathering'],
    'web_fetch': ['data_extraction', 'web_scraping', 'content_analysis'],
    'browse': ['visual_inspection', 'ui_testing', 'interactive_research'],
    'read_file': ['code_reading', 'file_analysis', 'documentation_review'],
    'write_file': ['code_writing', 'file_creation', 'documentation'],
    'edit_file': ['code_modification', 'refactoring', 'bug_fixing'],
    'exec': ['system_administration', 'build_management', 'testing'],
    'github': ['version_control', 'code_review', 'collaboration', 'pr_management'],
    'code_find_usages': ['impact_analysis', 'refactoring_planning', 'dependency_tracking'],
    'code_analyze': ['complexity_analysis', 'architecture_review', 'code_quality'],
    'code_diff': ['change_review', 'regression_detection', 'version_comparison'],
    'swarm_run': ['parallel_execution', 'bulk_analysis', 'distributed_processing'],
};

export class FusionEngine {
    private activeTransfers = new Map<string, SkillTransfer>();
    private activeSessions = new Map<string, FusionSession>();

    constructor(private db: Database) { }

    /** Get the skill profile for an agent */
    getProfile(agentId: string): AgentSkillProfile {
        const agent = this.db.getAgent(agentId);
        const defaultMap = AGENT_SKILL_MAP[agentId] || { department: 'general', skills: [] };

        // Get borrowed skills
        const borrowed = [...this.activeTransfers.values()]
            .filter(t => t.targetAgentId === agentId && t.status === 'active')
            .map(t => t.skill);

        // Get lent out skills
        const lent = [...this.activeTransfers.values()]
            .filter(t => t.sourceAgentId === agentId && t.status === 'active')
            .map(t => t.skill);

        const ownSkills = [...defaultMap.skills];
        const shareable = ownSkills.filter(s => !lent.includes(s));

        return {
            agentId,
            agentName: agent?.name || agentId,
            department: agent?.department_id || defaultMap.department,
            skills: [...ownSkills, ...borrowed],
            shareableSkills: shareable,
            borrowedSkills: borrowed,
        };
    }

    /** Borrow a skill from one agent to another */
    borrowSkill(sourceAgentId: string, targetAgentId: string, skill: string, reason: string, durationMs = 300_000): SkillTransfer {
        const sourceProfile = this.getProfile(sourceAgentId);
        if (!sourceProfile.shareableSkills.includes(skill)) {
            throw new Error(`Agent ${sourceAgentId} doesn't have shareable skill: ${skill}. Available: ${sourceProfile.shareableSkills.join(', ')}`);
        }

        const id = `stx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
        const transfer: SkillTransfer = {
            id,
            sourceAgentId,
            targetAgentId,
            skill,
            status: 'active',
            createdAt: Date.now(),
            expiresAt: Date.now() + durationMs,
            reason,
        };

        this.activeTransfers.set(id, transfer);

        // Persist to DB
        this.db.addSkillTransfer({
            id,
            source_agent_id: sourceAgentId,
            target_agent_id: targetAgentId,
            skill,
            status: 'active',
            expires_at: transfer.expiresAt,
            reason,
        });

        return transfer;
    }

    /** Return a borrowed skill */
    returnSkill(transferId: string): void {
        const transfer = this.activeTransfers.get(transferId);
        if (transfer) {
            transfer.status = 'returned';
            this.activeTransfers.delete(transferId);
            this.db.updateSkillTransfer(transferId, { status: 'returned' });
        }
    }

    /** Create a fusion session — merge multiple agents' skills */
    createFusion(name: string, agentIds: string[], taskDescription: string): FusionSession {
        const id = `fusion_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;

        // Collect all skills from all agents
        const allSkills = new Set<string>();
        for (const agentId of agentIds) {
            const profile = this.getProfile(agentId);
            profile.skills.forEach(s => allSkills.add(s));
        }

        const session: FusionSession = {
            id,
            name,
            agentIds,
            combinedSkills: [...allSkills],
            status: 'active',
            createdAt: Date.now(),
            taskDescription,
        };

        this.activeSessions.set(id, session);

        // Persist
        this.db.addFusionSession({
            id,
            name,
            agent_ids: JSON.stringify(agentIds),
            combined_skills: JSON.stringify([...allSkills]),
            status: 'active',
            task_description: taskDescription,
        });

        return session;
    }

    /** Dissolve a fusion session */
    dissolveFusion(fusionId: string): void {
        const session = this.activeSessions.get(fusionId);
        if (session) {
            session.status = 'dissolved';
            this.activeSessions.delete(fusionId);
            this.db.updateFusionSession(fusionId, { status: 'dissolved' });
        }
    }

    /** Get all active transfers */
    getActiveTransfers(): SkillTransfer[] {
        // Clean up expired transfers
        const now = Date.now();
        for (const [id, transfer] of this.activeTransfers) {
            if (transfer.expiresAt < now) {
                transfer.status = 'expired';
                this.activeTransfers.delete(id);
                this.db.updateSkillTransfer(id, { status: 'expired' });
            }
        }
        return [...this.activeTransfers.values()];
    }

    /** Get all active fusion sessions */
    getActiveFusions(): FusionSession[] {
        return [...this.activeSessions.values()].filter(s => s.status === 'active');
    }

    /** Get what tools a skill maps to */
    getToolsForSkill(skill: string): string[] {
        const tools: string[] = [];
        for (const [tool, skills] of Object.entries(TOOL_SKILL_MAP)) {
            if (skills.includes(skill)) tools.push(tool);
        }
        return tools;
    }

    /** Get the enhanced tool set for an agent (original + borrowed tools) */
    getEnhancedTools(agentId: string): string[] {
        const profile = this.getProfile(agentId);
        const allTools = new Set<string>();

        for (const skill of profile.skills) {
            const tools = this.getToolsForSkill(skill);
            tools.forEach(t => allTools.add(t));
        }

        return [...allTools];
    }

    /** Suggest which agent to borrow from for a specific need */
    suggestSkillSource(neededSkill: string): Array<{ agentId: string; agentName: string; confidence: number }> {
        const suggestions: Array<{ agentId: string; agentName: string; confidence: number }> = [];

        for (const [agentId, mapping] of Object.entries(AGENT_SKILL_MAP)) {
            const agent = this.db.getAgent(agentId);
            if (mapping.skills.includes(neededSkill)) {
                const profile = this.getProfile(agentId);
                const isAvailable = profile.shareableSkills.includes(neededSkill);
                suggestions.push({
                    agentId,
                    agentName: agent?.name || agentId,
                    confidence: isAvailable ? 1.0 : 0.3,
                });
            }
        }

        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }
}
