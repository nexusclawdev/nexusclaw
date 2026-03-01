/**
 * Skill Fusion Tool — Dynamic skill sharing, borrowing, injection, and composition
 * between agents. Makes agents collaborative instead of siloed.
 *
 * Actions:
 *   - list_agents: view all agent skill profiles
 *   - borrow_skill: temporarily borrow a skill from another agent
 *   - return_skill: return a borrowed skill
 *   - create_fusion: merge multiple agents into a hybrid for a task
 *   - dissolve_fusion: end a fusion session
 *   - suggest: suggest which agent to borrow a specific skill from
 *   - status: view active transfers and fusions
 *   - inject: inject a tool capability into an agent temporarily
 */

import { Tool, ToolParameters } from './base.js';
import { FusionEngine } from '../agent/fusion-engine.js';

export class SkillFusionTool extends Tool {
    constructor(private engine: FusionEngine) { super(); }

    get name() { return 'skill_fusion'; }
    get description() {
        return 'Collaborative Agent Skill Fusion: dynamically share, borrow, inject, and compose skills between agents. ' +
            'Agents can temporarily acquire each other\'s capabilities. Create fusion sessions to merge multiple agents ' +
            'into a hybrid super-agent. Actions: list_agents, borrow_skill, return_skill, create_fusion, dissolve_fusion, ' +
            'suggest, status, inject.';
    }
    get parameters(): ToolParameters {
        return {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: 'Action: list_agents | borrow_skill | return_skill | create_fusion | dissolve_fusion | suggest | status | inject',
                },
                // borrow_skill / inject
                source_agent: { type: 'string', description: 'Agent ID to borrow from (e.g., "agent-003")' },
                target_agent: { type: 'string', description: 'Agent ID to transfer skill to (e.g., "agent-002")' },
                skill: { type: 'string', description: 'Skill name to borrow/inject (e.g., "web_search", "code_review")' },
                reason: { type: 'string', description: 'Why the skill is needed' },
                duration: { type: 'number', description: 'Duration in seconds (default: 300, max: 3600)' },

                // create_fusion
                name: { type: 'string', description: 'Name for the fusion session (e.g., "Full-Stack Review")' },
                agent_ids: {
                    type: 'string',
                    description: 'Comma-separated agent IDs to fuse (e.g., "agent-001,agent-002,agent-003")',
                },
                task: { type: 'string', description: 'Task description for the fusion' },

                // dissolve / return
                transfer_id: { type: 'string', description: 'Transfer ID to return' },
                fusion_id: { type: 'string', description: 'Fusion session ID to dissolve' },

                // for suggest
                needed_skill: { type: 'string', description: 'Skill you need (for suggest action)' },
            },
            required: ['action'],
        };
    }

    async execute(params: Record<string, unknown>): Promise<string> {
        const action = String(params.action);

        try {
            switch (action) {

                case 'list_agents': {
                    const agentIds = ['agent-001', 'agent-002', 'agent-003', 'agent-004', 'agent-005', 'agent-006'];
                    const profiles = agentIds.map(id => this.engine.getProfile(id));

                    const lines = [
                        '## 🤝 Agent Skill Profiles',
                        '',
                    ];

                    for (const p of profiles) {
                        const borrowed = p.borrowedSkills.length > 0 ? ` | 📥 Borrowed: ${p.borrowedSkills.join(', ')}` : '';
                        lines.push(`### ${p.agentName} (\`${p.agentId}\`) — ${p.department}`);
                        lines.push(`**Skills:** ${p.skills.join(', ')}`);
                        lines.push(`**Shareable:** ${p.shareableSkills.join(', ')}${borrowed}`);
                        lines.push('');
                    }

                    return lines.join('\n');
                }

                case 'borrow_skill': {
                    const src = String(params.source_agent || '');
                    const tgt = String(params.target_agent || '');
                    const skill = String(params.skill || '');
                    const reason = String(params.reason || 'task requirement');
                    const duration = Math.min(Number(params.duration || 300), 3600) * 1000;

                    if (!src || !tgt || !skill) return 'Error: source_agent, target_agent, and skill required';

                    const transfer = this.engine.borrowSkill(src, tgt, skill, reason, duration);

                    const srcProfile = this.engine.getProfile(src);
                    const tgtProfile = this.engine.getProfile(tgt);

                    return [
                        `## ⚡ Skill Borrowed!`,
                        `**Transfer ID:** \`${transfer.id}\``,
                        `**Skill:** \`${skill}\``,
                        `**From:** ${srcProfile.agentName} (${src})`,
                        `**To:** ${tgtProfile.agentName} (${tgt})`,
                        `**Reason:** ${reason}`,
                        `**Expires:** ${Math.round(duration / 1000)}s`,
                        '',
                        `${tgtProfile.agentName} now has: **${tgtProfile.skills.join(', ')}**`,
                        '',
                        `> When done, return with: \`skill_fusion(action: "return_skill", transfer_id: "${transfer.id}")\``,
                    ].join('\n');
                }

                case 'return_skill': {
                    const transferId = String(params.transfer_id || '');
                    if (!transferId) return 'Error: transfer_id required';
                    this.engine.returnSkill(transferId);
                    return `✅ Skill returned. Transfer \`${transferId}\` closed.`;
                }

                case 'create_fusion': {
                    const name = String(params.name || 'Fusion Session');
                    const agentIdsStr = String(params.agent_ids || '');
                    const task = String(params.task || 'collaborative task');
                    if (!agentIdsStr) return 'Error: agent_ids required (comma-separated)';

                    const agentIds = agentIdsStr.split(',').map(s => s.trim()).filter(Boolean);
                    if (agentIds.length < 2) return 'Error: at least 2 agents required for fusion';

                    const fusion = this.engine.createFusion(name, agentIds, task);

                    const profiles = agentIds.map(id => this.engine.getProfile(id));
                    const allSkills = fusion.combinedSkills;

                    return [
                        `## 🔥 Fusion Session Created!`,
                        `**ID:** \`${fusion.id}\``,
                        `**Name:** ${fusion.name}`,
                        `**Task:** ${task}`,
                        '',
                        '### Fused Agents:',
                        ...profiles.map(p => `- **${p.agentName}** — brings: ${p.skills.join(', ')}`),
                        '',
                        `### 🧬 Combined Capabilities (${allSkills.length} skills):`,
                        allSkills.join(', '),
                        '',
                        `> This hybrid agent can now perform tasks that normally require ${agentIds.length} separate agents!`,
                        `> Dissolve when done: \`skill_fusion(action: "dissolve_fusion", fusion_id: "${fusion.id}")\``,
                    ].join('\n');
                }

                case 'dissolve_fusion': {
                    const fusionId = String(params.fusion_id || '');
                    if (!fusionId) return 'Error: fusion_id required';
                    this.engine.dissolveFusion(fusionId);
                    return `✅ Fusion session \`${fusionId}\` dissolved. All agents returned to their original skill sets.`;
                }

                case 'suggest': {
                    const needed = String(params.needed_skill || '');
                    if (!needed) return 'Error: needed_skill required';

                    const suggestions = this.engine.suggestSkillSource(needed);
                    if (suggestions.length === 0) return `No agent found with skill: "${needed}". Try listing available skills with \`skill_fusion(action: "list_agents")\`.`;

                    return [
                        `## 💡 Skill Source Suggestions for: "${needed}"`,
                        '',
                        ...suggestions.map(s => {
                            const status = s.confidence >= 1.0 ? '🟢 Available' : '🟡 Currently lent out';
                            return `- **${s.agentName}** (\`${s.agentId}\`) — ${status} (confidence: ${(s.confidence * 100).toFixed(0)}%)`;
                        }),
                        '',
                        suggestions[0].confidence >= 1.0
                            ? `> Quick borrow: \`skill_fusion(action: "borrow_skill", source_agent: "${suggestions[0].agentId}", target_agent: "YOUR_AGENT_ID", skill: "${needed}", reason: "...")\``
                            : '> Top suggestion is currently lending this skill. Try another agent or wait.',
                    ].join('\n');
                }

                case 'status': {
                    const transfers = this.engine.getActiveTransfers();
                    const fusions = this.engine.getActiveFusions();

                    const lines = ['## 📊 Skill Fusion Status', ''];

                    if (transfers.length > 0) {
                        lines.push(`### Active Skill Transfers (${transfers.length})`);
                        for (const t of transfers) {
                            const remaining = Math.max(0, Math.round((t.expiresAt - Date.now()) / 1000));
                            lines.push(`- \`${t.id}\` — **${t.skill}**: ${t.sourceAgentId} → ${t.targetAgentId} (${remaining}s remaining) — ${t.reason}`);
                        }
                        lines.push('');
                    } else {
                        lines.push('### No active skill transfers');
                        lines.push('');
                    }

                    if (fusions.length > 0) {
                        lines.push(`### Active Fusion Sessions (${fusions.length})`);
                        for (const f of fusions) {
                            lines.push(`- \`${f.id}\` — **${f.name}** (${f.agentIds.length} agents) — ${f.combinedSkills.length} combined skills`);
                            lines.push(`  Task: ${f.taskDescription.slice(0, 100)}`);
                        }
                    } else {
                        lines.push('### No active fusion sessions');
                    }

                    return lines.join('\n');
                }

                case 'inject': {
                    // Inject is essentially the same as borrow but framed differently
                    const src = String(params.source_agent || '');
                    const tgt = String(params.target_agent || '');
                    const skill = String(params.skill || '');
                    const reason = String(params.reason || 'skill injection');
                    const duration = Math.min(Number(params.duration || 120), 600) * 1000;

                    if (!src || !tgt || !skill) return 'Error: source_agent, target_agent, and skill required';

                    const transfer = this.engine.borrowSkill(src, tgt, skill, `[inject] ${reason}`, duration);
                    const tgtProfile = this.engine.getProfile(tgt);

                    return [
                        `## 💉 Skill Injected!`,
                        `**${skill}** capability injected into **${tgtProfile.agentName}**`,
                        `**Transfer ID:** \`${transfer.id}\``,
                        `**Duration:** ${Math.round(duration / 1000)}s (auto-expires)`,
                        '',
                        `${tgtProfile.agentName}'s enhanced skillset: ${tgtProfile.skills.join(', ')}`,
                    ].join('\n');
                }

                default:
                    return `Unknown action: "${action}". Valid: list_agents, borrow_skill, return_skill, create_fusion, dissolve_fusion, suggest, status, inject`;
            }
        } catch (err) {
            return `Skill Fusion Error: ${err instanceof Error ? err.message : String(err)}`;
        }
    }
}
