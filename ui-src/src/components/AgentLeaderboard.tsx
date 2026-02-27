import React from 'react';
import { NexusMetrics } from '../types';

interface AgentLeaderboardProps {
    leaderboard: NexusMetrics['leaderboard'];
}

const RANK_STYLES = [
    { bg: 'bg-amber-500/[0.08]', border: 'border-amber-500/20', text: 'text-amber-400', shadow: 'shadow-[0_0_8px_rgba(245,158,11,0.15)]' },
    { bg: 'bg-slate-400/[0.06]', border: 'border-slate-400/20', text: 'text-slate-300', shadow: '' },
    { bg: 'bg-orange-700/[0.08]', border: 'border-orange-700/20', text: 'text-orange-400', shadow: '' },
];

export const AgentLeaderboard: React.FC<AgentLeaderboardProps> = ({ leaderboard }) => {
    return (
        <div className="nexus-panel h-full flex flex-col">
            <div className="nexus-panel-header">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/[0.08] flex items-center justify-center text-amber-400">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                        </svg>
                    </div>
                    <span className="font-bold text-slate-200 text-sm uppercase tracking-wider">Top Performers</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                {leaderboard.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 opacity-30">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600 mb-2">
                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                        </svg>
                        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">No rankings yet...</p>
                    </div>
                )}
                {leaderboard.map((agent, index) => {
                    const rankStyle = RANK_STYLES[index] || null;
                    return (
                        <div key={agent.id} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] transition-all group">
                            <div className="flex items-center gap-3">
                                {/* Rank */}
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${rankStyle ? `${rankStyle.bg} ${rankStyle.text} border ${rankStyle.border} ${rankStyle.shadow}` : 'text-slate-600'
                                    }`}>
                                    {index + 1}
                                </div>

                                {/* Avatar */}
                                <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[10px] font-black text-cyan-300 group-hover:border-cyan-500/20 transition-colors">
                                    {agent.name.slice(0, 2).toUpperCase()}
                                </div>

                                <div>
                                    <div className="text-[12px] font-semibold text-slate-200 leading-tight">{agent.name}</div>
                                    <div className="text-[9px] text-slate-600 font-semibold">Lv.{agent.level}</div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-sm font-bold text-cyan-400 tabular-nums">{agent.xp.toLocaleString()}</div>
                                <div className="text-[8px] text-slate-600 font-semibold uppercase tracking-wider">XP</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
