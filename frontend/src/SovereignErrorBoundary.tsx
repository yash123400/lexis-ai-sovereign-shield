import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallbackMessage?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export default class SovereignErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        // In production, POST this to your audit log or Sentry
        console.error('[Sovereign Shield] Unhandled Error Captured:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center justify-center p-10 text-center relative overflow-hidden">
                    {/* Background Texture */}
                    <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none grayscale"></div>

                    <div className="max-w-2xl w-full bg-white border border-slate-100 p-16 rounded-sm shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>

                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-10 border border-red-100 shadow-sm">
                            <ShieldAlert size={40} className="text-red-500" />
                        </div>

                        <h1 className="text-3xl font-serif font-bold text-slate-900 mb-4 tracking-tight">Access Interrupted</h1>
                        <p className="text-slate-500 font-medium leading-relaxed mb-10 max-w-md mx-auto text-sm">
                            {this.props.fallbackMessage || 'The Sovereign Shield has intercepted an unexpected fault. No data has been exposed, and your secure connection remains within the perimeter.'}
                        </p>

                        <div className="bg-slate-50 border border-slate-100 rounded-sm p-8 mb-12 text-left shadow-inner">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-4 border-b border-slate-200 pb-2">Diagnostic Isolation Log</p>
                            <p className="text-slate-900 text-xs font-mono break-all font-medium leading-relaxed">
                                {this.state.error?.message || 'Undefined exception in sovereign pipeline.'}
                            </p>
                            {this.state.error?.name && (
                                <p className="text-slate-400 text-[10px] font-bold font-sans mt-3 uppercase tracking-tighter">
                                    Class: {this.state.error.name}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-6 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="bg-london-blue hover:bg-slate-900 text-white font-bold py-5 px-10 text-[10px] uppercase tracking-widest transition-all rounded-sm shadow-xl flex items-center justify-center gap-3"
                            >
                                <RefreshCw size={14} />
                                Re-Establish Link
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 py-5 px-10 text-[10px] uppercase tracking-widest transition-all rounded-sm font-bold flex items-center justify-center gap-3"
                            >
                                <Home size={14} />
                                Return to Safety
                            </button>
                        </div>

                        <div className="mt-16 pt-8 border-t border-slate-50">
                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em]">
                                Lexis-AI Sovereign Security • 2026 Audit Locked
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
