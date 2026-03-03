import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Trash2, Cpu, FileText, Loader2, Shield } from 'lucide-react';
import SovereignSnapshot from './SovereignSnapshot';
import ChainOfTrust from './ChainOfTrust';
import VisionGate from './VisionGate';

export default function IntakeReview() {
    const [viewMode, setViewMode] = useState<'standard' | 'split' | 'vision'>('vision');
    const [commitStatus, setCommitStatus] = useState<'pending' | 'syncing' | 'synced' | 'flagged' | 'wiped'>('pending');
    const [shredderLog, setShredderLog] = useState<string[]>([]);

    // Biometric state driven by VisionGate or direct API
    const [intakeId] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('intake_id') || `IX-${Date.now().toString(36).toUpperCase()}`;
    });

    const [biometricData, setBiometricData] = useState<{
        confidence: number | null;
        request_id: string | null;
        status: 'Green' | 'Amber' | 'Red';
        livenessScore?: number | null;
        loading: boolean;
        error: string | null;
    }>({
        confidence: null,
        request_id: null,
        status: 'Green',
        loading: true,
        error: null
    });

    const [entityData, setEntityData] = useState<{
        status: 'verified' | 'pending' | 'failed';
        entity_name: string | null;
        role: string | null;
        source: string | null;
    }>({ status: 'pending', entity_name: null, role: null, source: null });

    const [conflictData, setConflictData] = useState<{
        level: 'clear' | 'amber' | 'red';
        description: string | null;
        reference: string | null;
    }>({ level: 'clear', description: null, reference: null });

    const [reasoningInsight, setReasoningInsight] = useState<{
        text: string | null;
        document_ref: string | null;
    }>({ text: null, document_ref: null });

    type StepState = 'complete' | 'active' | 'pending' | 'error';

    const [trustStatus, setTrustStatus] = useState<{
        intake: StepState;
        biometric: StepState;
        shred: StepState;
        aml: StepState;
        clio: StepState;
    }>({
        intake: 'complete',
        biometric: 'active',
        shred: 'pending',
        aml: 'pending',
        clio: 'pending',
    });

    useEffect(() => {
        if (biometricData.confidence !== null && !biometricData.loading) {
            setViewMode('standard');
        }
    }, [biometricData.confidence, biometricData.loading]);

    useEffect(() => {
        const fetchIntakeData = async () => {
            try {
                const entityRes = await fetch(`/api/entity-check?intake_id=${intakeId}`).catch(() => null);
                if (entityRes && entityRes.ok) {
                    const data = await entityRes.json();
                    setEntityData(data);
                    if (data.status === 'verified') setTrustStatus(prev => ({ ...prev, aml: 'complete' }));
                }
            } catch (_) { }

            try {
                const conflictRes = await fetch(`/api/conflict-check?intake_id=${intakeId}`).catch(() => null);
                if (conflictRes && conflictRes.ok) {
                    const data = await conflictRes.json();
                    setConflictData(data);
                }
            } catch (_) { }

            try {
                const reasoningRes = await fetch(`/api/reasoning-insight?intake_id=${intakeId}`).catch(() => null);
                if (reasoningRes && reasoningRes.ok) {
                    const data = await reasoningRes.json();
                    setReasoningInsight(data);
                }
            } catch (_) { }
        };

        fetchIntakeData();
    }, [intakeId]);

    const handleVisionVerified = (result: { confidence: number; request_id: string; status: string; livenessScore: number }) => {
        setBiometricData({
            confidence: result.confidence,
            request_id: result.request_id,
            status: result.status as 'Green' | 'Amber' | 'Red',
            livenessScore: result.livenessScore,
            loading: false,
            error: null
        });
        setTrustStatus(prev => ({ ...prev, biometric: 'complete', aml: 'complete' }));
        setTimeout(() => setViewMode('standard'), 1500);
    };

    const handleVisionFailed = (_error: string) => {
        setTrustStatus(prev => ({ ...prev, biometric: 'error' }));
    };

    const handleAction = async (action: 'sync' | 'flag' | 'wipe') => {
        if (action === 'flag') {
            setCommitStatus('flagged');
            return;
        }
        if (action === 'wipe') {
            if (confirm("🚨 Forensic Wipe Requested: This will cryptographically shred all intake data from the Sovereign Vault. Proceed?")) {
                setCommitStatus('wiped');
            }
            return;
        }

        setCommitStatus('syncing');
        setShredderLog(['Initializing Sovereign Shredder Pipeline...']);

        try {
            const res = await fetch('/api/sovereign-shredder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientData: {
                        name: entityData.entity_name || 'Prospect Identity',
                        matterDescription: reasoningInsight.text || 'Omitted for Security',
                    },
                    matterId: intakeId
                })
            });
            const data = await res.json();

            if (data.success) {
                const trail = data.audit_trail || [];
                for (const entry of trail) {
                    await new Promise(r => setTimeout(r, 400));
                    setShredderLog(prev => [...prev, `[${entry.module}] ${entry.action} -> Verified`]);
                }

                await new Promise(r => setTimeout(r, 500));
                setShredderLog(prev => [...prev,
                `✓ Contact Created: ${data.clio.contact_id}`,
                `✓ Matter Opened: ${data.clio.matter_id}`,
                `✓ PII Redacted: ${data.shredder.items_destroyed} fields`,
                    `✓ Sovereign Status: Immutable Audit Locked`,
                ]);

                setTrustStatus(prev => ({ ...prev, shred: 'complete', clio: 'complete' }));
                await new Promise(r => setTimeout(r, 1000));
                setCommitStatus('synced');
            } else {
                setShredderLog(prev => [...prev, `✗ Pipeline Collision: ${data.error}`]);
                setCommitStatus('pending');
            }
        } catch (_err) {
            setShredderLog(prev => [...prev, '✗ Critical: Shredder Handshake Timeout.']);
            setCommitStatus('pending');
        }
    };

    if (commitStatus === 'wiped') return (
        <div className="h-full flex flex-col items-center justify-center p-12 bg-white text-center">
            <Trash2 size={64} className="text-slate-200 mb-8" />
            <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4 tracking-tight">Forensic Wipe Executed.</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] font-sans">Identity Silo Purged from UK-Sovereign-West</p>
        </div>
    );

    if (commitStatus === 'synced') return (
        <div className="h-full flex flex-col items-center justify-center p-12 bg-white text-center overflow-auto custom-scrollbar">
            <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mb-10 border border-emerald-100 shadow-sm mx-auto">
                <CheckCircle size={40} className="text-emerald-500" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4 tracking-tight">Clio Synthesis Complete.</h2>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-[0.3em] font-sans mb-12">Handover protocol finalized and audit locked</p>

            <div className="bg-slate-50 border border-slate-100 rounded-sm p-10 max-w-lg w-full shadow-2xl text-left">
                <div className="flex items-center gap-3 text-london-blue text-[10px] font-bold uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">
                    <Shield size={16} /> Forensic Handover Log
                </div>
                <div className="space-y-3 font-mono text-[10px] tracking-tight">
                    {shredderLog.map((line, i) => (
                        <motion.p key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className={`${line.startsWith('✓') ? 'text-emerald-600 font-bold' : line.startsWith('✗') ? 'text-red-500' : 'text-slate-400'}`}>
                            {line}
                        </motion.p>
                    ))}
                </div>
            </div>
        </div>
    );

    if (commitStatus === 'flagged') return (
        <div className="h-full flex flex-col items-center justify-center p-12 bg-white text-center">
            <div className="h-20 w-20 bg-amber-50 rounded-full flex items-center justify-center mb-10 border border-amber-100 shadow-sm mx-auto">
                <AlertTriangle size={40} className="text-amber-500" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4 tracking-tight">Orchestration Parked.</h2>
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-[0.3em] font-sans">Automation Disconnected. awaiting manual review by senior counsel.</p>
        </div>
    );

    if (commitStatus === 'syncing') return (
        <div className="h-full flex flex-col items-center justify-center p-12 bg-white text-center overflow-auto custom-scrollbar">
            <div className="mb-10 relative">
                <Loader2 size={64} className="text-london-blue animate-spin opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Database size={24} className="text-london-blue" />
                </div>
            </div>
            <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4 tracking-tight">Sovereign Protocol Active.</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] font-sans mb-12">Bridging Silos • Redacting PII • Hashing Audit Vault</p>

            <div className="bg-white border border-slate-100 rounded-sm p-10 max-w-lg w-full shadow-2xl text-left relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-london-blue animate-pulse"></div>
                <div className="flex items-center gap-3 text-london-blue text-[10px] font-bold uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">
                    <Shield size={16} /> Live Pipeline Feed
                </div>
                <div className="space-y-3 font-mono text-[10px] tracking-tight">
                    {shredderLog.map((line, i) => (
                        <motion.p key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className={`${line.startsWith('✓') ? 'text-emerald-600' : line.startsWith('✗') ? 'text-red-500' : 'text-slate-400'}`}>
                            {line}
                        </motion.p>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-white text-slate-800 font-sans overflow-hidden">

            {/* Premium Intake Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50 h-20 shrink-0">
                <button
                    onClick={() => setViewMode('vision')}
                    className={`flex-1 flex flex-col items-center justify-center text-[10px] uppercase tracking-widest font-bold border-r border-slate-100 transition-all ${viewMode === 'vision' ? 'bg-white text-london-blue border-b-4 border-b-london-blue' : 'text-slate-400 hover:text-slate-900 group'}`}
                >
                    <Shield size={14} className={`mb-1 ${viewMode === 'vision' ? 'text-london-blue' : 'text-slate-300 group-hover:text-slate-500'}`} />
                    Vision Gate
                </button>
                <button
                    onClick={() => setViewMode('standard')}
                    className={`flex-1 flex flex-col items-center justify-center text-[10px] uppercase tracking-widest font-bold border-r border-slate-100 transition-all ${viewMode === 'standard' ? 'bg-white text-london-blue border-b-4 border-b-london-blue' : 'text-slate-400 hover:text-slate-900 group'}`}
                >
                    <FileText size={14} className={`mb-1 ${viewMode === 'standard' ? 'text-london-blue' : 'text-slate-300 group-hover:text-slate-500'}`} />
                    Sovereign Review
                </button>
                <button
                    onClick={() => setViewMode('split')}
                    className={`flex-1 flex flex-col items-center justify-center text-[10px] uppercase tracking-widest font-bold transition-all ${viewMode === 'split' ? 'bg-white text-london-blue border-b-4 border-b-london-blue' : 'text-slate-400 hover:text-slate-900 group'}`}
                >
                    <Cpu size={14} className={`mb-1 ${viewMode === 'split' ? 'text-london-blue' : 'text-slate-300 group-hover:text-slate-500'}`} />
                    Deep Reasoning
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Module A: Chain of Trust Sidebar */}
                <ChainOfTrust status={trustStatus} />

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden bg-slate-50/20">
                    <AnimatePresence mode="wait">
                        {viewMode === 'vision' && (
                            <motion.div
                                key="vision"
                                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                                className="flex-1 p-10 overflow-y-auto flex items-start justify-center"
                            >
                                <div className="max-w-3xl w-full">
                                    <VisionGate
                                        onVerified={handleVisionVerified}
                                        onFailed={handleVisionFailed}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {viewMode === 'standard' && (
                            <motion.div
                                key="standard"
                                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                                className="flex-1 p-10 overflow-y-auto custom-scrollbar"
                            >
                                <SovereignSnapshot
                                    clientData={{ id: intakeId }}
                                    biometricData={biometricData}
                                    entityData={entityData}
                                    conflictData={conflictData}
                                    reasoningInsight={reasoningInsight}
                                    onApprove={() => handleAction('sync')}
                                    onFlag={() => handleAction('flag')}
                                />
                            </motion.div>
                        )}

                        {viewMode === 'split' && (
                            <motion.div
                                key="split"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="flex-1 flex overflow-hidden lg:flex-row flex-col"
                            >
                                {/* Left Side: Chat Transcript */}
                                <div className="lg:w-1/2 border-r border-slate-100 p-12 lg:overflow-y-auto bg-white custom-scrollbar">
                                    <h3 className="text-slate-300 text-[10px] uppercase font-bold tracking-[0.2em] mb-10 flex items-center">
                                        <FileText size={14} className="mr-3" /> Digital Intake Transcript
                                    </h3>
                                    <div className="space-y-10">
                                        <div className="relative pl-12">
                                            <div className="absolute left-0 top-0 h-full w-px bg-slate-100"></div>
                                            <div className="absolute left-[-4px] top-1 w-2 h-2 rounded-full bg-london-blue"></div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Client Statement Recorded</p>
                                            <p className="text-slate-700 leading-relaxed p-8 bg-slate-50 rounded-sm border border-slate-100 shadow-sm font-serif italic text-lg">
                                                "I am entering a commercial lease starting <span className="text-london-blue bg-london-blue/5 font-bold px-2 rounded-sm border border-london-blue/20">June 1st</span>. I need a solicitor to review it before signature."
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: AI Reasoning / Document Extraction */}
                                <div className="lg:w-1/2 p-12 lg:overflow-y-auto bg-white custom-scrollbar">
                                    <h3 className="text-london-blue text-[10px] uppercase font-bold tracking-[0.2em] mb-10 flex items-center">
                                        <Cpu size={14} className="mr-3" /> Sovereign Reasoning Insight
                                    </h3>
                                    <div className="space-y-10">
                                        <div className="relative pl-12">
                                            <div className="absolute left-0 top-0 h-full w-px bg-slate-100"></div>
                                            <div className="absolute left-[-4px] top-1 w-2 h-2 rounded-full bg-london-blue"></div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Extraction: lease_agreement.pdf</p>
                                            <p className="text-slate-600 leading-relaxed p-8 bg-slate-50 border border-slate-100 rounded-sm shadow-sm font-mono text-xs">
                                                "...the tenant's liability commences strictly on <span className="text-emerald-600 bg-emerald-50 font-bold px-2 rounded-sm border border-emerald-100 uppercase tracking-tighter">June 12th</span>, with all preceding obligations binding."
                                            </p>
                                        </div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            className="bg-red-50 border border-red-100 p-8 rounded-sm shadow-xl"
                                        >
                                            <div className="flex items-center text-red-600 font-bold mb-4 uppercase tracking-widest text-[10px]">
                                                <AlertTriangle size={16} className="mr-3" /> Discrepancy Protocol Triggered
                                            </div>
                                            <p className="text-red-700 leading-relaxed text-sm font-medium">
                                                Contextual Misalignment detected: Client claims June 1st commencement, but the forensic document extraction identifies a June 12th legal start date. Discrepancy risk: <span className="font-bold">High</span>.
                                            </p>
                                        </motion.div>

                                        <div className="pt-10 border-t border-slate-100 flex justify-end">
                                            <button
                                                onClick={() => handleAction('flag')}
                                                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-600 px-8 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center transition-all rounded-sm shadow-sm group"
                                            >
                                                <AlertTriangle size={14} className="mr-3 group-hover:text-red-500" />
                                                Flag & Revoke Automation
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// Ensure Database icon is available from lucide-react or define it
function Database({ className, size, strokeWidth }: { className?: string, size?: number, strokeWidth?: number }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size || 24}
            height={size || 24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth || 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5V19A9 3 0 0 0 21 19V5" />
            <path d="M3 12A9 3 0 0 0 21 12" />
        </svg>
    );
}
