import React, { useState, useEffect } from 'react';
import { Plus, X, User, Bot, CheckCircle2, Circle, Clock, MoreHorizontal } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Task, Agent } from '../../types';

interface TasksBoardProps {
    currentAgent: Agent | null;
    agents: Agent[];
}

export const TasksBoard: React.FC<TasksBoardProps> = ({ currentAgent, agents }) => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const columns = [
        { id: 'inbox', label: 'Inbox', color: '#8b949e' },
        { id: 'planned', label: 'Planned', color: '#60a5fa' },
        { id: 'in_progress', label: 'In Progress', color: '#facc15' },
        { id: 'done', label: 'Completed', color: '#00ffaa' }
    ];

    useEffect(() => {
        fetchTasks();
        const subscription = supabase
            .channel('tasks_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'nc_tasks' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setTasks(prev => [payload.new, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
                } else if (payload.eventType === 'DELETE') {
                    setTasks(prev => prev.filter(t => t.id === payload.old.id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    }, []);

    const fetchTasks = async () => {
        const { data, error } = await supabase.from('nc_tasks').select('*').order('created_at', { ascending: false });
        if (data) setTasks(data);
        setLoading(false);
    };

    const updateTaskStatus = async (taskId: string, newStatus: string) => {
        await supabase.from('nc_tasks').update({ status: newStatus }).eq('id', taskId);
    };

    const createTask = async (status: string) => {
        if (!newTaskTitle.trim()) return;
        const { data, error } = await supabase.from('nc_tasks').insert({
            title: newTaskTitle,
            status,
            assigned_to: 'me' // Default to user for manual additions
        }).select();

        if (data) {
            setNewTaskTitle('');
            setShowAddModal(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-white/50 animate-pulse font-mono">Loading Neural Handshakes...</div>;

    return (
        <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Operational Tasks</h2>
                    <p className="text-white/50 text-sm">Real-time coordination between Primary (Me) and Claw (You)</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-white/70">
                        Active Connections: {tasks.length}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 min-h-0 overflow-x-auto pb-4 custom-scrollbar">
                {columns.map(col => (
                    <div key={col.id} className="flex flex-col min-w-[280px]">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color, boxShadow: `0 0 8px ${col.color}` }}></div>
                                <span className="font-bold text-sm tracking-wide text-white/90 uppercase">{col.label}</span>
                            </div>
                            <span className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                                {tasks.filter(t => t.status === col.id).length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 custom-scrollbar">
                            {tasks.filter(t => t.status === col.id).map(task => (
                                <div
                                    key={task.id}
                                    className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 group hover:border-[#00ffaa]/30 hover:bg-white/[0.07] transition-all cursor-grab active:cursor-grabbing border-l-4"
                                    style={{ borderLeftColor: task.assigned_to === 'you' ? '#00ffaa' : '#60a5fa' }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            {task.assigned_to === 'you' ? (
                                                <div className="bg-[#00ffaa]/10 p-1.5 rounded-lg text-[#00ffaa]">
                                                    <Bot size={14} />
                                                </div>
                                            ) : (
                                                <div className="bg-[#60a5fa]/10 p-1.5 rounded-lg text-[#60a5fa]">
                                                    <User size={14} />
                                                </div>
                                            )}
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                                ASSIGNED: {task.assigned_to === 'you' ? 'HENRY' : 'ME'}
                                            </span>
                                        </div>
                                        <button className="text-white/20 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal size={14} />
                                        </button>
                                    </div>

                                    <h4 className="text-sm font-semibold text-white/90 mb-2 leading-tight">{task.title}</h4>

                                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5">
                                        <div className="flex gap-1.5">
                                            {columns.filter(c => c.id !== col.id).map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => updateTaskStatus(task.id, c.id)}
                                                    title={`Move to ${c.label}`}
                                                    className="w-5 h-5 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                                                >
                                                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: c.color }}></div>
                                                </button>
                                            ))}
                                        </div>
                                        <span className="text-[9px] font-mono text-white/20">
                                            {new Date(task.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {showAddModal === col.id ? (
                                <div className="bg-white/10 border border-[#00ffaa]/30 rounded-xl p-4 animate-in zoom-in-95 duration-200">
                                    <input
                                        autoFocus
                                        value={newTaskTitle}
                                        onChange={e => setNewTaskTitle(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') createTask(col.id);
                                            if (e.key === 'Escape') setShowAddModal(null);
                                        }}
                                        placeholder="Describe mission..."
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00ffaa] mb-3"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setShowAddModal(null)}
                                            className="text-xs text-white/50 hover:text-white px-2 py-1"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => createTask(col.id)}
                                            className="bg-[#00ffaa] text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#00ffaa]/90 transition-all"
                                        >
                                            Deploy Task
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowAddModal(col.id)}
                                    className="w-full py-4 border border-dashed border-white/10 rounded-xl text-xs text-white/30 hover:border-white/30 hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2 group"
                                >
                                    <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                                    New Operation
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
