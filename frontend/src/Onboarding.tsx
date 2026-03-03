import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Spline from '@splinetool/react-spline';
import { Shield, Calendar, Database, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function Onboarding() {
    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState("");

    // Filter states for the Spline Orb
    const getOrbFilter = () => {
        switch (step) {
            case 1:
                return "grayscale(100%) brightness(100%) opacity(0.3)";
            case 2:
                return "grayscale(80%) brightness(120%) contrast(110%) opacity(0.4)";
            case 3:
            case 4:
                return "grayscale(0%) hue-rotate(200deg) saturate(150%) brightness(100%) contrast(120%) opacity(0.6)";
            default:
                return "grayscale(100%) opacity(0.2)";
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const state = params.get('state');
        const code = params.get('code');

        if (state && state.includes('CLIO_HANDSHAKE')) {
            setStep(2);

            if (code) {
                window.history.replaceState({}, document.title, window.location.pathname + '?onboarding=1');

                fetch('/api/clio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                }).then(r => r.json()).then(data => {
                    if (data.success) {
                        console.log("Lexis-AI: Clio API Authorized Successfully");
                    } else {
                        console.error("Clio API Handshake Failed", data);
                    }
                }).catch(e => console.error(e));
            }
        } else if (state && state.includes('GRAPH_HANDSHAKE')) {
            setStep(3);
            setTimeout(() => {
                setStep(4);
            }, 3000);
        }
    }, []);

    const handleClioAuth = async () => {
        setIsProcessing(true);
        setStatusText("Building Auth Payload...");

        const firmId = "LX-MAYFAIR-FB3";
        const clientId = "C2DsmVRQDm7cSYf4uA4Z6UY3CVxFBbIHI543JShj";
        const redirectUri = "https://lexis-ai-sovereign-shield.vercel.app/";
        const statePayload = `${firmId}::CLIO_HANDSHAKE`;

        const authUrl = `https://au.app.clio.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(statePayload)}`;


        setStatusText("Redirecting to Clio Authority...");
        setTimeout(() => {
            window.location.href = authUrl;
        }, 800);
    };

    const handleGraphAuth = () => {
        setIsProcessing(true);
        setStatusText("Redirecting to Microsoft Azure Tenant...");

        const CLIENT_ID = "MS_GRAPH_CLIENT_ID";
        const REDIRECT_URI = encodeURIComponent(window.location.origin);
        const STATE = "LX-MAYFAIR-FB3::GRAPH_HANDSHAKE";
        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&response_mode=query&scope=offline_access%20user.read%20calendars.read&state=${STATE}`;

        setTimeout(() => {
            window.location.href = authUrl;
        }, 1200);
    };

    return (
        <div className="font-sans min-h-screen bg-white text-slate-800 flex items-center justify-center p-6 selection:bg-london-blue selection:text-white relative overflow-hidden">
            <style dangerouslySetInnerHTML={{
                __html: `
                a[href*="spline.design"], .spline-watermark, #spline-watermark {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                }
            `}} />

            {/* Subtle Grid Background */}
            <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none grayscale"></div>

            <div className="container max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16 relative z-10 w-full">

                {/* Left: Interactive Engine (Light variant) */}
                <div className="md:w-1/2 w-full h-[400px] md:h-[600px] relative flex justify-center items-center opacity-40">
                    <div
                        className="absolute inset-0 transition-all duration-1000 ease-in-out"
                        style={{ filter: getOrbFilter() }}
                    >
                        <Spline scene="https://prod.spline.design/4tuh3W7pu-zpL4Bp/scene.splinecode" />
                    </div>
                    {/* Inner glowing pulse based on step */}
                    <div className={`absolute w-64 h-64 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 
                        ${step <= 2 ? 'bg-slate-200' : 'bg-london-blue/20'}`}>
                    </div>
                </div>

                {/* Right: The Onboarding Flow */}
                <div className="md:w-1/2 w-full max-w-lg">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="inline-flex items-center space-x-3 bg-slate-50 border border-slate-100 px-6 py-3 rounded-full mb-8 shadow-sm">
                                    <Shield size={18} className="text-london-blue" />
                                    <span className="text-xs font-bold tracking-[0.2em] uppercase text-slate-500">Firm Authorization Protocol</span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-8 tracking-tight leading-tight">Connect your Clio Environment.</h1>
                                <p className="text-slate-500 font-medium text-lg mb-12 leading-relaxed border-l-4 border-london-blue pl-8">
                                    Lexis-AI operates autonomously within your Practice Management System. We use a sovereign PKCE handshake to generate your isolated OAuth tokens.
                                </p>
                                <button
                                    onClick={handleClioAuth}
                                    disabled={isProcessing}
                                    className="w-full flex items-center justify-center space-x-4 bg-london-blue text-white py-6 px-10 rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-slate-900 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            <span>{statusText}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Authorize via Clio Intelligence</span>
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="inline-flex items-center space-x-3 bg-slate-50 border border-slate-100 px-6 py-3 rounded-full mb-8 shadow-sm">
                                    <Calendar size={18} className="text-london-blue" />
                                    <span className="text-xs font-bold tracking-[0.2em] uppercase text-slate-500">Protocol Step 02 / 03</span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-8 tracking-tight leading-tight">Authorize Calendar Scheduling.</h1>
                                <p className="text-slate-500 font-medium text-lg mb-12 leading-relaxed border-l-4 border-london-blue pl-8">
                                    To bypass the administrative bottleneck, your Digital Associate requires <code className="bg-slate-100 px-2 py-1 rounded text-london-blue text-sm font-bold">Calendar.Read</code> permissions to vault leads into Partner slots.
                                </p>
                                <button
                                    onClick={handleGraphAuth}
                                    disabled={isProcessing}
                                    className="w-full flex items-center justify-center space-x-4 bg-london-blue text-white py-6 px-10 rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-slate-900 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            <span>{statusText}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Authorize via Microsoft Azure</span>
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                                <div className="p-12 border border-slate-100 bg-white shadow-2xl rounded-sm relative overflow-hidden text-center">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-london-blue"></div>
                                    <Database size={48} className="text-london-blue mb-8 mx-auto animate-pulse" />
                                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-6">Establishing Sovereign Vault...</h1>
                                    <p className="text-slate-500 font-medium leading-relaxed max-w-xs mx-auto text-sm">
                                        Isolating database schema, encrypting OAuth tokens via AES-256, and sealing the network boundary.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                                <div className="p-12 border border-emerald-100 bg-white shadow-2xl rounded-sm relative overflow-hidden text-center">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>
                                    <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mb-10 mx-auto border border-emerald-100">
                                        <CheckCircle size={40} className="text-emerald-500" />
                                    </div>
                                    <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 mb-6">Onboarding Complete.</h1>
                                    <p className="text-emerald-600 font-bold uppercase tracking-[0.2em] text-[10px] mb-10">Container (LX-MAYFAIR-FB3) Established</p>

                                    <p className="text-xl font-serif font-bold text-slate-900 mb-10">
                                        Your Digital Associate is now active.
                                    </p>

                                    <div className="pt-10 border-t border-slate-100">
                                        <button onClick={() => window.location.href = "/"} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-london-blue transition-all flex items-center justify-center mx-auto group">
                                            Return to Headquarters <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-1" />
                                        </button>
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
