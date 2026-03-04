import { useState } from 'react';
import { Shield, Lock, Key, AlertCircle } from 'lucide-react';

export default function AdminLogin({ onLogin }: { onLogin: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setError('');

        try {
            const res = await fetch('/api/auth-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase(), password }),
            });

            // ── FIX 1.6: Removed client-side email whitelist fallback entirely ──
            // If the API is unreachable or returns an error, we block access.
            // There is NO fallback that grants access without server confirmation.
            if (!res.ok) {
                setError('Authentication service unavailable. Please contact your administrator.');
                setIsAuthenticating(false);
                return;
            }

            const data = await res.json();
            if (data.authorized) {
                onLogin();
            } else {
                setAccessDenied(true);
            }
        } catch (_err) {
            // ── FIX 1.6: Network error = block access with clear message ──────
            setError('Unable to reach authentication service. Please check your connection and try again.');
        } finally {
            setIsAuthenticating(false);
        }
    };

    if (accessDenied) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center justify-center p-6 text-center">
                <Shield size={64} className="text-london-blue mb-8 opacity-20" aria-hidden="true" />
                <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 mb-6">Unauthorized Identity.</h1>
                <div className="max-w-md bg-white border border-slate-200 p-10 shadow-2xl rounded-sm">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Security Perimeter Log</p>
                    <p className="text-slate-500 font-medium leading-relaxed mb-10">
                        The identity `<span className="text-london-blue font-bold">{email}</span>` does not hold an authorized seat in the Lexis-AI Master Command.
                    </p>
                    <button
                        onClick={() => { setAccessDenied(false); setIsAuthenticating(false); setEmail(''); setPassword(''); }}
                        className="w-full bg-london-blue text-white font-bold uppercase tracking-widest text-[10px] py-4 rounded-sm hover:bg-slate-900 transition-all shadow-lg active:scale-95"
                        aria-label="Return to login screen"
                    >
                        Return to Perimeter
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-london-blue selection:text-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none grayscale" aria-hidden="true"></div>

            <div className="w-full max-w-md bg-white border border-slate-100 shadow-2xl relative overflow-hidden rounded-sm p-12" role="main">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-london-blue" aria-hidden="true"></div>

                <div className="flex flex-col items-center">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-8 border border-slate-100 shadow-sm">
                        <Shield size={32} className="text-london-blue" aria-hidden="true" />
                    </div>

                    <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2 tracking-tight">Sovereign Gate</h1>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.3em] mb-12">Firm Command &amp; Orchestration</p>

                    <form onSubmit={handleLogin} className="w-full space-y-8" noValidate aria-label="Admin login form">
                        <div>
                            <label htmlFor="admin-email" className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Admin Identity</label>
                            <div className="relative">
                                <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" aria-hidden="true" />
                                <input
                                    id="admin-email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="partner@firm.com"
                                    className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 text-sm text-slate-900 focus:border-london-blue focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                                    aria-required="true"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="admin-password" className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Vault Passkey</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" aria-hidden="true" />
                                <input
                                    id="admin-password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 text-sm text-slate-900 focus:border-london-blue focus:bg-white outline-none transition-all tracking-widest placeholder:text-slate-300 font-medium"
                                    aria-required="true"
                                />
                            </div>
                        </div>

                        {error && (
                            <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-100 text-red-700 text-[11px] font-medium py-3 px-4 rounded-sm flex items-center gap-2">
                                <AlertCircle size={14} aria-hidden="true" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            id="admin-login-submit"
                            disabled={isAuthenticating}
                            className="w-full bg-london-blue text-white font-bold uppercase tracking-widest text-[11px] py-5 rounded-sm hover:bg-slate-900 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                            aria-busy={isAuthenticating}
                        >
                            {isAuthenticating ? (
                                <span className="flex items-center justify-center space-x-3">
                                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                    <span>Verifying Handshake</span>
                                </span>
                            ) : (
                                "Initiate Command Session"
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                            Authorized Access Only
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
