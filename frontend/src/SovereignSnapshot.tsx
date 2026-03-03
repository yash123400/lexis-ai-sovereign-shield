import { ShieldCheck, AlertTriangle, Scale, UserCheck, Building2, Zap, Loader2 } from 'lucide-react';

interface EntityData {
    status: 'verified' | 'pending' | 'failed';
    entity_name: string | null;
    role: string | null;
    source: string | null;
}

interface ConflictData {
    level: 'clear' | 'amber' | 'red';
    description: string | null;
    reference: string | null;
}

interface ReasoningInsight {
    text: string | null;
    document_ref: string | null;
}

interface SovereignSnapshotProps {
    clientData: {
        id: string;
    };
    biometricData?: {
        confidence: number | null;
        request_id: string | null;
        status: 'Green' | 'Amber' | 'Red';
        livenessScore?: number | null;
        loading: boolean;
        error: string | null;
    };
    entityData?: EntityData;
    conflictData?: ConflictData;
    reasoningInsight?: ReasoningInsight;
    onApprove: () => void;
    onFlag: () => void;
}

const SovereignSnapshot = ({ clientData, biometricData, entityData, conflictData, reasoningInsight, onApprove, onFlag }: SovereignSnapshotProps) => {

    // Mapping states to colors
    const getBioColors = () => {
        if (!biometricData || biometricData.loading) return { border: 'border-slate-200', text: 'text-london-blue' };
        if (biometricData.error || biometricData.status === 'Red') return { border: 'border-red-200 bg-red-50/30', text: 'text-red-600' };
        if (biometricData.status === 'Amber') return { border: 'border-amber-200 bg-amber-50/30', text: 'text-amber-600' };
        return { border: 'border-emerald-200 bg-emerald-50/30', text: 'text-emerald-700' };
    };

    const getEntityColors = () => {
        if (!entityData || entityData.status === 'pending') return { border: 'border-slate-200', text: 'text-slate-400', label: 'Pending', bg: '' };
        if (entityData.status === 'failed') return { border: 'border-red-200 bg-red-50/30', text: 'text-red-600', label: 'Failed', bg: '' };
        return { border: 'border-london-blue/20 bg-slate-50', text: 'text-london-blue', label: 'Verified', bg: '' };
    };

    const getConflictColors = () => {
        if (!conflictData || conflictData.level === 'clear') return { border: 'border-emerald-200 bg-emerald-50/30', text: 'text-emerald-700', label: 'Clear', bg: '' };
        if (conflictData.level === 'red') return { border: 'border-red-200 bg-red-50/30', text: 'text-red-600', label: 'High Risk', bg: '' };
        return { border: 'border-amber-200 bg-amber-50/30', text: 'text-amber-600', label: 'Amber Alert', bg: '' };
    };

    const bioColors = getBioColors();
    const entColors = getEntityColors();
    const confColors = getConflictColors();

    // Determine header status badge
    const headerStatus = (() => {
        if (!biometricData || biometricData.loading) return { text: 'Verification Pending', color: 'text-slate-400 border-slate-200 bg-slate-50' };
        if (biometricData.error || biometricData.status === 'Red') return { text: 'Verification Failed', color: 'text-red-600 border-red-200 bg-red-50' };
        if (biometricData.status === 'Amber') return { text: 'Manual Review Required', color: 'text-amber-600 border-amber-200 bg-amber-50 animate-pulse' };
        return { text: 'Live Verification Active', color: 'text-emerald-600 border-emerald-200 bg-emerald-50 animate-pulse' };
    })();

    const isActionable = biometricData && !biometricData.loading && !biometricData.error && biometricData.status !== 'Red';

    return (
        <div className="max-w-4xl mx-auto p-10 bg-white border border-slate-200 rounded shadow-lg">
            {/* Header: Institutional Branding */}
            <div className="flex justify-between items-start mb-10 border-b border-slate-100 pb-8">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                        <Scale className="text-london-blue" size={32} />
                        Sovereign Intake Review
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Dossier ID: {clientData.id}</p>
                </div>
                <div className={`px-4 py-2 rounded-sm border text-[10px] font-bold uppercase tracking-widest ${headerStatus.color} shadow-sm`}>
                    {headerStatus.text}
                </div>
            </div>

            {/* Grid: The 3-Point Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">

                {/* 1. Identity Status (Face++ Integrated) */}
                <div className={`p-6 rounded border ${bioColors.border} transition-all shadow-sm`}>
                    <div className={`flex items-center gap-2.5 mb-4 ${bioColors.text}`}>
                        <UserCheck size={18} />
                        <h3 className="font-bold text-[10px] uppercase tracking-widest">Biometric Match</h3>
                    </div>

                    {!biometricData || biometricData.loading ? (
                        <div className="flex items-center space-x-2 text-slate-400 py-2">
                            <Loader2 size={14} className="animate-spin" />
                            <span className="text-[10px] uppercase tracking-widest font-bold">Awaiting Scan...</span>
                        </div>
                    ) : biometricData.error ? (
                        <>
                            <p className="text-2xl font-serif font-bold text-red-600">Discrepancy</p>
                            <p className="text-[10px] text-red-500 mt-3 leading-relaxed border border-red-100 p-3 bg-red-50/50 rounded-sm italic">
                                {biometricData.error}
                            </p>
                            {biometricData.livenessScore && <p className="text-[10px] text-red-600 mt-2 font-mono font-bold">Liveness Confidence: {biometricData.livenessScore.toFixed(2)}%</p>}
                        </>
                    ) : (
                        <>
                            <p className={`text-2xl font-serif font-bold ${bioColors.text}`}>
                                {biometricData.status} <span className="text-sm font-sans opacity-60">({biometricData.confidence?.toFixed(1)}%)</span>
                            </p>
                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                    Face++ AI Handshake Confirmed. Identical features verified against sovereign document.
                                </p>
                                <span className="text-slate-300 font-mono block break-all text-[9px] uppercase tracking-tighter">
                                    Trace: {biometricData.request_id}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* 2. Entity / KYB Status — Data-Driven */}
                <div className={`p-6 rounded border ${entColors.border} transition-all shadow-sm`}>
                    <div className={`flex items-center gap-2.5 mb-4 ${entColors.text}`}>
                        <Building2 size={18} />
                        <h3 className="font-bold text-[10px] uppercase tracking-widest">Entity Screening</h3>
                    </div>
                    {!entityData || entityData.status === 'pending' ? (
                        <div className="flex items-center space-x-2 text-slate-400 py-2">
                            <Loader2 size={14} className="animate-spin" />
                            <span className="text-[10px] uppercase tracking-widest font-bold">Querying API...</span>
                        </div>
                    ) : (
                        <>
                            <p className="text-2xl font-serif font-bold text-slate-900">
                                {entityData.role || entColors.label}
                            </p>
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                    {entityData.entity_name ? (
                                        <>Confirmed status for <span className="text-london-blue font-bold tracking-tight">{entityData.entity_name}</span> via {entityData.source || 'Companies House'}.</>
                                    ) : (
                                        <>Institutional verification {entityData.status === 'verified' ? 'complete' : 'failed'}.</>
                                    )}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* 3. Risk & Conflicts — Data-Driven */}
                <div className={`p-6 rounded border ${confColors.border} ${confColors.bg} transition-all shadow-sm`}>
                    <div className={`flex items-center gap-2.5 mb-4 ${confColors.text}`}>
                        <AlertTriangle size={18} />
                        <h3 className="font-bold text-[10px] uppercase tracking-widest">Conflict Guard</h3>
                    </div>
                    <p className={`text-2xl font-serif font-bold ${confColors.text}`}>{confColors.label}</p>
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                            {conflictData?.description || (conflictData?.level === 'clear'
                                ? 'No identifiable adverse matter conflicts found in Lexis-AI ledger.'
                                : 'Awaiting clearance report.'
                            )}
                        </p>
                        {conflictData?.reference && (
                            <div className="mt-2 inline-block px-2 py-0.5 bg-london-blue text-white text-[9px] font-bold rounded-sm tracking-widest uppercase cursor-pointer">
                                View Ref: {conflictData.reference}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reasoning Agent Insight Section — Data-Driven */}
            {reasoningInsight?.text && (
                <div className="mb-10 p-8 bg-slate-50 rounded border border-slate-200 shadow-inner">
                    <h4 className="flex items-center gap-2 text-london-blue font-bold text-[10px] uppercase tracking-[0.2em] mb-4">
                        <Zap size={14} className="animate-pulse" /> Senior Solicitor AI Guidance
                    </h4>
                    <p className="text-slate-700 text-base leading-relaxed font-serif italic">
                        "{reasoningInsight.text}"
                    </p>
                    {reasoningInsight.document_ref && (
                        <p className="text-slate-400 font-mono text-[10px] mt-4 uppercase font-bold">Referenced Artifact: {reasoningInsight.document_ref}</p>
                    )}
                </div>
            )}

            {/* The Commit Console */}
            <div className="flex flex-col sm:flex-row gap-6 pt-10 border-t border-slate-100">
                <button
                    onClick={onApprove}
                    disabled={!isActionable}
                    className={`flex-1 flex items-center justify-center gap-3 font-bold py-4 rounded shadow-md transition-all active:transform active:scale-95 text-[11px] uppercase tracking-widest ${isActionable
                        ? 'bg-london-blue hover:bg-slate-900 text-white cursor-pointer'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    <ShieldCheck size={20} />
                    {isActionable ? 'Execute Protocol: Sync to Clio' : 'Identity Verification Required'}
                </button>
                <button
                    onClick={onFlag}
                    className="flex-1 flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-amber-400 text-slate-500 hover:text-amber-600 font-bold py-4 rounded shadow-sm transition-all text-[11px] uppercase tracking-widest"
                >
                    <AlertTriangle size={20} />
                    Escalate to Manual Review
                </button>
            </div>
        </div>
    );
};

export default SovereignSnapshot;
