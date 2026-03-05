import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Shield, AlertTriangle, CheckCircle, Loader2, Fingerprint, Eye, ExternalLink, SquareCheck } from 'lucide-react';

type GateStage = 'idle' | 'passport_capture' | 'selfie_capture' | 'scanning' | 'verified' | 'failed' | 'manual_review_requested';

interface VisionGateProps {
    onVerified: (result: { confidence: number; request_id: string; status: string; livenessScore: number }) => void;
    onFailed: (error: string) => void;
}

export default function VisionGate({ onVerified, onFailed }: VisionGateProps) {
    const [stage, setStage] = useState<GateStage>('idle');
    const [passportFile, setPassportFile] = useState<File | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [passportUrl, setPassportUrl] = useState<string | null>(null);
    const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanText, setScanText] = useState('');
    const [result, setResult] = useState<{ status: string; request_id: string; transaction_hash?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const selfieInputRef = useRef<HTMLInputElement>(null);

    // ── FIX 1.5: Biometric consent state ──────────────────────────────────
    const [consentGiven, setConsentGiven] = useState(false);
    const [consentError, setConsentError] = useState(false);

    const handlePassportUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPassportFile(file);
            const url = URL.createObjectURL(file);
            setPassportUrl(url);
            setStage('selfie_capture');
        }
    }, []);

    const handleSelfieUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelfieFile(file);
            const url = URL.createObjectURL(file);
            setSelfieUrl(url);
        }
    }, []);

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 1000;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                    } else {
                        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const initiateComparison = async () => {
        if (!passportFile || !selfieFile) return;

        setStage('scanning');
        setScanProgress(0);
        setError(null);

        const phases = [
            { progress: 20, text: 'Initialising Megvii handshake...' },
            { progress: 40, text: 'Liveness Detection: Analysing biometric markers...' },
            { progress: 60, text: 'Spoof prevention: Cross-referencing pixel integrity...' },
            { progress: 80, text: '1:1 Facial geometry comparison in progress...' },
            { progress: 92, text: 'Confidence threshold evaluation...' },
            { progress: 97, text: 'Generating cryptographic audit signature...' },
        ];

        const animatePhases = async () => {
            for (const phase of phases) {
                await new Promise(r => setTimeout(r, 350));
                setScanProgress(phase.progress);
                setScanText(phase.text);
            }
        };

        const callApi = async () => {
            const [idData, selfieData] = await Promise.all([
                compressImage(passportFile),
                compressImage(selfieFile),
            ]);

            const res = await fetch('/api/process-kyc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_image_url: idData,
                    selfie_image_url: selfieData,
                })
            });
            return res.json();
        };

        try {
            const [, data] = await Promise.all([animatePhases(), callApi()]);

            setScanProgress(100);
            setScanText('Analysis complete.');
            await new Promise(r => setTimeout(r, 500));

            if (data.success && data.face_match_score > 80) {
                setResult({
                    status: data.status,
                    request_id: data.request_id,
                    transaction_hash: data.transaction_hash,
                });
                setStage('verified');
                onVerified({
                    confidence: data.face_match_score,
                    request_id: data.request_id,
                    status: data.status,
                    livenessScore: data.liveness_score,
                });
            } else {
                const errMsg = data.error || 'Biometric identity could not be verified. Please try again with a clearer photo.';
                setError(errMsg);
                setStage('failed');
                onFailed(errMsg);
            }
        } catch (_err) {
            setError('Secure Gateway Interrupted. Your data is protected. Please try again.');
            setStage('failed');
            onFailed('Secure Gateway Interrupted.');
        }
    };

    return (
        <div
            className="w-full max-w-2xl mx-auto bg-slate-950 border border-white/10 rounded shadow-xl overflow-hidden font-sans"
            role="region"
            aria-label="Identity Verification"
        >
            {/* Header */}
            <div className="bg-slate-950 border-b border-white/10 p-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Eye className="text-london-blue" size={24} aria-hidden="true" />
                        <h2 className="text-xl font-serif font-bold text-slate-100 tracking-tight">Vision Gate Protocol</h2>
                    </div>
                    <div
                        className={`text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-sm border shadow-sm ${stage === 'verified' ? 'text-[#B59410] border-[#B59410]/30 bg-[#B59410]/10' :
                            stage === 'failed' || stage === 'manual_review_requested' ? 'text-red-700 border-red-200 bg-red-50' :
                                stage === 'scanning' ? 'text-london-blue border-london-blue/20 bg-slate-950 animate-pulse' :
                                    'text-slate-400 border-white/10 bg-slate-950'
                            }`}
                        aria-live="polite"
                    >
                        {stage === 'idle' ? 'Awaiting Handshake' :
                            stage === 'passport_capture' ? 'ID Mandatory' :
                                stage === 'selfie_capture' ? 'Liveness Mandatory' :
                                    stage === 'scanning' ? 'Handshaking...' :
                                        stage === 'verified' ? 'Verified' :
                                            stage === 'manual_review_requested' ? 'Escalated' : 'Alert'}
                    </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-3 tracking-[0.1em] font-bold font-mono uppercase">Reference: Megvii-Lexis Biometric Bridge (1:1)</p>
            </div>

            <div className="p-10">
                <AnimatePresence mode="wait">

                    {/* ── STAGE: IDLE — FIX 1.5 CONSENT GATE ── */}
                    {stage === 'idle' && (
                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-10">
                            <Fingerprint className="mx-auto text-london-blue mb-8 opacity-20" size={72} aria-hidden="true" />
                            <h3 className="text-slate-100 font-serif text-2xl mb-4 font-bold">Identity Gating Required</h3>
                            <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed italic">
                                To proceed with your intake, we require a Government-issued ID and a live selfie for 1:1 biometric verification.
                            </p>

                            {/* ── FIX 1.5: GDPR Art.9 Biometric Consent Checkbox ── */}
                            <div className={`max-w-sm mx-auto text-left mb-8 p-5 rounded border ${consentError ? 'border-red-300 bg-red-50' : 'border-white/10 bg-slate-950'}`}>
                                <label htmlFor="biometric-consent" className="flex items-start gap-3 cursor-pointer" aria-required="true">
                                    <div className="relative flex-shrink-0 mt-0.5">
                                        <input
                                            id="biometric-consent"
                                            type="checkbox"
                                            checked={consentGiven}
                                            onChange={(e) => {
                                                setConsentGiven(e.target.checked);
                                                if (e.target.checked) setConsentError(false);
                                            }}
                                            className="w-4 h-4 accent-london-blue cursor-pointer"
                                            aria-describedby="consent-description"
                                        />
                                    </div>
                                    <span id="consent-description" className="text-[11px] text-slate-600 leading-relaxed">
                                        I consent to my <strong>facial biometric data</strong> being processed by{' '}
                                        <strong>Megvii Technology (Face++)</strong> for identity verification purposes.
                                        I understand this is <strong>Special Category data</strong> under UK GDPR Art.9,
                                        and that it will be ephemeralized after verification. I have read and agree to the{' '}
                                        <a
                                            href="/privacy-policy"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-london-blue underline font-semibold inline-flex items-center gap-1"
                                            aria-label="Read Privacy Policy (opens in new tab)"
                                        >
                                            Privacy Policy <ExternalLink size={10} aria-hidden="true" />
                                        </a>.
                                    </span>
                                </label>
                                {consentError && (
                                    <p role="alert" className="text-red-600 text-[10px] font-bold mt-3 uppercase tracking-wider">
                                        You must give explicit consent before biometric verification can begin.
                                    </p>
                                )}
                            </div>

                            <button
                                id="begin-verification-btn"
                                onClick={() => {
                                    if (!consentGiven) {
                                        setConsentError(true);
                                        return;
                                    }
                                    setStage('passport_capture');
                                }}
                                className="w-full bg-[#0a0b10] hover:bg-white/5 text-slate-200 font-bold py-6 px-10 rounded-sm text-[11px] uppercase tracking-[0.3em] transition-all border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50 group"
                                aria-label="Begin biometric security verification"
                            >
                                Enter Client Portal
                            </button>
                        </motion.div>
                    )}

                    {/* ── STAGE: PASSPORT ── */}
                    {stage === 'passport_capture' && (
                        <motion.div key="passport" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="py-6">
                            <div className="text-center mb-10">
                                <Shield className="mx-auto text-london-blue mb-4 opacity-50" size={36} aria-hidden="true" />
                                <h3 className="text-slate-100 font-serif text-xl mb-2 font-bold uppercase tracking-tight">Step 1: Document Gating</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Passport • Driving Licence • National ID</p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePassportUpload}
                                aria-label="Upload government ID document"
                            />
                            <button
                                id="upload-passport-btn"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full border-2 border-dashed border-white/10 hover:border-london-blue hover:bg-slate-950 rounded-lg py-16 text-center transition-all group"
                                aria-label="Click to upload or capture government-issued ID"
                            >
                                <Camera className="mx-auto text-slate-300 group-hover:text-london-blue transition-colors mb-4" size={40} aria-hidden="true" />
                                <p className="text-slate-400 group-hover:text-slate-600 font-bold uppercase tracking-tight text-[11px] transition-colors">Capture or Select Artifact</p>
                            </button>
                        </motion.div>
                    )}

                    {/* ── STAGE: SELFIE ── */}
                    {stage === 'selfie_capture' && (
                        <motion.div key="selfie" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="py-6">
                            <div className="text-center mb-10">
                                <div className="mx-auto text-london-blue mb-4 opacity-50 flex justify-center">
                                    <Camera size={36} aria-hidden="true" />
                                </div>
                                <h3 className="text-slate-100 font-serif text-xl mb-2 font-bold uppercase tracking-tight">Step 2: Liveness Handshake</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Clear, well-lit frontal portrait required</p>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-10">
                                <div className="bg-[#0a0b10]/60 backdrop-blur-md border border-white/10 rounded p-3 text-center shadow-inner">
                                    {passportUrl && <img src={passportUrl} alt="Uploaded government ID document" className="w-full h-32 object-cover rounded-sm border border-white/10 shadow-sm" />}
                                    <p className="text-[9px] text-[#B59410] mt-2 font-bold uppercase tracking-widest">Document Secured ✓</p>
                                </div>
                                <div className="bg-[#0a0b10]/60 backdrop-blur-md border border-white/10 rounded p-3 text-center shadow-inner">
                                    {selfieUrl ? (
                                        <>
                                            <img src={selfieUrl} alt="Your uploaded selfie for identity verification" className="w-full h-32 object-cover rounded-sm border border-white/10 shadow-sm" />
                                            <p className="text-[9px] text-[#B59410] mt-2 font-bold uppercase tracking-widest">Portrait Captured ✓</p>
                                        </>
                                    ) : (
                                        <div className="w-full h-32 flex flex-col items-center justify-center border border-white/10 border-dashed rounded-sm bg-slate-950" aria-label="Selfie not yet captured">
                                            <Camera className="text-slate-200" size={32} aria-hidden="true" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <input ref={selfieInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleSelfieUpload} aria-label="Take or upload a selfie" />

                            {!selfieUrl ? (
                                <button
                                    id="capture-selfie-btn"
                                    onClick={() => selfieInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-white/10 hover:border-london-blue hover:bg-slate-950 rounded-lg py-12 text-center transition-all group"
                                    aria-label="Click to capture or upload a selfie"
                                >
                                    <Camera className="mx-auto text-slate-300 group-hover:text-london-blue transition-colors mb-3" size={28} aria-hidden="true" />
                                    <p className="text-slate-400 group-hover:text-slate-600 font-bold uppercase tracking-tight text-[11px] transition-colors">Capture Selfie Artifact</p>
                                </button>
                            ) : (
                                <button
                                    id="initiate-biometric-btn"
                                    onClick={initiateComparison}
                                    className="w-full bg-london-blue hover:bg-slate-900 text-white font-bold py-5 text-[11px] uppercase tracking-[0.2em] transition-all rounded shadow-lg flex items-center justify-center gap-3"
                                    aria-label="Initiate biometric identity verification"
                                >
                                    <Fingerprint size={18} aria-hidden="true" />
                                    Initiate Biometric Gating
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* ── STAGE: SCANNING — FIX 4.3 (replaced sci-fi animation with institutional progress bar) ── */}
                    {stage === 'scanning' && (
                        <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-14 text-center" aria-live="polite" aria-busy="true">
                            <div className="w-20 h-20 mx-auto mb-10 flex items-center justify-center border border-white/10 rounded-full bg-slate-950">
                                <Fingerprint className="text-london-blue opacity-60" size={36} aria-hidden="true" />
                            </div>

                            <h3 className="text-slate-100 font-serif text-2xl mb-3 font-bold">Biometric Analysis</h3>
                            <p className="text-slate-500 text-[11px] font-medium font-mono mb-10">{scanText}</p>

                            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4 shadow-inner" role="progressbar" aria-valuenow={scanProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Verification progress">
                                <motion.div
                                    className="bg-london-blue h-full rounded-full"
                                    animate={{ width: `${scanProgress}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">{scanProgress}% Complete</p>

                            <div className="mt-10 flex items-center justify-center gap-2 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
                                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                                Please retain browser focus
                            </div>
                        </motion.div>
                    )}

                    {/* ── STAGE: VERIFIED — FIX 4.4 (binary result, no raw %) ── */}
                    {stage === 'verified' && result && (
                        <motion.div key="verified" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-14 text-center">
                            <div className="w-24 h-24 bg-[#B59410]/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-[#B59410]/20 shadow-sm">
                                <CheckCircle className="text-[#B59410]" size={48} aria-hidden="true" />
                            </div>
                            <h3 className="text-slate-100 font-serif text-3xl mb-4 font-bold">Identity Verified</h3>
                            {/* FIX 4.4: Binary result only — no raw confidence % shown to client */}
                            <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-8">
                                Your identity has been successfully verified. You may now proceed with your document upload.
                            </p>
                            <div className="mt-6 pt-6 border-t border-white/10 text-left max-w-sm mx-auto space-y-3">
                                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest flex justify-between">
                                    <span>Status:</span>
                                    <span className="text-[#B59410] font-bold">{result.status} — Verified</span>
                                </p>
                                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest flex justify-between">
                                    <span>Trace Ref:</span>
                                    <span className="text-slate-600 font-mono tracking-tight">{result.request_id?.slice(0, 20)}...</span>
                                </p>
                                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest flex justify-between">
                                    <span>Audit Hash:</span>
                                    <span className="text-[#B59410] font-mono tracking-tight">{result.transaction_hash?.substring(0, 20)}...</span>
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STAGE: FAILED — FIX 3.1 (added manual review escalation) ── */}
                    {stage === 'failed' && (
                        <motion.div key="failed" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-14 text-center" role="alert">
                            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-sm">
                                <AlertTriangle className="text-red-600" size={48} aria-hidden="true" />
                            </div>
                            <h3 className="text-slate-100 font-serif text-2xl mb-4 font-bold">Verification Failed</h3>
                            <div className="bg-red-50 border border-red-100 p-6 rounded-sm mb-8 max-w-sm mx-auto">
                                <p className="text-red-700 font-bold uppercase tracking-tight text-[11px] mb-2 flex items-center justify-center gap-2">
                                    <Shield size={12} aria-hidden="true" /> Discrepancy Alert
                                </p>
                                <p className="text-red-600 text-[11px] font-medium leading-relaxed italic">{error}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 max-w-sm mx-auto">
                                <button
                                    id="retry-verification-btn"
                                    onClick={() => { setStage('idle'); setPassportUrl(null); setSelfieUrl(null); setError(null); setConsentGiven(false); }}
                                    className="flex-1 bg-slate-950 border border-red-200 text-red-600 hover:bg-red-50 px-6 py-4 text-[11px] uppercase tracking-widest font-bold transition-all rounded shadow-sm active:scale-95"
                                    aria-label="Retry verification from the beginning"
                                >
                                    Re-initiate Handshake
                                </button>
                                {/* FIX 3.1: Manual Review Escalation Path */}
                                <button
                                    id="request-manual-review-btn"
                                    onClick={() => {
                                        setStage('manual_review_requested');
                                        onFailed('Manual review requested');
                                    }}
                                    className="flex-1 bg-slate-900 text-white hover:bg-london-blue px-6 py-4 text-[11px] uppercase tracking-widest font-bold transition-all rounded shadow-sm active:scale-95"
                                    aria-label="Request manual review by a solicitor"
                                >
                                    Request Manual Review
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STAGE: MANUAL REVIEW REQUESTED ── */}
                    {stage === 'manual_review_requested' && (
                        <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-14 text-center" role="status">
                            <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-100 shadow-sm">
                                <SquareCheck className="text-amber-600" size={48} aria-hidden="true" />
                            </div>
                            <h3 className="text-slate-100 font-serif text-2xl mb-4 font-bold">Manual Review Requested</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
                                Your solicitor has been notified and will verify your identity manually within 1 business day.
                                You do not need to take any further action at this time.
                            </p>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
