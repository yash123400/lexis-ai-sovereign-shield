import { useState } from 'react';
import { Shield, Lock, Key } from 'lucide-react';

export default function AdminLogin({ onLogin }: { onLogin: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    const authorized_lawyers = ['admin@lexis.ai', 'partner@lexis.ai', 'yash@lexis.ai'];

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setError('');

        try {
            // Attempt API-driven authentication
            const res = await fetch('/api/auth-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase(), password }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.authorized) {
                    onLogin();
                } else {
                    setAccessDenied(true);
                }
            } else {
                // API returned error — fall back to local authorization check
                if (authorized_lawyers.includes(email.toLowerCase())) {
                    onLogin();
                } else {
                    setAccessDenied(true);
                }
            }
        } catch (_err) {
            // API unreachable — fall back to local authorization check
            if (authorized_lawyers.includes(email.toLowerCase())) {
                onLogin();
            } else {
                setAccessDenied(true);
            }
        }
    };

    if (accessDenied) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center justify-center p-6 text-center">
                <Shield size={64} className="text-london-blue mb-8 opacity-20" />
                <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 mb-6">Unauthorized Identity.</h1>
                <div className="max-w-md bg-white border border-slate-200 p-10 shadow-2xl rounded-sm">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Security Perimeter Log</p>
                    <p className="text-slate-500 font-medium leading-relaxed mb-10">
                        The identity `<span className="text-london-blue font-bold">{email}</span>` does not hold an authorized seat in the Lexis-AI Master Command.
                    </p>
                    <button
                        onClick={() => { setAccessDenied(false); setIsAuthenticating(false); setEmail(''); setPassword(''); }}
                        className="w-full bg-london-blue text-white font-bold uppercase tracking-widest text-[10px] py-4 rounded-sm hover:bg-slate-900 transition-all shadow-lg active:scale-95"
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
            <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none grayscale"></div>

            <div className="w-full max-w-md bg-white border border-slate-100 shadow-2xl relative overflow-hidden rounded-sm p-12">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-london-blue"></div>

                <div className="flex flex-col items-center">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-8 border border-slate-100 shadow-sm">
                        <Shield size={32} className="text-london-blue" />
                    </div>

                    <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2 tracking-tight">Sovereign Gate</h1>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.3em] mb-12">Firm Command & Orchestration</p>

                    <form onSubmit={handleLogin} className="w-full space-y-8">
                        <div>
                            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Admin Identity</label>
                            <div className="relative">
                                <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="partner@firm.com"
                                    className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 text-sm text-slate-900 focus:border-london-blue focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Vault Passkey</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 text-sm text-slate-900 focus:border-london-blue focus:bg-white outline-none transition-all tracking-widest placeholder:text-slate-300 font-medium"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold py-3 px-4 text-center uppercase tracking-widest rounded-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isAuthenticating}
                            className="w-full bg-london-blue text-white font-bold uppercase tracking-widest text-[11px] py-5 rounded-sm hover:bg-slate-900 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                        >
                            {isAuthenticating ? (
                                <span className="flex items-center justify-center space-x-3">
                                    <Loader2 className="animate-spin" size={14} />
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

// Add Loader2 to lucide-react icons in top import if needed or define a simple spinner
function Loader2({ className, size }: { className?: string, size?: number }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size || 14}
            height={size || 14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}
