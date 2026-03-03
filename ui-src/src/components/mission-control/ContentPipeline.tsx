import React, { useState, useEffect } from 'react';
import { Plus, X, Video, FileText, Image, Film, Edit3, Save, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const ContentPipeline: React.FC = () => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const stages = [
        { id: 'idea', label: 'Ideas', icon: Edit3, color: '#facc15' },
        { id: 'script', label: 'Scripting', icon: FileText, color: '#60a5fa' },
        { id: 'thumbnail', label: 'Thumbnail', icon: Image, color: '#c084fc' },
        { id: 'filming', label: 'Filming', icon: Film, color: '#00ffaa' }
    ];

    useEffect(() => {
        fetchItems();
        const sub = supabase.channel('pipeline_channel').on('postgres_changes', { event: '*', schema: 'public', table: 'nc_content_pipeline' }, fetchItems).subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    const fetchItems = async () => {
        const { data } = await supabase.from('nc_content_pipeline').select('*').order('created_at', { ascending: false });
        if (data) setItems(data);
        setLoading(false);
    };

    const createIdea = async () => {
        const title = prompt('Enter video idea title:');
        if (!title) return;
        await supabase.from('nc_content_pipeline').insert({ title, stage: 'idea' });
    };

    const updateItem = async (updates: any) => {
        if (!selectedItem) return;
        const { data, error } = await supabase.from('nc_content_pipeline').update(updates).eq('id', selectedItem.id).select();
        if (data) {
            setSelectedItem(data[0]);
            setIsEditing(false);
        }
    };

    const deleteItem = async (id: string) => {
        if (!confirm('Discard this content idea?')) return;
        await supabase.from('nc_content_pipeline').delete().eq('id', id);
        setSelectedItem(null);
    };

    if (loading) return <div className="p-8 text-center text-white/50 animate-pulse font-mono">Synthesizing Creative Streams...</div>;

    return (
        <div className="flex h-full overflow-hidden animate-in fade-in duration-500 gap-6">
            <div className="flex-[3] flex flex-col min-w-0">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Content Pipeline</h2>
                        <p className="text-white/50 text-sm">Automating your distribution engine from Idea to Film.</p>
                    </div>
                    <button
                        onClick={createIdea}
                        className="bg-[#00ffaa] text-black px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#00ffaa]/90 transition-all shadow-[0_0_15px_rgba(0,255,170,0.3)]"
                    >
                        <Plus size={16} /> New Concept
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 overflow-x-auto pb-4 custom-scrollbar">
                    {stages.map(stage => (
                        <div key={stage.id} className="flex flex-col min-w-[200px] bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-3">
                                <stage.icon size={16} style={{ color: stage.color }} />
                                <span className="text-xs font-bold uppercase tracking-widest text-white/70">{stage.label}</span>
                            </div>

                            <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                                {items.filter(i => i.stage === stage.id).map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        className={`text-left p-3 rounded-xl border transition-all ${selectedItem?.id === item.id ? 'bg-[#00ffaa]/10 border-[#00ffaa]/40' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                                    >
                                        <div className="text-sm font-medium text-white/90 mb-1">{item.title}</div>
                                        <div className="text-[10px] text-white/30 truncate">
                                            {item.script ? 'Script Ready' : 'Idea Only'} {item.thumbnail_url && '• Img'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-[2] bg-white/[0.03] border border-white/10 rounded-3xl p-6 overflow-y-auto custom-scrollbar flex flex-col">
                {selectedItem ? (
                    <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="text-[10px] font-bold text-[#00ffaa] uppercase tracking-widest mb-1">{selectedItem.stage} PHASE</div>
                                {isEditing ? (
                                    <input
                                        value={selectedItem.title}
                                        onChange={e => setSelectedItem({ ...selectedItem, title: e.target.value })}
                                        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xl font-bold text-white w-full"
                                    />
                                ) : (
                                    <h3 className="text-xl font-bold text-white">{selectedItem.title}</h3>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {isEditing ? (
                                    <button onClick={() => updateItem({ title: selectedItem.title, script: selectedItem.script, thumbnail_url: selectedItem.thumbnail_url })} className="p-2 bg-[#00ffaa] text-black rounded-lg hover:bg-[#00ffaa]/90"><Save size={16} /></button>
                                ) : (
                                    <button onClick={() => setIsEditing(true)} className="p-2 bg-white/5 text-white/70 rounded-lg hover:bg-white/10"><Edit3 size={16} /></button>
                                )}
                                <button onClick={() => deleteItem(selectedItem.id)} className="p-2 bg-white/5 text-red-400 rounded-lg hover:bg-red-500/10"><X size={16} /></button>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2 block">Stage Transition</label>
                            <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl">
                                {stages.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => updateItem({ stage: s.id })}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${selectedItem.stage === s.id ? 'bg-white/10 text-white border border-white/10' : 'text-white/30 hover:text-white/50'}`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto mb-6">
                            <label className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2 block">Script / Notes</label>
                            {isEditing ? (
                                <textarea
                                    value={selectedItem.script || ''}
                                    onChange={e => setSelectedItem({ ...selectedItem, script: e.target.value })}
                                    className="w-full h-64 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white/90 outline-none focus:border-[#00ffaa]/50 font-mono resize-none"
                                    placeholder="Write the script here... Markdown supported."
                                />
                            ) : (
                                <div className="bg-black/40 rounded-xl p-4 min-h-[100px] text-sm text-white/70 whitespace-pre-wrap font-mono leading-relaxed">
                                    {selectedItem.script || "No script written yet."}
                                </div>
                            )}
                        </div>

                        {selectedItem.thumbnail_url && (
                            <div className="mb-6">
                                <label className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2 block">Thumbnail Asset</label>
                                <div className="relative group">
                                    <img src={selectedItem.thumbnail_url} alt="Thumbnail preview" className="w-full h-48 object-cover rounded-2xl border border-white/10" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                                        <a href={selectedItem.thumbnail_url} target="_blank" rel="noreferrer" className="bg-white/10 p-2 rounded-full hover:bg-white/20"><ExternalLink size={20} /></a>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                        <Video size={48} className="mb-4" />
                        <p className="text-sm font-medium">Select an item to view<br />the creative architecture.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
