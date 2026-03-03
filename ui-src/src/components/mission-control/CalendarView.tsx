import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const CalendarView: React.FC = () => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJobs();
        const sub = supabase.channel('jobs_channel').on('postgres_changes', { event: '*', schema: 'public', table: 'nc_scheduled_jobs' }, fetchJobs).subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    const fetchJobs = async () => {
        const { data } = await supabase.from('nc_scheduled_jobs').select('*').order('created_at', { ascending: false });
        if (data) setJobs(data);
        setLoading(false);
    };

    const toggleJobStatus = async (id: string, current: boolean) => {
        await supabase.from('nc_scheduled_jobs').update({ is_active: !current }).eq('id', id);
    };

    const deleteJob = async (id: string) => {
        if (!confirm('Delete this scheduled task?')) return;
        await supabase.from('nc_scheduled_jobs').delete().eq('id', id);
    };

    if (loading) return <div className="p-8 text-center text-white/50 animate-pulse font-mono">Aligning Temporal Sequences...</div>;

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Celestial Calendar</h2>
                    <p className="text-white/50 text-sm">Scheduled tasks and autonomic cron routines.</p>
                </div>
                <div className="flex bg-white/5 rounded-2xl p-1 border border-white/5">
                    <button className="p-2 hover:bg-white/5 rounded-xl transition-all"><ChevronLeft size={18} /></button>
                    <div className="px-6 py-2 text-sm font-bold text-white tracking-widest flex items-center justify-center min-w-[140px]">
                        {new Date().toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}
                    </div>
                    <button className="p-2 hover:bg-white/5 rounded-xl transition-all"><ChevronRight size={18} /></button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-7 gap-1 h-fit">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <div key={day} className="text-[10px] font-bold text-white/30 uppercase tracking-widest text-center py-2">{day}</div>
                        ))}
                        {Array.from({ length: 35 }).map((_, i) => {
                            const day = i - 1; // Basic placeholder for simplicity
                            const isToday = day === new Date().getDate();
                            return (
                                <div key={i} className={`aspect-square bg-white/[0.02] border border-white/5 rounded-xl p-2 group hover:bg-white/5 transition-all relative ${day <= 0 ? 'opacity-20' : ''}`}>
                                    <span className={`text-xs font-mono ${isToday ? 'text-[#00ffaa] font-bold' : 'text-white/40'}`}>{day > 0 && day <= 31 ? day : ''}</span>
                                    {isToday && jobs.length > 0 && (
                                        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-0.5">
                                            {jobs.slice(0, 3).map(j => (
                                                <div key={j.id} className="h-1 rounded-full bg-[#00ffaa]/50" title={j.name}></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col">
                    <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-6 border-b border-white/5 pb-4 flex justify-between">
                        Active Routines
                        <span className="text-[#00ffaa]">{jobs.filter(j => j.is_active).length} LIVE</span>
                    </h3>

                    <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                        {jobs.map(job => (
                            <div key={job.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 group hover:border-white/10 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="font-bold text-sm text-white/90">{job.name}</div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => toggleJobStatus(job.id, job.is_active)} className="text-white/30 hover:text-[#00ffaa]">
                                            {job.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                        </button>
                                        <button onClick={() => deleteJob(job.id)} className="text-white/30 hover:text-red-400">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 mb-3">
                                    <Clock size={10} />
                                    <span>CRON: {job.cron_expression}</span>
                                </div>
                                <div className="text-[9px] text-white/20 uppercase tracking-tighter">
                                    NEXT RUN: {job.next_run_at ? new Date(job.next_run_at).toLocaleString() : 'PENDING'}
                                </div>
                            </div>
                        ))}
                        {jobs.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 py-20">
                                <Clock size={32} className="mb-2" />
                                <p className="text-xs">No scheduled routines<br />in local orbit.</p>
                            </div>
                        )}
                    </div>

                    <button className="mt-8 w-full py-4 border border-dashed border-white/10 rounded-2xl text-xs font-bold text-white/30 hover:bg-[#00ffaa]/5 hover:border-[#00ffaa]/30 hover:text-[#00ffaa] transition-all">
                        + Schedule Ritual
                    </button>
                </div>
            </div>
        </div>
    );
};
