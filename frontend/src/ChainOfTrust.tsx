import { CheckCircle2, ShieldAlert, Trash2, Database, Search, FileText, AlertTriangle } from 'lucide-react';

interface ChainOfTrustProps {
    status: {
        intake: 'complete' | 'active' | 'pending' | 'error';
        biometric: 'complete' | 'active' | 'pending' | 'error';
        shred: 'complete' | 'active' | 'pending' | 'error';
        aml: 'complete' | 'active' | 'pending' | 'error';
        clio: 'complete' | 'active' | 'pending' | 'error';
    }
}

const ChainOfTrust = ({ status }: ChainOfTrustProps) => {
    const steps = [
        { id: 1, label: 'Intake Categorized', icon: <FileText size={18} />, state: status.intake },
        { id: 2, label: 'Biometric Match', icon: <Search size={18} />, state: status.biometric },
        { id: 3, label: 'ID Data Shredded', icon: <Trash2 size={18} />, state: status.shred },
        { id: 4, label: 'AML/PEP Screened', icon: <ShieldAlert size={18} />, state: status.aml },
        { id: 5, label: 'Clio Ready', icon: <Database size={18} />, state: status.clio },
    ];

    return (
        <div className="w-64 flex flex-col gap-8 p-6 border-r border-slate-200 bg-white min-h-screen shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.05)]">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 border-b border-slate-50 pb-2">
                Protocol Sequence
            </h3>

            <div className="flex flex-col gap-10 relative">
                {/* Connecting Line */}
                <div className="absolute left-[21px] top-2 bottom-2 w-[1px] bg-slate-100" />

                {steps.map((step) => (
                    <div key={step.id} className="flex items-center gap-5 relative z-10">
                        {/* Icon Node */}
                        <div className={`
              w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-700
              ${step.state === 'complete' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm' :
                                step.state === 'error' ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' :
                                    step.state === 'active' ? 'bg-london-blue border-london-blue text-white shadow-md animate-pulse' :
                                        'bg-white border-slate-100 text-slate-300'}
            `}>
                            {step.state === 'complete' ? <CheckCircle2 size={20} /> : step.state === 'error' ? <AlertTriangle size={20} /> : step.icon}
                        </div>

                        {/* Label */}
                        <div className="flex flex-col">
                            <span className={`text-[11px] font-bold tracking-tight transition-colors ${step.state === 'complete' ? 'text-slate-900 font-serif' : step.state === 'error' ? 'text-red-600' : 'text-slate-400'}`}>
                                {step.label}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${step.state === 'complete' ? 'text-emerald-600' : step.state === 'error' ? 'text-red-400' : step.state === 'active' ? 'text-london-blue' : 'text-slate-300'}`}>
                                {step.state === 'complete' ? 'Verified' : step.state === 'error' ? 'Incomplete' : step.state === 'active' ? 'Handshake' : 'Pending'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Security Footer */}
            <div className="mt-auto pt-8 border-t border-slate-100">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    AES-256 Protocol
                </div>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed italic">
                    All PII ephemeralized post-sync. <br />
                    Sovereign Guard Active.
                </p>
            </div>
        </div>
    )
};

export default ChainOfTrust;
