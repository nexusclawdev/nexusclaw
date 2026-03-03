import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Clock, Tag, ChevronRight, FileText, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const MemoryLog: React.FC = () => {
    const [memories, setMemories] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedMemory, setSelectedMemory] = useState<any | null>(null);

    useEffect(() => {
        fetchMemories();
        const sub = supabase.channel('memories_channel').on('postgres_changes', { event: '*', schema: 'public', table: 'nc_memories' }, fetchMemories).subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    const fetchMemories = async () => {
        const { data } = await supabase.from('nc_memories').select('*').order('created_at', { ascending: false });
        if (data) setMemories(data);
        setLoading(false);
    };

    const filteredMemories = memories.filter(m =>
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.tags && m.tags.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    if (loading) return <div className="p-8 text-center text-white/50 animate-pulse font-mono">Retrieving Synaptic History...</div>;

    return (
        <div className="flex h-full overflow-hidden animate-in fade-in duration-500 gap-6">
            <div className="flex-[2] flex flex-col min-w-0">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Long-term Memory</h2>
                        <p className="text-white/50 text-sm">Archived intelligence and historical context.</p>
                    </div>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00ffaa]/50" size={18} />
                    <input
                        type="text"
                        placeholder="Search through historical records..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-[#00ffaa]/50 focus:bg-white/[0.08] transition-all"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                        <span className="bg-white/5 px-2 py-1 rounded-lg text-[10px] text-white/30 border border-white/5">⌘K</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
                    {filteredMemories.map(memory => (
                        <button
                            key={memory.id}
                            onClick={() => setSelectedMemory(memory)}
                            className={`text-left p-5 rounded-2xl border transition-all relative overflow-hidden group ${selectedMemory?.id === memory.id ? 'bg-[#00ffaa]/10 border-[#00ffaa]/40' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-white/90 group-hover:text-[#00ffaa] transition-colors">{memory.title}</h4>
                                <span className="text-[10px] font-mono text-white/20">{new Date(memory.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-white/40 line-clamp-2 leading-relaxed mb-4">{memory.content}</p>
                            <div className="flex gap-2">
                                {memory.tags?.map((tag: string, i: number) => (
                                    <span key={i} className="text-[9px] font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-tighter">#{tag}</span>
                                ))}
                            </div>
                        </button>
                    ))}
                    {filteredMemories.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 py-20">
                            <BookOpen size={48} className="mb-4" />
                            <p className="text-sm">No memories found in<br />this subspace.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-[3] bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-10 overflow-y-auto custom-scrollbar relative">
                {selectedMemory ? (
                    <div className="animate-in slide-in-from-bottom-8 duration-500 max-w-2xl mx-auto">
                        <div className="flex items-center gap-3 text-[#00ffaa] text-[10px] font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-4">
                            <Zap size={12} fill="currentColor" />
                            SECURE MEMORY ARCHIVE • {selectedMemory.id.slice(0, 8).toUpperCase()}
                        </div>

                        <h1 className="text-4xl font-extrabold text-white mb-8 tracking-tight leading-tight">{selectedMemory.title}</h1>

                        <div className="flex gap-6 mb-12">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-white/20 uppercase font-bold tracking-widest mb-1">Created</span>
                                <span className="text-sm text-white/60 font-mono">{new Date(selectedMemory.created_at).toLocaleString()}</span>
                            </div>
                            <div className="w-px h-10 bg-white/10"></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-white/20 uppercase font-bold tracking-widest mb-1">Index Tags</span>
                                <div className="flex gap-2">
                                    {selectedMemory.tags?.map((t: string) => (
                                        <span key={t} className="text-xs text-[#00ffaa] font-medium">#{t}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="prose prose-invert max-w-none prose-p:text-white/70 prose-p:leading-relaxed prose-headings:text-white prose-code:text-[#00ffaa] prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                            {selectedMemory.content.split('\n').map((line: string, i: number) => (
                                <p key={i} className="mb-4 text-lg text-white/80 leading-loose">{line}</p>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-10">
                        <Zap size={120} className="mb-8" />
                        <h3 className="text-2xl font-bold italic">Satori Mode Selective Memory</h3>
                        <p className="mt-2">Select a neural fragment to expand context.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
