import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IntakeReview from './IntakeReview';
import AuditLogs from './AuditLogs';
import { Shield, Key, MapPin, Clock, Lock, Search, Fingerprint, ShieldAlert, RefreshCw, AlertTriangle } from 'lucide-react';
import useSessionTimeout from './hooks/useSessionTimeout';
import { AreaChart } from '@tremor/react';

const mockPerformanceData = [
    { date: 'Jan', 'Confidence Score': 80, 'Financial Alpha': 40 },
    { date: 'Feb', 'Confidence Score': 85, 'Financial Alpha': 45 },
    { date: 'Mar', 'Confidence Score': 90, 'Financial Alpha': 50 },
    { date: 'Apr', 'Confidence Score': 88, 'Financial Alpha': 60 },
    { date: 'May', 'Confidence Score': 92, 'Financial Alpha': 70 },
    { date: 'Jun', 'Confidence Score': 95, 'Financial Alpha': 85 },
];

interface FirmStatus {
    id: string;
    name: string;
    region: string;
    ev_ticker: string;
    sentinel_score: number;
    oauth_status: 'healthy' | 'warning' | 'expired';
    lead_velocity: 'stable' | 'spike';
    last_audit: string;
    drift_alert: boolean;
    data_residency: 'UK' | 'EMEA' | 'ERR';
    token_expiry: string;
    logs: { action: string; time: string; status: string; pii_status: 'scrubbed' | 'flagged' }[];
}

export default function AdminDashboard() {
    const [firms, setFirms] = useState<FirmStatus[]>([]);
    const [selectedFirm, setSelectedFirm] = useState<FirmStatus | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [providerStatus, setProviderStatus] = useState({ clio: 'Syncing...', ms: 'Online', hmlr: 'Syncing...', routing: 'Initializing...' });
    const [loading, setLoading] = useState(true);
    const [impersonateReason, setImpersonateReason] = useState("");
    const [showImpersonateModal, setShowImpersonateModal] = useState(false);
    const [lockingDown, setLockingDown] = useState(false);
    const [detailView, setDetailView] = useState<'system' | 'intakes'>('intakes');
    const [sessionExpired, setSessionExpired] = useState(false);

    // FIX 2.2: 30-minute inactivity timeout — SRA Technology Guidelines 2025
    useSessionTimeout({
        timeoutMs: 30 * 60 * 1000,
        onTimeout: useCallback(() => {
            setSessionExpired(true);
            setTimeout(() => window.location.reload(), 4000);
        }, []),
    });

    const API_BASE = import.meta.env.VITE_ADMIN_API_BASE || '';

    const fetchData = async () => {
        try {
            const [firmsRes, statusRes] = await Promise.all([
                fetch(`${API_BASE}/firms`),
                fetch(`${API_BASE}/provider-status`)
            ]);
            const firmsData = await firmsRes.json();
            const statusData = await statusRes.json();

            setFirms(firmsData);
            setProviderStatus(statusData);

            if (selectedFirm) {
                const updated = firmsData.find((f: FirmStatus) => f.id === selectedFirm.id);
                if (updated) setSelectedFirm(updated);
            }
            setLoading(false);
        } catch (err) {
            console.error("Master Command - Data Sync Failed:", err);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [selectedFirm?.id]);

    const handleForceRefresh = async (fid: string) => {
        try {
            const res = await fetch(`${API_BASE}/remediate/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firm_id: fid })
            });
            const data = await res.json();
            alert(`Sovereign Repair: OAuth Refreshed for ${fid}. New Expiry: ${data.new_expiry}`);
            fetchData();
        } catch (err) {
            alert("Repair Failed: Container Unreachable.");
        }
    };

    const handleRedactionAudit = async (fid: string) => {
        try {
            const res = await fetch(`${API_BASE}/remediate/audit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firm_id: fid })
            });
            const auditLogs = await res.json();

            if (selectedFirm) {
                const auditedLogs = auditLogs.map((log: any) => ({
                    action: log.action,
                    time: new Date().toLocaleTimeString(),
                    status: log.leak_detected ? 'LEAK_DETECTED' : 'CLEAN',
                    pii_status: log.leak_detected ? 'flagged' : 'scrubbed'
                }));
                setSelectedFirm({
                    ...selectedFirm,
                    logs: [...auditedLogs, ...selectedFirm.logs]
                });
            }
            alert(`Audit Complete: ${auditLogs.filter((l: any) => l.leak_detected).length} leaks isolated and redacted.`);
        } catch (err) {
            alert("Audit Failed: Encryption Handshake Error.");
        }
    };

    const handleImpersonate = async () => {
        if (!impersonateReason || impersonateReason.length < 10) {
            alert("Sovereign Shield: Reason code must be at least 10 characters for audit compliance.");
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/impersonate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firm_id: selectedFirm?.id, reason_code: impersonateReason })
            });
            const data = await res.json();
            if (data.status === 'ACCESS_GRANTED') {
                alert(`Impersonation Active. Session: ${data.session_id}\nAudit Hash Generated.`);
                setShowImpersonateModal(false);
            }
        } catch (err) {
            alert("Ghosting Protocol Active: Target Silo Unreachable.");
        }
    };

    const handleGlobalLockdown = async () => {
        if (!confirm("🚨 ALERT: This will revoke ALL active OAuth tokens and disconnect ALL Law Firms. Proceed with Global Lockdown?")) return;
        setLockingDown(true);
        try {
            const res = await fetch(`${API_BASE}/lockdown`, { method: 'POST' });
            const data = await res.json();
            alert(`PLATFORM LOCKED. ${data.revoked_count} silos disconnected.\nTimestamp: ${data.timestamp}`);
        } catch (err) {
            alert("Lockdown Failed: Security Core offline.");
        }
        setLockingDown(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-london-blue selection:text-white pt-28 pb-16 px-10 relative">
            <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-london-blue/20 to-transparent pointer-events-none"></div>
            {/* FIX 2.2: Session Expiry Banner */}
            <AnimatePresence>
                {sessionExpired && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center"
                        role="alertdialog"
                        aria-modal="true"
                        aria-label="Session expired"
                    >
                        <div className="bg-white border border-slate-200 rounded shadow-2xl p-12 max-w-md text-center">
                            <AlertTriangle className="text-amber-500 mx-auto mb-6" size={48} aria-hidden="true" />
                            <h2 className="text-2xl font-serif font-bold text-slate-900 mb-4">Session Expired</h2>
                            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                                Your session timed out after 30 minutes of inactivity, as required by SRA Technology Guidelines.
                                You will be redirected to login shortly.
                            </p>
                            <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                <motion.div className="bg-london-blue h-full" initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 4 }} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes ticker {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .status-pulse {
                    box-shadow: 0 0 10px currentColor;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}} />

            {/* --- MASTER STATUS BAR --- */}
            <div className="flex bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg rounded-2xl p-4 mb-10 w-full overflow-hidden items-center text-[10px] tracking-[0.2em] uppercase font-bold text-slate-400 relative z-10">
                <div className="flex items-center space-x-3 text-london-blue border-r border-white/10 pr-8 mr-8">
                    <Shield size={18} />
                    <span className="font-serif tracking-tight normal-case text-lg font-bold">Lexis-AI Command</span>
                </div>

                <div className="flex space-x-10 items-center">
                    <div className="flex items-center space-x-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 status-pulse"></span>
                        <span className="text-slate-500">Clio EMEA: <span className="text-london-blue font-mono">{providerStatus.clio}</span></span>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 status-pulse"></span>
                        <span className="text-slate-500">Microsoft: <span className="text-london-blue font-mono">{providerStatus.ms}</span></span>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className={`w-2 h-2 rounded-full status-pulse ${providerStatus.hmlr === 'Operational' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        <span className="text-slate-500">Land Registry: <span className="text-london-blue font-mono">{providerStatus.hmlr}</span></span>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative ml-12 border-l border-slate-100 pl-8 h-5 text-london-blue/60 font-mono text-[9px] flex items-center">
                    <div className="whitespace-nowrap flex space-x-12" style={{ animation: 'ticker 30s linear infinite' }}>
                        <span>ROUTING: {providerStatus.routing}</span>
                        <span>SHIELD: ACTIVE IP HANDSHAKE.</span>
                        <span>SILOS: {firms.length} NODES VERIFIED.</span>
                        <span>AUDIT: 100% IMMUTABLE.</span>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT GRID --- */}
            <div className="grid grid-cols-12 gap-10 h-[calc(100vh-320px)]">

                {/* LEFT: FIRM AGGREGATOR */}
                <div className="col-span-12 lg:col-span-8 flex flex-col">
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h2 className="text-3xl font-serif font-bold text-white tracking-tight">Silo Navigator</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sovereign Law Firm Management</p>
                        </div>
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by Firm ID or Reference..."
                                className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-2xl pl-12 pr-6 py-3.5 text-xs w-80 focus:border-london-blue outline-none transition-all shadow-sm font-medium placeholder-slate-500"
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Network Alpha Performance Overview */}
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full mb-8 relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Network Alpha & Confidence Scoring</h3>
                            <div className="flex items-center space-x-4 text-[10px] uppercase font-bold text-slate-400">
                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Confidence</span>
                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Alpha</span>
                            </div>
                        </div>
                        <AreaChart
                            className="h-32 mt-4"
                            data={mockPerformanceData}
                            index="date"
                            categories={['Confidence Score', 'Financial Alpha']}
                            colors={['blue', 'emerald']}
                            valueFormatter={(number) => `${number.toString()}%`}
                            showYAxis={false}
                            showGridLines={false}
                            showLegend={false}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto pr-4 custom-scrollbar pb-10">
                        {loading ? (
                            <div className="col-span-full h-80 flex flex-col items-center justify-center text-slate-300">
                                <RefreshCw className="animate-spin mb-6" size={40} />
                                <p className="text-[10px] uppercase tracking-[0.3em] font-bold">Synchronizing Gateway Environment...</p>
                            </div>
                        ) : firms.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.id.includes(searchQuery)).map(firm => (
                            <motion.div
                                key={firm.id}
                                whileHover={{ y: -6, boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.3)' }}
                                onClick={() => setSelectedFirm(firm)}
                                className={`group p-8 bg-white/5 backdrop-blur-md border rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden shadow-sm
                                    ${selectedFirm?.id === firm.id ? 'border-london-blue border-2' : 'border-white/10 hover:border-london-blue/50'}
                                    ${firm.lead_velocity === 'spike' ? 'bg-red-500/10' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="font-mono text-[9px] text-slate-400 font-bold tracking-tight mb-1 uppercase">{firm.id}</p>
                                        <h3 className="text-lg font-serif font-bold text-white group-hover:text-london-blue transition-colors truncate">{firm.name}</h3>
                                    </div>
                                    <div className={`p-2.5 rounded-xl border ${firm.oauth_status === 'healthy' ? 'bg-white/10 border-white/10 text-london-blue' : 'bg-red-500/20 border-red-500/30 text-red-500'}`}>
                                        <Key size={16} className={firm.oauth_status === 'healthy' ? 'opacity-80' : 'animate-pulse'} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <p className="text-[8px] text-slate-400 font-bold uppercase mb-1.5 tracking-widest">EV Ticker</p>
                                        <p className="text-sm font-mono font-bold text-london-blue">{firm.ev_ticker}</p>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <p className="text-[8px] text-slate-400 font-bold uppercase mb-1.5 tracking-widest">Sentinel Score</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-800 h-1 rounded-full overflow-hidden">
                                                <div className="bg-emerald-400 h-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" style={{ width: `${firm.sentinel_score}%` }}></div>
                                            </div>
                                            <p className="text-[10px] text-white font-bold">{firm.sentinel_score}%</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-5 border-t border-white/10">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${firm.drift_alert ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{firm.drift_alert ? 'Drift' : 'Stable'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-london-blue/30"></div>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{firm.data_residency}</p>
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1.5 uppercase">
                                        <Clock size={12} />
                                        <span>{firm.token_expiry}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: DRILL-DOWN REMEDIATION */}
                <div className="col-span-12 lg:col-span-4 h-full relative z-10">
                    <AnimatePresence mode="wait">
                        {selectedFirm ? (
                            <motion.div
                                key={selectedFirm.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl h-full flex flex-col overflow-hidden shadow-2xl"
                            >
                                <div className="p-10 pb-8 bg-white/5">
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <h2 className="text-2xl font-serif font-bold text-white mb-2 tracking-tight">{selectedFirm.name}</h2>
                                            <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                                                <MapPin size={12} className="mr-2 text-london-blue" />
                                                Data Residency: {selectedFirm.data_residency}
                                            </div>
                                        </div>
                                        <div className="px-3 py-1.5 bg-white/10 border border-white/10 rounded-lg shadow-sm text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                            Silo Locked
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-5 mb-6">
                                        <button
                                            onClick={() => handleForceRefresh(selectedFirm.id)}
                                            className="bg-white/10 border border-white/10 text-white text-[10px] font-bold py-4 uppercase tracking-widest hover:border-london-blue transition-all flex items-center justify-center space-x-3 rounded-lg shadow-sm"
                                        >
                                            <Key size={14} className="text-london-blue" />
                                            <span>Oauth Repair</span>
                                        </button>
                                        <button
                                            onClick={() => handleRedactionAudit(selectedFirm.id)}
                                            className={`text-[10px] font-bold py-4 uppercase tracking-widest transition-all flex items-center justify-center space-x-3 border rounded-lg shadow-sm
                                            ${selectedFirm.logs.some(l => l.pii_status === 'flagged') ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' : 'bg-white/10 border-white/10 text-white hover:border-london-blue'}`}
                                        >
                                            <Shield size={14} className={selectedFirm.logs.some(l => l.pii_status === 'flagged') ? 'text-red-400' : 'text-london-blue'} />
                                            <span>PII Scrub</span>
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setShowImpersonateModal(true)}
                                        className="w-full bg-london-blue text-white text-[10px] font-bold py-5 uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center space-x-3 mb-8 rounded-lg shadow-[0_0_15px_rgba(8,145,178,0.5)] active:scale-95"
                                    >
                                        <Fingerprint size={16} />
                                        <span>Architect Override</span>
                                    </button>

                                    <div className="pt-6 border-t border-white/10">
                                        <button
                                            onClick={handleGlobalLockdown}
                                            disabled={lockingDown}
                                            className="w-full border border-red-500/30 text-red-500 text-[10px] font-bold py-4 uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center space-x-3 rounded-lg"
                                        >
                                            <ShieldAlert size={14} />
                                            <span>{lockingDown ? 'Severing Silos...' : 'Global Silo Lockdown'}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col overflow-hidden">
                                    {/* Sub-navigation for Drill-down */}
                                    <div className="flex bg-white/5 border-y border-white/10">
                                        <button
                                            onClick={() => setDetailView('system')}
                                            className={`flex-1 py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${detailView === 'system' ? 'text-london-blue border-b-2 border-london-blue bg-white/10' : 'text-slate-500 hover:text-white'}`}
                                        >
                                            Audit Protocol
                                        </button>
                                        <button
                                            onClick={() => setDetailView('intakes')}
                                            className={`flex-1 flex items-center justify-center py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${detailView === 'intakes' ? 'text-london-blue border-b-2 border-london-blue bg-white/10' : 'text-slate-500 hover:text-white'}`}
                                        >
                                            Pending Intakes
                                            <span className="ml-3 bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">1</span>
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/50 p-4">
                                        {/* Simplified place-holder list for minimalist presentation */}
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Activity Log</div>
                                        {detailView === 'system' ? (
                                            <AuditLogs />
                                        ) : (
                                            <IntakeReview />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="bg-white/5 border-2 border-white/10 border-dashed rounded-2xl h-full flex flex-col items-center justify-center text-center p-16">
                                <div className="w-20 h-20 bg-white/10 border border-white/10 rounded-full flex items-center justify-center mb-8 shadow-sm">
                                    <Lock size={32} className="text-slate-400" />
                                </div>
                                <h3 className="text-2xl font-serif font-bold text-white mb-4">Select Sovereign Silo</h3>
                                <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-[0.3em] max-w-[240px] mx-auto">
                                    Architect Authentication active. <br /> Select a firm node for administrative remediation.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* --- SYSTEM HUD BAR --- */}
            <div className="fixed bottom-0 left-0 w-full h-12 bg-white border-t border-slate-100 text-slate-400 flex items-center text-[9px] font-bold px-10 uppercase overflow-hidden z-[50] shadow-2xl">
                <div className="flex space-x-12 whitespace-nowrap" style={{ animation: 'ticker 40s linear infinite' }}>
                    <span className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> NETWORK: SHIELD SECURE</span>
                    <span className="flex items-center gap-3">ARCHITECT: 01x88_ROOT_ACCESS</span>
                    <span className="flex items-center gap-3">PERIMETER: VERIFIED (UK-CENTRAL)</span>
                    <span className="flex items-center gap-3">HMLR_STATUS: OPERATIONAL</span>
                    <span className="flex items-center gap-3">COMPANIES_HOUSE: NOMINAL</span>
                    <span className="flex items-center gap-3">SRA_ALERTS: NO_CRITICAL_DRIFT</span>
                    <span className="flex items-center gap-3">ENCRYPTION: AES-256-GCM ACTIVE</span>
                </div>
            </div>

            {/* --- MODALS --- */}
            <AnimatePresence>
                {showImpersonateModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-8"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white border border-slate-100 p-12 rounded-sm max-w-lg w-full shadow-2xl overflow-hidden relative"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-london-blue"></div>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-14 w-14 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-sm">
                                    <Fingerprint className="text-london-blue" size={32} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">Audit Protocol</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Establishing Architect Handshake</p>
                                </div>
                            </div>

                            <p className="text-slate-500 font-medium text-sm mb-10 leading-relaxed border-l-4 border-london-blue pl-6">
                                Architect Override requires a specific reason code for the permanent 2026 Sovereign Audit Trail and SRA Principle 2 compliance.
                            </p>

                            <textarea
                                value={impersonateReason}
                                onChange={(e) => setImpersonateReason(e.target.value)}
                                placeholder="Ref: Ticket #402: Matter Fragment Debugging..."
                                className="w-full bg-slate-50 border border-slate-200 p-6 text-sm text-slate-900 rounded-sm focus:border-london-blue outline-none mb-10 h-40 shadow-inner font-medium"
                            />

                            <div className="flex gap-6">
                                <button onClick={() => setShowImpersonateModal(false)} className="flex-1 border border-slate-200 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all rounded-sm">Abort Signal</button>
                                <button onClick={handleImpersonate} className="flex-1 bg-london-blue py-5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-slate-900 shadow-xl transition-all rounded-sm">Establish Link</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
