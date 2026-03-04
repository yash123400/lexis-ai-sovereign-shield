import { useState, useEffect, useCallback } from 'react';
import { Eye, Search, Building, Cloud, Book, Server, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import SovereignSnapshot from './SovereignSnapshot';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';

const PAGE_SIZE = 50;

interface AuditEntry {
    id: string;
    rawId: string;
    intakeId: string | null;
    name: string;
    module: string;
    action: string;
    doneBy: string;
    doneByType: 'human' | 'system' | 'ai';
    date: string;
    time: string;
}

interface SnapshotIntakeData {
    biometricStatus: 'Green' | 'Amber' | 'Red' | null;
    faceMatchScore: number | null;
    livenessScore: number | null;
    faceRequestId: string | null;
    loading: boolean;
    error: string | null;
}

const mapRow = (row: Record<string, unknown>): AuditEntry => {
    const d = new Date(row.created_at as string);
    return {
        id: (row.id as string).slice(0, 20),
        rawId: row.id as string,
        intakeId: (row.intake_id as string) || null,
        name: row.name as string,
        module: row.module as string,
        action: row.action as string,
        doneBy: row.done_by as string,
        doneByType: row.done_by_type as 'human' | 'system' | 'ai',
        date: d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }) + ' GMT',
    };
};

// FIX 4.6: Extract real initials from a name string
function extractInitials(name: string): string {
    if (!name) return '??';
    const parts = name
        .replace(/\(.*?\)/g, '') // remove parenthetical
        .replace(/\[.*?\]/g, '') // remove brackets
        .trim()
        .split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
}

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [moduleFilter, setModuleFilter] = useState('All');
    const [actionFilter, setActionFilter] = useState('All');
    const [isLive, setIsLive] = useState(true);

    // FIX 3.4: Real cursor-based pagination
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    // FIX 4.1: Real date range filters (default to last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [dateFrom, setDateFrom] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

    // FIX 3.6: Snapshot state — stores real intake data fetched from DB
    const [snapshotIntakeId, setSnapshotIntakeId] = useState<string | null>(null);
    const [snapshotData, setSnapshotData] = useState<SnapshotIntakeData>({
        biometricStatus: null,
        faceMatchScore: null,
        livenessScore: null,
        faceRequestId: null,
        loading: false,
        error: null,
    });

    // FIX 3.6: Fetch real biometric data when a snapshot is opened
    const openSnapshot = useCallback(async (logEntry: AuditEntry) => {
        setSnapshotIntakeId(logEntry.rawId);
        setSnapshotData({ biometricStatus: null, faceMatchScore: null, livenessScore: null, faceRequestId: null, loading: true, error: null });

        if (!logEntry.intakeId) {
            setSnapshotData(prev => ({ ...prev, loading: false, error: 'No intake record linked to this audit entry.' }));
            return;
        }

        try {
            const { data, error } = await supabase
                .from('sovereign_intakes')
                .select('biometric_status, face_match_score, liveness_score, face_request_id')
                .eq('intake_id', logEntry.intakeId)
                .single();

            if (error || !data) {
                setSnapshotData(prev => ({ ...prev, loading: false, error: 'Intake record not found for this audit entry.' }));
            } else {
                setSnapshotData({
                    biometricStatus: (data.biometric_status as 'Green' | 'Amber' | 'Red') || null,
                    faceMatchScore: data.face_match_score ?? null,
                    livenessScore: data.liveness_score ?? null,
                    faceRequestId: data.face_request_id ?? null,
                    loading: false,
                    error: null,
                });
            }
        } catch {
            setSnapshotData(prev => ({ ...prev, loading: false, error: 'Failed to load intake record.' }));
        }
    }, []);

    // FIX 3.4 + 4.1: Fetch with real pagination and date range filters
    const fetchLogs = useCallback(async (currentPage: number) => {
        setIsLoading(true);
        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);

        const { data, error, count } = await supabase
            .from('audit_logs')
            .select('*', { count: 'exact' })
            .gte('created_at', new Date(dateFrom).toISOString())
            .lte('created_at', toDate.toISOString())
            .order('created_at', { ascending: false })
            .range(from, to);

        if (!error && data) {
            setLogs(data.map(mapRow));
            setTotalCount(count || 0);
        }
        setIsLoading(false);
    }, [dateFrom, dateTo]);

    useEffect(() => {
        fetchLogs(page);
    }, [fetchLogs, page, dateFrom, dateTo]);

    // Reset to page 0 when filters change
    useEffect(() => { setPage(0); }, [dateFrom, dateTo, moduleFilter, actionFilter, searchQuery]);

    // Real-time subscription
    useEffect(() => {
        if (!isLive) return;

        const channel = supabase
            .channel('audit_logs_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
                const newEntry = mapRow(payload.new);
                setLogs(prev => [newEntry, ...prev.slice(0, PAGE_SIZE - 1)]);
                setTotalCount(prev => prev + 1);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isLive]);

    const handleRefresh = useCallback(() => { fetchLogs(page); }, [fetchLogs, page]);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.id.toLowerCase().includes(searchQuery.toLowerCase()) || log.name.toLowerCase().includes(searchQuery.toLowerCase()) || log.doneBy.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesModule = moduleFilter === 'All' || log.module === moduleFilter;
        const matchesAction = actionFilter === 'All' || log.action === actionFilter;
        return matchesSearch && matchesModule && matchesAction;
    });

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const getModuleIcon = (module: string) => {
        const cls = "text-gray-500 mr-2";
        switch (module) {
            case 'Concierge': return <Book size={14} className={cls} aria-hidden="true" />;
            case 'Compliance': return <Building size={14} className={cls} aria-hidden="true" />;
            case 'Integration': return <Cloud size={14} className={cls} aria-hidden="true" />;
            case 'Security': return <Server size={14} className={cls} aria-hidden="true" />;
            default: return <Building size={14} className={cls} aria-hidden="true" />;
        }
    };

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'Created': return <span className="text-green-600 flex items-center gap-1 font-medium"><span className="text-green-500" aria-hidden="true">+</span> Created</span>;
            case 'Updated': return <span className="text-blue-600 flex items-center gap-1 font-medium">Updated</span>;
            case 'Verified': return <span className="text-emerald-500 flex items-center gap-1 font-medium">✓ Verified</span>;
            case 'Shredded': return <span className="text-red-500 flex items-center gap-1 font-medium">⊘ Shredded</span>;
            default: return <span className="text-gray-600">{action}</span>;
        }
    };

    // FIX 4.6: getAvatarInitials derives real initials from the done_by name
    const getAvatarInitials = (name: string, type: string) => {
        const initials = extractInitials(name);
        if (type === 'human') return { initials, bg: 'bg-slate-100 border-slate-200 text-slate-700' };
        if (type === 'system') return { initials: 'SY', bg: 'bg-slate-50 border-slate-200 text-slate-400' };
        if (type === 'ai') return { initials: 'AI', bg: 'bg-london-blue text-white border-london-blue' };
        return { initials: '??', bg: 'bg-slate-50 border-slate-200 text-slate-400' };
    };

    return (
        <div className="flex-1 bg-white text-slate-800 font-sans p-10 overflow-y-auto" role="main" aria-label="Audit Protocol">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-2 tracking-tight">Audit Protocol</h2>
                    <p className="text-sm text-slate-400 font-medium">Forensic monitoring of system activities and data lineage across the sovereign ledger.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div
                        className={`flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-sm border shadow-sm ${isLive ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-slate-400 border-slate-200 bg-slate-50'}`}
                        aria-live="polite"
                        role="status"
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} aria-hidden="true" />
                        {isLive ? 'Ledger: Active' : 'Ledger: Paused'}
                    </div>
                    <button
                        onClick={() => setIsLive(!isLive)}
                        className="text-slate-400 hover:text-london-blue text-[10px] font-bold uppercase tracking-widest border border-slate-200 px-3 py-2 rounded-sm transition-all hover:bg-slate-50"
                        aria-label={isLive ? 'Pause real-time log feed' : 'Resume real-time log feed'}
                    >
                        {isLive ? 'Pause' : 'Resume'}
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="bg-london-blue hover:bg-slate-900 text-white px-5 py-2.5 rounded shadow-md text-[11px] font-bold uppercase tracking-widest flex items-center transition-all active:scale-95"
                        aria-label="Refresh audit log data"
                    >
                        <RefreshCw size={14} className="mr-2" aria-hidden="true" />
                        Sync Ledger
                    </button>
                </div>
            </div>

            {/* FIX 4.1: Real functional date range + search filters */}
            <div className="flex flex-wrap gap-4 mb-8" role="search" aria-label="Audit log filters">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} aria-hidden="true" />
                    <input
                        id="audit-search"
                        type="text"
                        placeholder="Search Dossier ID, Entity or Actor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-11 pr-4 py-3 border border-slate-200 rounded text-sm w-80 focus:outline-none focus:ring-1 focus:ring-london-blue/30 focus:border-london-blue shadow-sm placeholder:text-slate-300"
                        aria-label="Search audit logs by ID, entity name, or actor"
                    />
                </div>

                <label htmlFor="module-filter" className="sr-only">Filter by module</label>
                <select
                    id="module-filter"
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

                <label htmlFor="action-filter" className="sr-only">Filter by action</label>
                <select
                    id="action-filter"
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

                {/* FIX 4.1: Actual <input type="date"> elements driving real DB queries */}
                <div className="flex border border-slate-200 rounded overflow-hidden items-center shadow-sm">
                    <label htmlFor="date-from" className="sr-only">From date</label>
                    <div className="flex items-center px-3 border-r border-slate-100 bg-slate-50">
                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <input
                        id="date-from"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="px-3 py-3 text-[11px] font-bold text-slate-600 bg-white focus:outline-none border-r border-slate-100"
                        aria-label="Filter from date"
                    />
                    <label htmlFor="date-to" className="sr-only">To date</label>
                    <input
                        id="date-to"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="px-3 py-3 text-[11px] font-bold text-slate-600 bg-white focus:outline-none"
                        aria-label="Filter to date"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="border border-slate-200 rounded overflow-hidden bg-white shadow-lg" role="region" aria-label="Audit log entries">
                <table className="w-full text-left border-collapse" aria-label="Audit protocol entries">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th scope="col" className="py-5 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[25%] border-r border-slate-100">Dossier / Name</th>
                            <th scope="col" className="py-5 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[15%] border-r border-slate-100">Module</th>
                            <th scope="col" className="py-5 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[13%] border-r border-slate-100">Action</th>
                            <th scope="col" className="py-5 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[27%] border-r border-slate-100">Executioner</th>
                            <th scope="col" className="py-5 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Timestamp</th>
                            <th scope="col" className="w-[60px]"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="text-sm" aria-live="polite" aria-busy={isLoading}>
                        {isLoading && (
                            <tr>
                                <td colSpan={6} className="py-16 text-center">
                                    <Loader2 className="animate-spin text-london-blue mx-auto" size={24} aria-label="Loading audit logs" />
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-4">Synchronising Ledger...</p>
                                </td>
                            </tr>
                        )}
                        {!isLoading && filteredLogs.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-16 text-center">
                                    <p className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">No audit entries found for the selected filters.</p>
                                </td>
                            </tr>
                        )}
                        {!isLoading && filteredLogs.map((log, index) => {
                            const avatar = getAvatarInitials(log.doneBy, log.doneByType);
                            return (
                                <motion.tr
                                    key={log.rawId}
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
                                            {/* FIX 4.6: Real initials from done_by name */}
                                            <div
                                                className={`w-9 h-9 border rounded flex items-center justify-center text-[10px] font-bold shadow-sm mr-4 flex-shrink-0 ${avatar.bg}`}
                                                aria-hidden="true"
                                            >
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
                                        {/* FIX 4.2: aria-label on icon-only button */}
                                        <button
                                            onClick={() => openSnapshot(log)}
                                            className="text-slate-300 hover:text-london-blue transition-all transform group-hover:scale-110 active:scale-95"
                                            aria-label={`View forensic snapshot for: ${log.name}`}
                                            id={`snapshot-btn-${log.rawId}`}
                                        >
                                            <Eye size={20} aria-hidden="true" />
                                        </button>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* FIX 3.4: Real Pagination Controls */}
            <div className="mt-8 flex justify-between text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} aria-hidden="true" />
                    <span>Real-time Socket {isLive ? 'Online' : 'Standby'}</span>
                </div>
                <div className="flex items-center gap-6">
                    <span>{totalCount} Total Entries</span>
                    <nav aria-label="Audit log pagination" className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0 || isLoading}
                            className="flex items-center gap-1 text-slate-500 hover:text-london-blue disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Previous page of audit logs"
                        >
                            <ChevronLeft size={14} aria-hidden="true" /> Prev
                        </button>
                        <div className="w-8 h-6 bg-london-blue text-white flex items-center justify-center rounded-sm text-[10px]" aria-current="page" aria-label={`Page ${page + 1} of ${totalPages}`}>
                            {page + 1}
                        </div>
                        <span className="text-slate-300">/ {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1 || isLoading}
                            className="flex items-center gap-1 text-slate-500 hover:text-london-blue disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Next page of audit logs"
                        >
                            Next <ChevronRight size={14} aria-hidden="true" />
                        </button>
                    </nav>
                </div>
            </div>

            {/* FIX 3.6: Sovereign Snapshot Modal — passes real biometric data from DB */}
            <AnimatePresence>
                {snapshotIntakeId && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-10"
                        onClick={() => setSnapshotIntakeId(null)}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Forensic snapshot view"
                    >
                        <motion.div
                            initial={{ scale: 0.98, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 10 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-transparent max-w-4xl w-full"
                        >
                            {/* FIX 3.6: Real biometric data from sovereign_intakes table */}
                            <SovereignSnapshot
                                clientData={{ id: snapshotIntakeId }}
                                biometricData={snapshotData.loading ? {
                                    confidence: null,
                                    request_id: null,
                                    status: 'Green',
                                    livenessScore: null,
                                    loading: true,
                                    error: null,
                                } : snapshotData.error ? {
                                    confidence: null,
                                    request_id: null,
                                    status: 'Red',
                                    livenessScore: null,
                                    loading: false,
                                    error: snapshotData.error,
                                } : {
                                    confidence: snapshotData.faceMatchScore,
                                    request_id: snapshotData.faceRequestId,
                                    status: snapshotData.biometricStatus || 'Red',
                                    livenessScore: snapshotData.livenessScore,
                                    loading: false,
                                    error: null,
                                }}
                                onApprove={() => setSnapshotIntakeId(null)}
                                onFlag={() => setSnapshotIntakeId(null)}
                            />
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={() => setSnapshotIntakeId(null)}
                                    className="px-8 py-3 border border-white/20 text-white hover:bg-white/10 rounded-full font-bold text-[10px] tracking-[0.2em] uppercase transition-all shadow-lg active:scale-95"
                                    aria-label="Close forensic snapshot view"
                                >
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
