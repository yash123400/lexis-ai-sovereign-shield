import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Shield, AlertTriangle, CheckCircle, Loader2, Fingerprint, ScanLine, Eye } from 'lucide-react';

type GateStage = 'idle' | 'passport_capture' | 'selfie_capture' | 'scanning' | 'verified' | 'failed';

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
    const [result, setResult] = useState<{ confidence: number; status: string; request_id: string; transaction_hash?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const selfieInputRef = useRef<HTMLInputElement>(null);

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
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
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

        // Animate the scanning phases while the API works
        const phases = [
            { progress: 15, text: 'Initialising Megvii handshake...' },
            { progress: 30, text: 'Liveness Detection: Analysing micro-textures...' },
            { progress: 50, text: 'Spoof prevention: Cross-referencing pixel heat map...' },
            { progress: 70, text: '1:1 Facial geometry comparison in progress...' },
            { progress: 85, text: 'Confidence threshold evaluation...' },
            { progress: 95, text: 'Generating cryptographic audit signature...' },
        ];

        // Run phases in parallel with the API call
        const animatePhases = async () => {
            for (const phase of phases) {
                await new Promise(r => setTimeout(r, 350));
                setScanProgress(phase.progress);
                setScanText(phase.text);
            }
        };

        const callApi = async () => {
            // Convert and compress files to base64
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
                    confidence: data.face_match_score,
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
                const errMsg = data.error || `Biometric mismatch. Score: ${data.face_match_score?.toFixed(2) || 'N/A'}%`;
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
        <div className="w-full max-w-2xl mx-auto bg-white border border-slate-200 rounded shadow-xl overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Eye className="text-london-blue" size={24} />
                        <h2 className="text-xl font-serif font-bold text-slate-900 tracking-tight">Vision Gate Protocol</h2>
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-sm border shadow-sm ${stage === 'verified' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' :
                        stage === 'failed' ? 'text-red-700 border-red-200 bg-red-50' :
                            stage === 'scanning' ? 'text-london-blue border-london-blue/20 bg-slate-50 animate-pulse' :
                                'text-slate-400 border-slate-200 bg-white'
                        }`}>
                        {stage === 'idle' ? 'Awaiting Handshake' :
                            stage === 'passport_capture' ? 'ID Mandatory' :
                                stage === 'selfie_capture' ? 'Liveness Mandatory' :
                                    stage === 'scanning' ? 'Handshaking...' :
                                        stage === 'verified' ? 'Verified' : 'Alert'}
                    </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-3 tracking-[0.1em] font-bold font-mono uppercase">Reference: Megvii-Lexis Biometric Bridge (1:1)</p>
            </div>

            <div className="p-10">
                <AnimatePresence mode="wait">
                    {/* --- STAGE: IDLE --- */}
                    {stage === 'idle' && (
                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-10">
                            <Fingerprint className="mx-auto text-london-blue mb-8 opacity-20" size={72} />
                            <h3 className="text-slate-900 font-serif text-2xl mb-4 font-bold">Identity Gating Required</h3>
                            <p className="text-slate-500 text-sm mb-10 max-w-sm mx-auto leading-relaxed italic">
                                To proceed with your intake, we require a Government-issued ID and a live selfie for 1:1 biometric matching. All PII is ephemeralized post-verification.
                            </p>
                            <button
                                onClick={() => setStage('passport_capture')}
                                className="bg-london-blue hover:bg-slate-900 text-white font-bold py-4 px-10 text-[11px] uppercase tracking-widest transition-all rounded shadow-md active:scale-95"
                            >
                                Begin Security Handshake
                            </button>
                        </motion.div>
                    )}

                    {/* --- STAGE: PASSPORT --- */}
                    {stage === 'passport_capture' && (
                        <motion.div key="passport" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="py-6">
                            <div className="text-center mb-10">
                                <Shield className="mx-auto text-london-blue mb-4 opacity-50" size={36} />
                                <h3 className="text-slate-900 font-serif text-xl mb-2 font-bold uppercase tracking-tight">Step 1: Document Gating</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Passport • Driving Licence • National ID</p>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePassportUpload} />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full border-2 border-dashed border-slate-100 hover:border-london-blue hover:bg-slate-50 rounded-lg py-16 text-center transition-all group"
                            >
                                <Camera className="mx-auto text-slate-300 group-hover:text-london-blue transition-colors mb-4" size={40} />
                                <p className="text-slate-400 group-hover:text-slate-600 font-bold uppercase tracking-tight text-[11px] transition-colors">Capture or Select Artifact</p>
                            </button>
                        </motion.div>
                    )}

                    {/* --- STAGE: SELFIE --- */}
                    {stage === 'selfie_capture' && (
                        <motion.div key="selfie" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="py-6">
                            <div className="text-center mb-10">
                                <ScanLine className="mx-auto text-london-blue mb-4 opacity-50" size={36} />
                                <h3 className="text-slate-900 font-serif text-xl mb-2 font-bold uppercase tracking-tight">Step 2: Liveness Handshake</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Clear, well-lit frontal portrait required</p>
                            </div>

                            {/* Preview Row */}
                            <div className="grid grid-cols-2 gap-6 mb-10">
                                <div className="bg-slate-50 border border-slate-100 rounded p-3 text-center shadow-inner">
                                    {passportUrl && <img src={passportUrl} alt="ID" className="w-full h-32 object-cover rounded-sm border border-slate-200 shadow-sm" />}
                                    <p className="text-[9px] text-emerald-600 mt-2 font-bold uppercase tracking-widest">Document Secured ✓</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded p-3 text-center shadow-inner">
                                    {selfieUrl ? (
                                        <>
                                            <img src={selfieUrl} alt="Selfie" className="w-full h-32 object-cover rounded-sm border border-slate-200 shadow-sm" />
                                            <p className="text-[9px] text-emerald-600 mt-2 font-bold uppercase tracking-widest">Portrait Captured ✓</p>
                                        </>
                                    ) : (
                                        <div className="w-full h-32 flex flex-col items-center justify-center border border-slate-200 border-dashed rounded-sm bg-white">
                                            <Camera className="text-slate-200" size={32} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <input ref={selfieInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleSelfieUpload} />

                            {!selfieUrl ? (
                                <button
                                    onClick={() => selfieInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-slate-100 hover:border-london-blue hover:bg-slate-50 rounded-lg py-12 text-center transition-all group"
                                >
                                    <Camera className="mx-auto text-slate-300 group-hover:text-london-blue transition-colors mb-3" size={28} />
                                    <p className="text-slate-400 group-hover:text-slate-600 font-bold uppercase tracking-tight text-[11px] transition-colors">Capture Selfie Artifact</p>
                                </button>
                            ) : (
                                <button
                                    onClick={initiateComparison}
                                    className="w-full bg-london-blue hover:bg-slate-900 text-white font-bold py-5 text-[11px] uppercase tracking-[0.2em] transition-all rounded shadow-lg flex items-center justify-center gap-3"
                                >
                                    <Fingerprint size={18} />
                                    Initiate Biometric Gating
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* --- STAGE: SCANNING --- */}
                    {stage === 'scanning' && (
                        <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-14 text-center">

                            {/* Custom Scanning Animation */}
                            <div className="relative w-40 h-40 mx-auto mb-10">
                                {/* Rings */}
                                <div className="absolute inset-0 rounded-full border border-london-blue/10 animate-ping" style={{ animationDuration: '3s' }} />
                                <div className="absolute inset-4 rounded-full border border-london-blue/20 animate-spin" style={{ animationDuration: '4s' }} />
                                <div className="absolute inset-8 rounded-full border border-london-blue/30" />
                                {/* Center Icon */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Fingerprint className="text-london-blue opacity-50" size={48} />
                                </div>
                                {/* Scan Line */}
                                <motion.div
                                    className="absolute left-4 right-4 h-1 bg-london-blue/50 shadow-[0_0_15px_rgba(15,23,42,0.3)] rounded-full"
                                    animate={{ top: ['15%', '85%', '15%'] }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                                />
                            </div>

                            <h3 className="text-slate-900 font-serif text-2xl mb-3 font-bold">Biometric Analysis</h3>
                            <p className="text-london-blue text-[10px] font-bold font-mono uppercase tracking-[0.2em] mb-10 animate-pulse">{scanText}</p>

                            {/* Progress Bar */}
                            <div className="w-full bg-slate-100 rounded-full h-2 mb-4 shadow-inner">
                                <motion.div
                                    className="bg-london-blue h-full rounded-full"
                                    animate={{ width: `${scanProgress}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">{scanProgress}% Authentication Complete</p>

                            <button
                                disabled
                                className="mt-12 w-full bg-slate-50 text-slate-300 font-bold py-4 text-[11px] uppercase tracking-widest cursor-not-allowed border border-slate-100 flex items-center justify-center gap-3"
                            >
                                <Loader2 size={16} className="animate-spin" />
                                Handshaking Protocol — Retain Browser Focus
                            </button>
                        </motion.div>
                    )}

                    {/* --- STAGE: VERIFIED --- */}
                    {stage === 'verified' && result && (
                        <motion.div key="verified" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-14 text-center">
                            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-100 shadow-sm">
                                <CheckCircle className="text-emerald-600" size={48} />
                            </div>
                            <h3 className="text-slate-900 font-serif text-3xl mb-4 font-bold">Identity Authenticated</h3>
                            <div className="inline-block bg-white border border-slate-200 rounded p-8 mt-4 shadow-sm">
                                <p className="text-london-blue text-4xl font-bold font-serif">{result.confidence.toFixed(1)}%</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 border-t border-slate-100 pt-2">Megvii-Match Confidence Score</p>
                            </div>
                            <div className="mt-10 pt-10 border-t border-slate-100 text-left max-w-sm mx-auto space-y-3">
                                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest flex justify-between">
                                    <span>Trace Ref:</span>
                                    <span className="text-slate-600 font-mono tracking-tight">{result.request_id}</span>
                                </p>
                                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest flex justify-between">
                                    <span>Hash:</span>
                                    <span className="text-emerald-600 font-mono tracking-tight">{result.transaction_hash?.substring(0, 24)}...</span>
                                </p>
                                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest flex justify-between">
                                    <span>Signal:</span>
                                    <span className={`font-bold ${result.status === 'Green' ? 'text-emerald-600' : 'text-amber-500'}`}>{result.status} Status (Verified)</span>
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* --- STAGE: FAILED --- */}
                    {stage === 'failed' && (
                        <motion.div key="failed" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-14 text-center">
                            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-sm">
                                <AlertTriangle className="text-red-600" size={48} />
                            </div>
                            <h3 className="text-slate-900 font-serif text-2xl mb-4 font-bold">Verification Failed</h3>
                            <div className="bg-red-50 border border-red-100 p-6 rounded-sm mb-10 max-w-sm mx-auto">
                                <p className="text-red-700 font-bold uppercase tracking-tight text-[11px] mb-2 flex items-center justify-center gap-2">
                                    <Shield size={12} /> Discrepancy Alert
                                </p>
                                <p className="text-red-600 text-[11px] font-medium leading-relaxed italic">{error}</p>
                            </div>
                            <button
                                onClick={() => { setStage('idle'); setPassportUrl(null); setSelfieUrl(null); setError(null); }}
                                className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-10 py-4 text-[11px] uppercase tracking-widest font-bold transition-all rounded shadow-sm active:scale-95"
                            >
                                Re-initiate Handshake
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
