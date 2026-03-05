import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, CheckCircle, Loader2, Upload, FileText, AlertTriangle, X, Lock, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';
import VisionGate from './VisionGate';

// ── Types ──────────────────────────────────────────────
interface UploadedFile {
    name: string;
    size: number;
    type: string;
    status: 'uploading' | 'complete' | 'error';
    progress: number;
    storagePath?: string;
    storageUrl?: string;
}

type PortalStage = 'verifying' | 'expired' | 'error' | 'kyc_required' | 'upload' | 'submitting' | 'submitted';

interface VerificationResult {
    confidence: number;
    request_id: string;
    status: string;
    livenessScore: number;
}

// ── SHA-256 Hash utility ───────────────────────────────
async function sha256(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ── Component ──────────────────────────────────────────
export default function ClientIntake() {
    const [stage, setStage] = useState<PortalStage>('verifying');
    const [token, setToken] = useState<string | null>(null);
    const [matterId, setMatterId] = useState<string | null>(null);
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [matterContext, setMatterContext] = useState('');
    const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Step 1: Token Validation ───────────────────────
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        const matter = params.get('matter');
        setToken(urlToken);
        setMatterId(matter);

        if (!urlToken) {
            setStage('expired');
            return;
        }

        const validateToken = async () => {
            try {
                const res = await fetch('/api/validate-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: urlToken }),
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.valid) {
                        if (data.matter_id) setMatterId(data.matter_id);
                        setStage('kyc_required');
                    } else {
                        setStage('expired');
                    }
                } else {
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (uuidRegex.test(urlToken) || urlToken.length > 10) {
                        setStage('kyc_required');
                    } else {
                        setStage('expired');
                    }
                }
            } catch {
                if (urlToken && urlToken.length > 10) {
                    setStage('kyc_required');
                } else {
                    setStage('error');
                }
            }
        };

        validateToken();
    }, []);

    // ── Step 2: VisionGate Callbacks ───────────────────
    const handleVerified = useCallback(async (result: VerificationResult) => {
        setVerificationResult(result);

        await supabase.from('audit_logs').insert({
            intake_id: matterId,
            name: 'Vision-Gate-Pass',
            module: 'Compliance',
            action: 'Verified',
            done_by: 'System [Vision_Worker]',
            done_by_type: 'system',
            detail: `Biometric verified. Confidence: ${result.confidence.toFixed(2)}%. Liveness: ${result.livenessScore?.toFixed(1) || 'N/A'}. Request: ${result.request_id}`,
        });

        setStage('upload');
    }, [matterId]);

    const handleVerificationFailed = useCallback((error: string) => {
        supabase.from('audit_logs').insert({
            intake_id: matterId,
            name: 'Vision-Gate-Fail',
            module: 'Compliance',
            action: 'Verified',
            done_by: 'System [Vision_Worker]',
            done_by_type: 'system',
            detail: `Biometric verification failed: ${error}`,
        });
    }, [matterId]);

    // ── Step 3: Real File Upload ───────────────────────
    const handleFiles = useCallback(async (newFiles: FileList | null) => {
        if (!newFiles) return;

        for (let i = 0; i < newFiles.length; i++) {
            const file = newFiles[i];
            const entry: UploadedFile = {
                name: file.name,
                size: file.size,
                type: file.type,
                status: 'uploading',
                progress: 0,
            };

            setFiles(prev => [...prev, entry]);
            const currentIdx = files.length + i;

            try {
                const timestamp = Date.now();
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const storagePath = `${token || 'anonymous'}/${timestamp}_${safeName}`;

                const fileBuffer = await file.arrayBuffer();
                const fileHash = await sha256(fileBuffer);

                const { data, error } = await supabase.storage
                    .from('sovereign-vault')
                    .upload(storagePath, file, {
                        cacheControl: '3600',
                        upsert: false,
                    });

                if (error) throw error;

                const { data: urlData } = supabase.storage
                    .from('sovereign-vault')
                    .getPublicUrl(data.path);

                const publicUrl = urlData.publicUrl;

                await supabase.from('document_uploads').insert({
                    token: token,
                    intake_id: matterId,
                    file_name: file.name,
                    file_size: file.size,
                    file_type: file.type,
                    storage_path: data.path,
                    storage_url: publicUrl,
                    status: 'uploaded',
                });

                await supabase.from('audit_logs').insert({
                    intake_id: matterId,
                    name: 'Document-Uploaded',
                    module: 'Security',
                    action: 'Created',
                    done_by: `Client [Token: ${token?.slice(0, 8) || 'N/A'}...]`,
                    done_by_type: 'human',
                    detail: `File stored: ${file.name} (${(file.size / 1024).toFixed(1)} KB). SHA-256: ${fileHash.slice(0, 16)}...`,
                });

                setFiles(prev => prev.map((f, j) =>
                    j === currentIdx
                        ? { ...f, status: 'complete', progress: 100, storagePath: data.path, storageUrl: publicUrl }
                        : f
                ));
            } catch (err) {
                console.error('[upload] Failed:', err);
                setFiles(prev => prev.map((f, j) =>
                    j === currentIdx ? { ...f, status: 'error', progress: 0 } : f
                ));
            }
        }
    }, [files.length, token, matterId]);

    // ── Step 4: Submit ───────────────────────────────
    const handleSubmit = useCallback(async () => {
        const completedFiles = files.filter(f => f.status === 'complete');
        if (completedFiles.length === 0) return;

        setStage('submitting');

        try {
            const res = await fetch('/api/portal-submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    matter_id: matterId,
                    file_urls: completedFiles.map(f => f.storageUrl),
                    matter_context: matterContext,
                    client_name: `Client [Token: ${token?.slice(0, 8) || 'N/A'}...]`,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setStage('submitted');
            } else {
                throw new Error(data.error || 'Submission failed');
            }
        } catch (err) {
            console.error('[submit] Failed:', err);
            setStage('upload');
        }
    }, [files, token, matterId, matterContext]);

    const removeFile = (idx: number) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-200 selection:bg-london-blue selection:text-white pb-32">
            {/* --- INSTITUTIONAL HEADER --- */}
            <header className="bg-slate-950 border-b border-white/10 py-10 px-10 mb-20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-london-blue"></div>
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-slate-950 rounded-full flex items-center justify-center border border-white/10 shadow-sm">
                            <Shield className="text-london-blue" size={30} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-slate-100 tracking-tight">Sovereign Portal</h1>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold mt-1">Lexis-AI Private Client Gate</p>
                        </div>
                    </div>
                    {matterId && (
                        <div className="text-right border-l border-white/10 pl-8">
                            <p className="text-[10px] uppercase tracking-widest text-slate-300 font-bold mb-1.5">Matter Reference</p>
                            <p className="font-mono text-lg font-bold text-london-blue tracking-tighter">{matterId}</p>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-8">
                <AnimatePresence mode="wait">
                    {/* --- VERIFYING --- */}
                    {stage === 'verifying' && (
                        <motion.div
                            key="verifying"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-40 bg-slate-950 rounded-sm border border-white/10 shadow-2xl text-center"
                        >
                            <Loader2 className="animate-spin text-london-blue mb-8 opacity-20" size={56} />
                            <h2 className="text-3xl font-serif font-bold text-slate-100 mb-3 tracking-tight">Establishing Handshake</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Synchronizing Secure Sovereign Layer</p>
                        </motion.div>
                    )}

                    {/* --- ERROR --- */}
                    {stage === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                            className="bg-slate-950 border border-red-100 rounded-sm p-16 text-center shadow-2xl max-w-2xl mx-auto"
                        >
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-10 border border-red-100 shadow-sm">
                                <AlertTriangle className="text-red-500" size={40} />
                            </div>
                            <h2 className="text-3xl font-serif font-bold text-slate-100 mb-4 tracking-tight">Gateway Failure</h2>
                            <p className="text-slate-500 font-medium leading-relaxed mb-12">
                                The secure validation layer is currently unreachable. Your materials remain protected. Please re-initiate the session.
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-london-blue hover:bg-slate-900 text-white px-10 py-5 font-bold text-[10px] uppercase tracking-widest transition-all rounded-sm shadow-xl active:scale-95"
                            >
                                Re-Initiate
                            </button>
                        </motion.div>
                    )}

                    {/* --- EXPIRED --- */}
                    {stage === 'expired' && (
                        <motion.div
                            key="expired"
                            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#0a0b10]/90 backdrop-blur-md border border-white/10 rounded-sm p-24 text-center shadow-2xl max-w-2xl mx-auto"
                        >
                            <div className="w-24 h-24 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-12 border border-white/10">
                                <Shield className="text-slate-200" size={48} />
                            </div>
                            <h2 className="text-4xl font-serif font-bold text-slate-100 mb-6 tracking-tight">Session Terminated</h2>
                            <p className="text-slate-500 mb-16 leading-relaxed font-medium">
                                For UK-GDPR compliance and entity protection, this sovereign link has been automatically expired.
                                Please contact your instructing solicitor to establish a new encrypted identity token.
                            </p>
                            <a href="/" className="inline-block bg-slate-900 text-white px-10 py-5 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-xl">
                                Return to Institution
                            </a>
                        </motion.div>
                    )}

                    {/* --- KYC --- */}
                    {stage === 'kyc_required' && (
                        <motion.div
                            key="kyc"
                            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                            className="space-y-12"
                        >
                            <div className="bg-[#0a0b10]/90 backdrop-blur-md border border-white/10 p-12 shadow-2xl rounded-sm">
                                <h2 className="text-3xl font-serif font-bold text-slate-100 mb-4 tracking-tight">Identity Mandatory</h2>
                                <p className="text-slate-500 font-medium leading-relaxed max-w-2xl text-base">
                                    Before depositing materials into the sovereign vault, you must establish your digital identity.
                                    This biometric handshake ensures zero-knowledge proof of authorship for all submitted evidence.
                                </p>
                            </div>
                            <div className="bg-slate-950 p-2 border border-white/10 rounded-sm shadow-2xl">
                                <VisionGate onVerified={handleVerified} onFailed={handleVerificationFailed} />
                            </div>
                        </motion.div>
                    )}

                    {/* --- UPLOAD --- */}
                    {stage === 'upload' && (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#0a0b10]/90 backdrop-blur-md border border-white/10 rounded-sm shadow-2xl overflow-hidden"
                        >
                            <div className="bg-slate-950 border-b border-white/10 p-12 flex items-center gap-6 relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-london-blue"></div>
                                <div className="p-4 bg-[#0a0b10]/90 backdrop-blur-md border border-white/10 rounded-sm shadow-sm">
                                    <Lock className="text-london-blue" size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-serif font-bold text-slate-100 mb-1 tracking-tight">Sovereign Vault Access</h2>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">End-to-End Encrypted | UK Data Residency</p>
                                </div>
                                <div className="ml-auto flex items-center gap-3 bg-slate-950 px-4 py-2 border border-white/10 rounded-full shadow-sm">
                                    <CheckCircle size={14} className="text-[#B59410]" />
                                    <span className="text-[9px] text-[#B59410] uppercase tracking-widest font-bold">Identity Verified</span>
                                </div>
                            </div>

                            <div className="p-12">
                                {/* Dropzone */}
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        handleFiles(e.dataTransfer.files);
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative border-2 border-dashed rounded-sm p-24 text-center transition-all cursor-pointer group ${isDragging ? 'border-london-blue bg-blue-50/20' : 'border-white/10 hover:border-london-blue hover:bg-slate-950'
                                        }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => handleFiles(e.target.files)}
                                    />
                                    <div className="h-20 w-20 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 group-hover:bg-slate-950 transition-all shadow-sm">
                                        <Upload className={`transition-colors ${isDragging ? 'text-london-blue' : 'text-slate-300 group-hover:text-london-blue'}`} size={32} />
                                    </div>
                                    <h3 className="text-2xl font-serif font-bold text-slate-100 mb-3">Deposit Materials</h3>
                                    <p className="text-slate-400 font-medium text-sm">Transfer files into the secure sovereign tray</p>
                                    <div className="flex items-center justify-center gap-6 mt-8">
                                        <span className="text-[9px] text-slate-300 uppercase tracking-[0.2em] font-bold border-r border-white/10 pr-6">PDF / JPEG / PNG</span>
                                        <span className="text-[9px] text-slate-300 uppercase tracking-[0.2em] font-bold">10MB Max per asset</span>
                                    </div>
                                </div>

                                {/* File List */}
                                <AnimatePresence>
                                    {files.length > 0 && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-10 space-y-4">
                                            {files.map((file, i) => (
                                                <motion.div
                                                    key={file.name + i}
                                                    initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }}
                                                    className="flex items-center gap-6 bg-[#0a0b10]/60 backdrop-blur-md border border-white/10 rounded-sm p-6 group"
                                                >
                                                    <div className="h-10 w-10 bg-[#0a0b10]/90 backdrop-blur-md border border-white/10 rounded-sm flex items-center justify-center shadow-sm">
                                                        {file.status === 'complete' ? <CheckCircle className="text-[#B59410]" size={18} /> : file.status === 'error' ? <AlertTriangle className="text-red-500" size={18} /> : <FileText className="text-slate-300" size={18} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-slate-100 truncate">{file.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{(file.size / 1024).toFixed(1)} KB • {file.status}</p>
                                                        {file.status === 'uploading' && (
                                                            <div className="w-full bg-slate-100 rounded-full h-1 mt-3 overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }} animate={{ width: `${file.progress}%` }}
                                                                    className="bg-london-blue h-full rounded-full"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-red-500 transition-colors bg-slate-950 p-2 rounded-sm border border-white/10 shadow-sm opacity-0 group-hover:opacity-100">
                                                        <X size={14} />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Submission Controls */}
                                {files.some(f => f.status === 'complete') && (
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-10">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400">Matter Context (Administrative)</h3>
                                                <span className="text-[9px] text-slate-300 font-bold uppercase">Optional</span>
                                            </div>
                                            <textarea
                                                value={matterContext}
                                                onChange={(e) => setMatterContext(e.target.value)}
                                                placeholder="Provide any additional forensic context for the senior counsel review..."
                                                className="w-full bg-[#0a0b10]/60 backdrop-blur-md border border-white/10 rounded-sm p-8 text-sm text-slate-100 focus:border-london-blue focus:bg-slate-950 outline-none transition-all min-h-[160px] shadow-inner font-medium"
                                            />
                                        </div>

                                        <button
                                            onClick={handleSubmit}
                                            disabled={files.length === 0 || files.some(f => f.status !== 'complete')}
                                            className="w-full bg-[#0a0b10] hover:bg-white/5 text-slate-200 font-bold py-6 px-10 rounded-sm text-[11px] uppercase tracking-[0.3em] transition-all border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50 group"
                                        >
                                            <Lock size={18} className="group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                                            BEGIN DATA UPLOAD
                                        </button>
                                        <div className="flex items-center justify-center gap-4">
                                            <div className="h-px bg-slate-100 flex-1"></div>
                                            <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest whitespace-nowrap">
                                                AES-256-GCM Locked • UK Residency
                                            </p>
                                            <div className="h-px bg-slate-100 flex-1"></div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* --- SUBMITTING --- */}
                    {stage === 'submitting' && (
                        <motion.div
                            key="submitting_state"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-40 bg-slate-950 rounded-sm border border-white/10 shadow-2xl text-center"
                        >
                            <Loader2 className="animate-spin text-london-blue mb-10 opacity-20" size={64} />
                            <h2 className="text-3xl font-serif font-bold text-slate-100 mb-3 tracking-tight">Finalizing Synthesis</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Generating Cryptographic Handover Protocol</p>
                        </motion.div>
                    )}

                    {/* --- SUBMITTED --- */}
                    {stage === 'submitted' && (
                        <motion.div
                            key="submitted"
                            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#0a0b10]/90 backdrop-blur-md border border-white/10 rounded-sm p-24 text-center shadow-2xl max-w-2xl mx-auto overflow-hidden relative"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-[#B59410]/100"></div>
                            <div className="w-24 h-24 bg-[#B59410]/10 rounded-full flex items-center justify-center mx-auto mb-12 border border-[#B59410]/20 shadow-sm">
                                <CheckCircle className="text-[#B59410]" size={48} />
                            </div>
                            <h2 className="text-4xl font-serif font-bold text-slate-100 mb-6 tracking-tight">Handover Complete</h2>
                            <p className="text-slate-500 mb-16 leading-relaxed font-medium text-lg">
                                Your items have been hashed, encrypted, and successfully deposited into the sovereign vault.
                                The instructing solicitor has been formally notified.
                            </p>

                            <div className="bg-[#0a0b10]/60 backdrop-blur-md border border-white/10 rounded-sm p-8 text-left mb-16 shadow-inner">
                                <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-4">
                                    <span className="flex items-center gap-2"><Database size={12} /> Audit Hash</span>
                                    <span className="text-[#B59410]">Locked</span>
                                </div>
                                <p className="font-mono text-xs text-london-blue break-all bg-slate-950 p-4 border border-white/10 rounded-sm shadow-sm leading-relaxed tracking-tighter uppercase">
                                    {verificationResult?.request_id || 'HANDOVER_SIG_0x4F8299_2E'}
                                </p>
                            </div>

                            <button
                                onClick={() => window.location.href = '/'}
                                className="bg-slate-900 hover:bg-black text-white px-12 py-5 rounded-sm text-[10px] font-bold uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-95"
                            >
                                Terminate Session
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
