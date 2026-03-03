import { useState, useEffect, useCallback } from 'react';
import { Eye, Search, Building, Cloud, Book, Server, RefreshCw } from 'lucide-react';
import SovereignSnapshot from './SovereignSnapshot';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';

interface AuditEntry {
    id: string;
    name: string;
    module: string;
    action: string;
    doneBy: string;
    doneByType: 'human' | 'system' | 'ai';
    date: string;
    time: string;
}

// Map a Supabase row to the UI format
const mapRow = (row: Record<string, unknown>): AuditEntry => {
    const d = new Date(row.created_at as string);
    return {
        id: (row.id as string).slice(0, 20),
        name: row.name as string,
        module: row.module as string,
        action: row.action as string,
        doneBy: row.done_by as string,
        doneByType: row.done_by_type as 'human' | 'system' | 'ai',
        date: d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }) + ' GMT',
    };
};

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [moduleFilter, setModuleFilter] = useState('All');
    const [actionFilter, setActionFilter] = useState('All');
    const [snapshotId, setSnapshotId] = useState<string | null>(null);
    const [isLive, setIsLive] = useState(true);

    // Fetch initial logs from Supabase + subscribe to real-time
    useEffect(() => {
        const fetchLogs = async () => {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                setLogs(data.map(mapRow));
            }
        };

        fetchLogs();

        // Subscribe to real-time INSERT events
        const channel = supabase
            .channel('audit_logs_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'audit_logs' },
                (payload) => {
                    const newEntry = mapRow(payload.new);
                    setLogs(prev => [newEntry, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleRefresh = useCallback(async () => {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            setLogs(data.map(mapRow));
        }
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.id.toLowerCase().includes(searchQuery.toLowerCase()) || log.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesModule = moduleFilter === 'All' || log.module === moduleFilter;
        const matchesAction = actionFilter === 'All' || log.action === actionFilter;
        return matchesSearch && matchesModule && matchesAction;
    });

    const getModuleIcon = (module: string) => {
        switch (module) {
            case 'Concierge': return <Book size={14} className="text-gray-500 mr-2" />;
            case 'Compliance': return <Building size={14} className="text-gray-500 mr-2" />;
            case 'Integration': return <Cloud size={14} className="text-gray-500 mr-2" />;
            case 'Security': return <Server size={14} className="text-gray-500 mr-2" />;
            default: return <Building size={14} className="text-gray-500 mr-2" />;
        }
    };

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'Created': return <span className="text-green-600 flex items-center gap-1 font-medium"><span className="text-green-500">+</span> Created</span>;
            case 'Updated': return <span className="text-blue-600 flex items-center gap-1 font-medium"><span className="border border-blue-600 p-[1px] rounded-[2px]"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></span> Updated</span>;
            case 'Verified': return <span className="text-emerald-500 flex items-center gap-1 font-medium"><span className="border border-emerald-500 p-[1px] rounded-[2px]"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span> Verified</span>;
            case 'Shredded': return <span className="text-red-500 flex items-center gap-1 font-medium"><span className="border border-red-500 p-[1px] rounded-[2px]"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></span> Shredded</span>;
            default: return <span className="text-gray-600">{action}</span>;
        }
    };

    const getAvatarInitials = (_name: string, type: string) => {
        if (type === 'human') return { initials: 'YK', bg: 'bg-slate-100 border-slate-200' };
        if (type === 'system') return { initials: 'SY', bg: 'bg-slate-50 border-slate-200' };
        if (type === 'ai') return { initials: 'AI', bg: 'bg-london-blue text-white' };
        return { initials: 'XX', bg: 'bg-slate-50 border-slate-200' };
    };

    return (
        <div className="flex-1 bg-white text-slate-800 font-sans p-10 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-2 tracking-tight">Audit Protocol</h2>
                    <p className="text-sm text-slate-400 font-medium">Forensic monitoring of system activities and data lineage across the sovereign ledger.</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Live Indicator */}
                    <div className={`flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-sm border shadow-sm ${isLive ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-slate-400 border-slate-200 bg-slate-50'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {isLive ? 'Ledger: Active' : 'Ledger: Paused'}
                    </div>
                    <button onClick={() => setIsLive(!isLive)} className="text-slate-400 hover:text-london-blue text-[10px] font-bold uppercase tracking-widest border border-slate-200 px-3 py-2 rounded-sm transition-all hover:bg-slate-50">
                        {isLive ? 'Pause' : 'Resume'}
                    </button>
                    <button onClick={handleRefresh} className="bg-london-blue hover:bg-slate-900 text-white px-5 py-2.5 rounded shadow-md text-[11px] font-bold uppercase tracking-widest flex items-center transition-all active:scale-95">
                        <RefreshCw size={14} className="mr-2" />
                        Sync Ledger
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-8">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                        type="text"
                        placeholder="Search Dossier ID or Entity..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-11 pr-4 py-3 border border-slate-200 rounded text-sm w-80 focus:outline-none focus:ring-1 focus:ring-london-blue/30 focus:border-london-blue shadow-sm placeholder:text-slate-300"
                    />
                </div>

                <select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                    className="border border-slate-200 rounded px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-london-blue/30 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                >
                    <option value="All">Module: All</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Concierge">Concierge</option>
                    <option value="Integration">Integration</option>
                    <option value="Security">Security</option>
                </select>

                <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="border border-slate-200 rounded px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-london-blue/30 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                >
                    <option value="All">Action: All</option>
                    <option value="Created">Created</option>
                    <option value="Updated">Updated</option>
                    <option value="Verified">Verified</option>
                    <option value="Shredded">Shredded</option>
                </select>

                <div className="flex border border-slate-200 rounded text-[10px] font-bold text-slate-500 overflow-hidden items-center shadow-sm">
                    <div className="px-4 py-3 border-r border-slate-100 bg-white flex items-center pr-10 uppercase tracking-widest">
                        <svg className="w-4 h-4 mr-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        01 / 01 / 2026
                    </div>
                    <div className="px-4 py-3 bg-white flex items-center pr-10 uppercase tracking-widest">
                        <svg className="w-4 h-4 mr-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        03 / 03 / 2026
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="border border-slate-200 rounded overflow-hidden bg-white shadow-lg">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="py-5 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[25%] border-r border-slate-100">Dossier / Name</th>
                            <th className="py-5 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[15%] border-r border-slate-100">Module</th>
                            <th className="py-5 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[13%] border-r border-slate-100">Action</th>
                            <th className="py-5 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[27%] border-r border-slate-100">Executioner</th>
                            <th className="py-5 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Timestamp</th>
                            <th className="w-[60px]"></th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {filteredLogs.map((log, index) => {
                            const avatar = getAvatarInitials(log.doneBy, log.doneByType);
                            return (
                                <motion.tr
                                    key={log.id + index}
                                    initial={index === 0 ? { opacity: 0, backgroundColor: 'rgba(15, 23, 42, 0.02)' } : { opacity: 1 }}
                                    animate={{ opacity: 1, backgroundColor: index % 2 === 1 ? 'rgba(248, 250, 252, 0.5)' : 'transparent' }}
                                    transition={{ duration: 0.5 }}
                                    className="border-b border-slate-50 hover:bg-slate-50/80 transition-all group"
                                >
                                    <td className="py-5 px-6 border-r border-slate-50">
                                        <div className="font-serif font-bold text-slate-900 text-base">{log.name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold font-mono tracking-tighter mt-1">UUID: {log.id}</div>
                                    </td>
                                    <td className="py-5 px-6 border-r border-slate-50">
                                        <div className="flex items-center text-slate-600 font-bold text-[11px] uppercase tracking-tight">
                                            {getModuleIcon(log.module)}
                                            {log.module}
                                        </div>
                                    </td>
                                    <td className="py-5 px-6 border-r border-slate-50">
                                        <div className="text-[11px] font-bold uppercase tracking-tight">{getActionBadge(log.action)}</div>
                                    </td>
                                    <td className="py-5 px-6 border-r border-slate-50">
                                        <div className="flex items-center">
                                            <div className={`w-9 h-9 border rounded flex items-center justify-center text-[10px] font-bold shadow-sm mr-4 ${avatar.bg}`}>
                                                {avatar.initials}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-[13px]">{log.doneBy}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{log.doneByType} Access Mode</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="text-slate-900 font-bold text-[13px]">{log.date}</div>
                                        <div className="text-[10px] text-slate-400 font-medium font-mono mt-0.5">{log.time}</div>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <button
                                            onClick={() => setSnapshotId(log.id)}
                                            className="text-slate-300 hover:text-london-blue transition-all transform group-hover:scale-110 active:scale-95"
                                        >
                                            <Eye size={20} />
                                        </button>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 flex justify-between text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Real-time Socket {isLive ? 'Online' : 'Standby'}</span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2">Protocol: <select className="border border-slate-200 rounded px-2 py-0.5 focus:outline-none bg-white text-slate-600"><option>HTTPS / WSS</option></select></span>
                    <span>{filteredLogs.length} Entries in Buffer</span>
                    <div className="flex gap-2">
                        <button className="text-slate-200 disabled:opacity-50" disabled>Prev</button>
                        <div className="w-6 h-6 bg-london-blue text-white flex items-center justify-center rounded-sm">1</div>
                        <button className="text-slate-200 disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
            </div>

            {/* Sovereign Snapshot Modal */}
            <AnimatePresence>
                {snapshotId && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-10"
                        onClick={() => setSnapshotId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.98, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 10 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-transparent max-w-4xl w-full"
                        >
                            <SovereignSnapshot
                                clientData={{ id: snapshotId }}
                                onApprove={() => setSnapshotId(null)}
                                onFlag={() => setSnapshotId(null)}
                                biometricData={{
                                    confidence: 99.2,
                                    request_id: 'AUDIT_LOG_SNAPSHOT',
                                    status: 'Green',
                                    livenessScore: 98.4,
                                    loading: false,
                                    error: null
                                }}
                            />
                            <div className="mt-8 flex justify-center">
                                <button onClick={() => setSnapshotId(null)} className="px-8 py-3 border border-white/20 text-white hover:bg-white/10 rounded-full font-bold text-[10px] tracking-[0.2em] uppercase transition-all shadow-lg active:scale-95">
                                    Dismiss Forensic View
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
