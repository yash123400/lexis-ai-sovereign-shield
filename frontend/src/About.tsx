import { motion } from 'framer-motion';
import Spline from '@splinetool/react-spline';
import { ShieldCheck, BarChart4, Building2, RefreshCw, XCircle } from 'lucide-react';

interface FadeInProps {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}

const FadeIn = ({ children, delay = 0, className = "" }: FadeInProps) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, delay, ease: "easeOut" }}
        className={className}
    >
        {children}
    </motion.div>
);

export default function About() {
    return (
        <div className="font-sans min-h-screen bg-white text-slate-800 selection:bg-london-blue selection:text-white pb-32">

            {/* --- HERO MISSION STATEMENT --- */}
            <section className="relative pt-40 pb-32 px-6 md:px-16 container mx-auto max-w-7xl flex flex-col md:flex-row items-center border-b border-slate-100 bg-white">

                {/* Left: Interactive Orb (Light variation) */}
                <div className="md:w-1/3 h-64 md:h-96 w-full flex items-center justify-center relative mb-12 md:mb-0 grayscale opacity-40">
                    <div className="absolute inset-0 pointer-events-none rounded-full blur-[120px] bg-london-blue/10" />
                    <Spline scene="https://prod.spline.design/4tuh3W7pu-zpL4Bp/scene.splinecode" />
                </div>

                {/* Right: The Hook texts */}
                <div className="md:w-2/3 md:pl-20 flex flex-col justify-center relative z-10">
                    <FadeIn>
                        <h1 className="text-4xl md:text-7xl font-serif font-bold leading-tight tracking-tight mb-10 text-slate-900">
                            Where Finance-Grade Efficiency Meets Legal Precision.
                        </h1>
                        <p className="text-xl md:text-3xl text-slate-500 font-medium leading-relaxed mb-8 border-l-4 border-london-blue pl-8">
                            "Engineered with the rigor of Investment Banking and the precision of Bayes Finance. Lexis-AI's <span className="text-london-blue">Orchestrator</span> brings institutional-grade compliance to the private practice."
                        </p>
                        <p className="text-lg text-slate-400 font-medium max-w-2xl mt-10 leading-relaxed uppercase tracking-widest text-[11px] font-bold">
                            Lexis-AI is not just legal technology; it's a strategic capital asset for the 2026 Sovereign Grid.
                        </p>
                    </FadeIn>
                </div>
            </section>

            {/* --- SOVEREIGN BIO --- */}
            <section className="py-32 px-6 md:px-16 container mx-auto max-w-5xl">
                <FadeIn className="text-center mb-20">
                    <div className="inline-flex items-center space-x-3 bg-slate-50 border border-slate-100 px-6 py-3 rounded-full mb-8 shadow-sm">
                        <Building2 size={18} className="text-london-blue" />
                        <span className="text-xs font-bold tracking-[0.2em] uppercase text-slate-500">The Architect Protocol</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-8 tracking-tight">The Sovereign Perspective.</h2>
                </FadeIn>

                <FadeIn delay={0.1} className="bg-white p-12 md:p-24 rounded-sm border border-slate-100 shadow-2xl relative overflow-hidden">
                    {/* Subtle grid pattern background */}
                    <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none grayscale"></div>

                    <div className="relative z-10 text-xl md:text-2xl text-slate-500 font-medium leading-relaxed space-y-10 font-serif italic text-center mx-auto max-w-3xl">
                        <p>
                            Transitioning from Barclays Corporate and Investment Banking to Legal Tech Architecture was not just a pivot—it was an escalation in oversight.
                        </p>
                        <p>
                            In high-stakes financial transactions, data fragmentation is a fatal liability. By leveraging the quantitative discipline forged at <span className="text-london-blue font-bold not-italic">Bayes Business School</span>, we engineered Lexis-AI to fundamentally eliminate friction in pre-instruction handovers.
                        </p>
                        <p className="text-slate-900 font-bold not-italic text-lg uppercase tracking-widest">
                            Institutional Rigor. Zero Trust. absolute Sovereignty.
                        </p>
                    </div>
                </FadeIn>
            </section>

            {/* --- THREE PILLARS --- */}
            <section className="py-32 px-6 md:px-16 bg-slate-50 border-y border-slate-100">
                <div className="container mx-auto max-w-7xl">
                    <FadeIn className="text-center mb-24">
                        <h2 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-8 tracking-tight">The Execution Pillars.</h2>
                        <p className="text-slate-400 text-lg md:text-xl max-w-3xl mx-auto font-medium leading-relaxed">
                            We apply Bank-Grade Institutional Rigor to the Legal Lifecycle.
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <FadeIn delay={0.1} className="bg-white border border-slate-100 p-12 rounded-sm shadow-xl hover:border-london-blue/30 transition-all group">
                            <div className="h-16 w-16 bg-slate-50 text-london-blue rounded-full flex items-center justify-center mb-10 border border-slate-100 transition-all group-hover:bg-london-blue group-hover:text-white">
                                <BarChart4 size={36} />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-slate-900 mb-6">Quantitative Jurimetrics</h3>
                            <p className="text-slate-500 font-medium leading-relaxed text-sm">
                                Applying financial modeling to legal lead evaluation. Our engine calculates the Expected Value ($EV) of every matter before it reaches a Partner desk.
                            </p>
                        </FadeIn>

                        <FadeIn delay={0.2} className="bg-white border border-slate-100 p-12 rounded-sm shadow-xl hover:border-london-blue/30 transition-all group">
                            <div className="h-16 w-16 bg-slate-50 text-london-blue rounded-full flex items-center justify-center mb-10 border border-slate-100 transition-all group-hover:bg-london-blue group-hover:text-white">
                                <ShieldCheck size={36} />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-slate-900 mb-6">Institutional Rigor</h3>
                            <p className="text-slate-500 font-medium leading-relaxed text-sm">
                                Bringing Barclays-level security and data sovereignty to boutique law firms. Bank-grade architecture ensures your firm's reputation is algorithmically fortified.
                            </p>
                        </FadeIn>

                        <FadeIn delay={0.3} className="bg-white border border-slate-100 p-12 rounded-sm shadow-xl hover:border-london-blue/30 transition-all group">
                            <div className="h-16 w-16 bg-slate-50 text-london-blue rounded-full flex items-center justify-center mb-10 border border-slate-100 transition-all group-hover:bg-london-blue group-hover:text-white">
                                <RefreshCw size={36} />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-slate-900 mb-6">Regulatory Forethought</h3>
                            <p className="text-slate-500 font-medium leading-relaxed text-sm">
                                Building for the 2026 SRA/FCA horizon. Our system natively handles AI High-Risk transparency checks and immutable logging out of the box.
                            </p>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* --- THE STANDARD --- */}
            <section className="py-32 px-6 md:px-16 container mx-auto max-w-5xl">
                <FadeIn className="mb-16 border-b border-slate-100 pb-12">
                    <h2 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 tracking-tight">The Standards.</h2>
                </FadeIn>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <FadeIn delay={0.1} className="flex flex-col items-start bg-slate-50 p-10 rounded-sm border-t-4 border-slate-900">
                        <XCircle size={28} className="text-slate-900 mb-6" />
                        <h3 className="text-lg font-bold mb-3 uppercase tracking-widest text-slate-900">Zero Ingest</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">We never use, harvest, or train models on your client's PII or case documents. Zero exceptions.</p>
                    </FadeIn>

                    <FadeIn delay={0.2} className="flex flex-col items-start bg-slate-50 p-10 rounded-sm border-t-4 border-slate-900">
                        <XCircle size={28} className="text-slate-900 mb-6" />
                        <h3 className="text-lg font-bold mb-3 uppercase tracking-widest text-slate-900">Pure Source</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">Compliance is source-verified and cryptographically hashes back to official government registries and APIs.</p>
                    </FadeIn>

                    <FadeIn delay={0.3} className="flex flex-col items-start bg-slate-50 p-10 rounded-sm border-t-4 border-slate-900">
                        <XCircle size={28} className="text-slate-900 mb-6" />
                        <h3 className="text-lg font-bold mb-3 uppercase tracking-widest text-slate-900">Bespoke Only</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">We do not provide generic retail bots. Every agent is a "Savile Row" custom build for your firm's standards.</p>
                    </FadeIn>
                </div>
            </section>

        </div>
    );
}
