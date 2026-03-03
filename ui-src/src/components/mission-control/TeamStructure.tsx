import React, { useState, useEffect } from 'react';
import { Users, Shield, Code, PenTool, Palette, MoreVertical, Plus, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const TeamStructure: React.FC = () => {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const roles = [
        { id: 'leader', label: 'Organization Leaders', icon: Shield, color: '#facc15' },
        { id: 'developer', label: 'Technical Ops', icon: Code, color: '#60a5fa' },
        { id: 'writer', label: 'Narrative Units', icon: PenTool, color: '#c084fc' },
        { id: 'designer', label: 'Aesthetic Architects', icon: Palette, color: '#00ffaa' }
    ];

    useEffect(() => {
        fetchMembers();
        const sub = supabase.channel('team_channel').on('postgres_changes', { event: '*', schema: 'public', table: 'nc_team_members' }, fetchMembers).subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    const fetchMembers = async () => {
        const { data } = await supabase.from('nc_team_members').select('*').order('created_at', { ascending: true });
        if (data) setMembers(data);
        setLoading(false);
    };

    const addMember = async (role: string) => {
        const name = prompt(`Enter ${role} name:`);
        if (!name) return;
        await supabase.from('nc_team_members').insert({ name, role, status: 'idle' });
    };

    if (loading) return <div className="p-8 text-center text-white/50 animate-pulse font-mono">Assembling Neural Network...</div>;

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Human-Agent Organization</h2>
                    <p className="text-white/50 text-sm">Accountability and architectural roles in the digital entity.</p>
                </div>
                <button className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl text-xs font-bold text-white/70 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2">
                    <UserPlus size={16} /> Expand Hierarchy
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {roles.map(role => (
                    <div key={role.id} className="flex flex-col gap-6">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 shadow-lg" style={{ color: role.color }}>
                                <role.icon size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white uppercase tracking-widest">{role.label}</span>
                                <span className="text-[10px] text-white/30 font-mono">{members.filter(m => m.role === role.id).length} ACTIVE ENTITIES</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {members.filter(m => m.role === role.id).map(member => (
                                <div key={member.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 group hover:border-white/20 hover:bg-white/[0.08] transition-all relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center text-xl font-bold text-white/50 border border-white/5">
                                            {member.name.charAt(0)}
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 border border-white/5 text-[9px] font-bold text-white/40 mb-1">
                                                <div className={`w-1 h-1 rounded-full ${member.status === 'working' ? 'bg-[#00ffaa] animate-pulse' : 'bg-white/20'}`}></div>
                                                {member.status.toUpperCase()}
                                            </div>
                                            <button className="text-white/20 hover:text-white transition-colors">
                                                <MoreVertical size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-1">{member.name}</h4>
                                    <p className="text-[11px] text-white/40 leading-relaxed min-h-[32px]">{member.responsibilities || 'Assign tactical priorities...'}</p>

                                    <div className="mt-5 flex gap-1">
                                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#00ffaa]/30 w-1/3"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={() => addMember(role.id)}
                                className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-[10px] font-bold text-white/20 uppercase tracking-widest hover:border-[#00ffaa]/30 hover:bg-[#00ffaa]/5 hover:text-[#00ffaa] transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> Assign {role.id}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
