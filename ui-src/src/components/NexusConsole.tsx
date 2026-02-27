import React, { useEffect, useRef } from 'react';
import { Message } from '../types';

interface NexusConsoleProps {
    messages: Message[];
}

const SENDER_Map: Record<string, { bar: string; name: string; label: string }> = {
    ceo: { bar: 'bg-[var(--nexus-accent)]', name: 'text-[var(--nexus-text-primary)]', label: 'Command' },
    system: { bar: 'bg-[var(--nexus-text-muted)]', name: 'text-[var(--nexus-text-primary)]', label: 'System' },
    agent: { bar: 'bg-[var(--nexus-success)]', name: 'text-[var(--nexus-success)]', label: '' },
};

export const NexusConsole: React.FC<NexusConsoleProps> = ({ messages }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="nexus-panel flex flex-col h-full bg-[var(--nexus-surface)] border-[var(--nexus-border)]">
            <div className="nexus-panel-header">
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-[var(--nexus-text-primary)] text-sm tracking-wide">Activity Feed</span>
                    <div className="flex items-center gap-1.5 ml-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--nexus-success)] animate-[pulse-dot_2s_infinite]" />
                        <span className="text-[10px] font-medium text-[var(--nexus-text-secondary)] uppercase tracking-widest">Live</span>
                    </div>
                </div>
                <span className="text-[10px] font-medium text-[var(--nexus-text-muted)] tabular-nums">{messages.length} entries</span>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 p-4 space-y-3 custom-scrollbar overflow-y-auto max-h-[400px]"
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 opacity-40">
                        <p className="text-xs font-medium text-[var(--nexus-text-muted)] uppercase tracking-widest">Awaiting Activity...</p>
                    </div>
                )}
                {messages.slice(-200).map((msg) => {
                    const style = SENDER_Map[msg.sender_type] || SENDER_Map.agent;
                    return (
                        <div key={msg.id} className="group relative bg-[var(--nexus-surface-elevated)] px-4 py-3 rounded-md border border-[var(--nexus-border)] hover:border-[var(--nexus-border-hover)] transition-all duration-100">
                            <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-md ${style.bar}`} />

                            <div className="flex items-center gap-3 mb-1.5 pl-3">
                                <span className="text-[10px] font-mono text-[var(--nexus-text-muted)] tabular-nums">
                                    {formatTime(msg.created_at)}
                                </span>
                                <span className={`font-semibold text-[11px] uppercase tracking-wider ${style.name}`}>
                                    {style.label ? style.label : (msg.sender_agent?.name || msg.sender_id || 'Agent')}
                                </span>
                                {msg.message_type !== 'chat' && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-[var(--nexus-surface)] border border-[var(--nexus-border)] text-[var(--nexus-text-secondary)] uppercase tracking-widest">{msg.message_type}</span>
                                )}
                            </div>
                            <div className="text-sm text-[var(--nexus-text-secondary)] leading-relaxed break-words pl-3 group-hover:text-[var(--nexus-text-primary)] transition-colors">
                                {msg.content}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
