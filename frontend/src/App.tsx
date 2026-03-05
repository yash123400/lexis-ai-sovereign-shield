import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import About from './About';
import Onboarding from './Onboarding';
import AdminDashboard from './AdminDashboard';
import AdminLogin from './AdminLogin';
import ClientIntake from './ClientIntake';
import { ShieldAlert, CheckCircle, Fingerprint, Lock, FileText, Database, Terminal } from 'lucide-react';



// Fade in component for scroll animations
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

export function Home() {
  return (
    <div className="font-sans min-h-screen bg-slate-50 text-slate-800 selection:bg-london-blue selection:text-white">

      {/* --- HERO SECTION --- */}
      <section className="relative h-screen w-full flex flex-col md:flex-row items-center justify-between overflow-hidden bg-slate-950 px-6 md:px-24">
        {/* Left Side: Content */}
        <div className="relative z-10 flex flex-col items-start justify-center h-full w-full md:w-1/2 pt-20 md:pt-0 pointer-events-none text-left">
          <div className="pointer-events-auto max-w-2xl flex flex-col items-start">
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold leading-tight tracking-tight mb-8 text-white"
            >
              The intelligent legal <span className="text-london-blue">concierge.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              className="text-lg md:text-xl text-slate-400 md:leading-relaxed mb-10 max-w-xl font-medium"
            >
              End-to-end compliance orchestration for modern law firms. Intelligent intake, identity verification, and real-time conflict monitoring — all in one platform.
            </motion.p>



            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
              className="flex flex-col sm:flex-row flex-wrap justify-start items-center gap-6 w-full"
            >
              <a href="https://calendly.com/lexis-ai-partner/15min" target="_blank" rel="noopener noreferrer" className="px-10 py-5 w-full sm:w-auto bg-london-blue text-white font-bold uppercase tracking-widest text-xs text-center rounded-lg hover:bg-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95">
                Request a Workflow Audit
              </a>
              <a href="https://lexis-ai-compliance-concierge.vercel.app/" target="_blank" rel="noopener noreferrer" className="px-10 py-5 w-full sm:w-auto text-center bg-white/5 border border-white/20 text-white font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-white/10 transition-all duration-300 shadow-md">
                Live Demo
              </a>
              <a href="/Security_and_Privacy.pdf" target="_blank" rel="noopener noreferrer" className="px-10 py-5 w-full sm:w-auto bg-white/5 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-widest text-xs text-center rounded-lg hover:bg-emerald-500/10 transition-all duration-300 flex items-center justify-center gap-3 shadow-md">
                <ShieldAlert size={18} />
                Security protocol
              </a>
            </motion.div>
          </div>
        </div>

        {/* Right Side: Abstract HUD Preview */}
        <div className="relative w-full md:w-1/2 h-1/2 md:h-full z-0 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-sm grid grid-cols-2 gap-3 opacity-40 hover:opacity-60 transition-opacity duration-700">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Confidence</p>
              <p className="text-2xl font-bold text-white font-mono">94.2<span className="text-sm text-slate-500">%</span></p>
              <div className="w-full bg-white/10 rounded-full h-1 mt-3"><div className="bg-emerald-400/50 h-full rounded-full w-[94%]"></div></div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Active Matters</p>
              <p className="text-2xl font-bold text-white font-mono">127</p>
              <p className="text-[10px] text-emerald-400/60 mt-2 font-medium">+12 this week</p>
            </div>
            <div className="col-span-2 bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-3 font-bold">Network Alpha</p>
              <div className="flex items-end gap-1 h-10">
                {[40, 55, 45, 65, 50, 70, 60, 80, 75, 85, 70, 90].map((h, i) => (
                  <div key={i} className="flex-1 bg-london-blue/40 rounded-t-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-2 font-bold">AML Check</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
                <p className="text-sm font-bold text-white">Cleared</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Intake Queue</p>
              <p className="text-2xl font-bold text-white font-mono">3</p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Pending review</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- THE DIFFERENTIATOR GRID --- */}
      <section id="how-it-works" className="py-32 px-6 md:px-16 container mx-auto max-w-7xl bg-slate-950 rounded-3xl my-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-london-blue/10 to-transparent pointer-events-none"></div>
        <FadeIn className="text-center mb-24 relative z-10 w-full">
          <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-8 tracking-tight">The Legal Differentiator.</h2>
          <p className="text-slate-400 text-lg md:text-xl max-w-3xl mx-auto font-medium leading-relaxed">
            Generic LLMs converse. Lexis-AI orchestrates outcomes with forensic precision and deterministic logic.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 relative z-10">
          <FadeIn delay={0.1} className="md:col-span-2 md:row-span-2 bg-white/5 backdrop-blur-lg border border-white/10 p-10 rounded-2xl flex flex-col justify-end text-left group hover:bg-white/10 transition-colors">
            <div className="h-20 w-20 bg-white/10 text-london-blue rounded-xl flex items-center justify-center mb-auto border border-white/10 shadow-inner group-hover:bg-london-blue group-hover:text-white transition-all">
              <Terminal size={32} />
            </div>
            <h3 className="text-3xl font-serif font-bold text-white mb-4 mt-8">Intelligent Intake</h3>
            <p className="text-slate-300 font-medium leading-relaxed">
              Our "What happened?" classifier tags matter types and swaps checklists dynamically based on intent. Handles end-to-end KYC and AML without human intervention, maintaining absolute sovereign control.
            </p>
          </FadeIn>

          <FadeIn delay={0.2} className="md:col-span-2 md:row-span-1 bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-2xl flex items-center justify-start text-left group hover:bg-white/10 transition-colors">
            <div className="h-16 w-16 bg-white/10 text-london-blue rounded-xl flex items-center justify-center mr-6 border border-white/10 shrink-0 group-hover:bg-london-blue group-hover:text-white transition-all">
              <Lock size={28} />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold text-white mb-2">Identity Tethering</h3>
              <p className="text-slate-300 font-medium leading-relaxed text-sm">
                SMS/OTP verification secures the digital session before the first scan to ensure 100% lead recovery. E.164 normalization guarantees reachability.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.3} className="md:col-span-1 md:row-span-1 bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-2xl flex flex-col text-left group hover:bg-white/10 transition-colors">
            <div className="h-14 w-14 bg-white/10 text-emerald-400 rounded-xl flex items-center justify-center mb-6 border border-white/10 group-hover:bg-emerald-500 group-hover:text-white transition-all">
              <ShieldAlert size={28} />
            </div>
            <h3 className="text-lg font-serif font-bold text-white mb-2">Sovereign Monitoring</h3>
            <p className="text-slate-300 font-medium leading-relaxed text-sm">
              Continuous cross-referencing against Clio to intercept conflicts in real-time.
            </p>
          </FadeIn>

          <FadeIn delay={0.4} className="md:col-span-1 md:row-span-1 bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-2xl flex flex-col text-left group hover:bg-white/10 transition-colors">
            <div className="h-14 w-14 bg-white/10 text-london-blue rounded-xl flex items-center justify-center mb-6 border border-white/10 group-hover:bg-london-blue group-hover:text-white transition-all">
              <Fingerprint size={28} />
            </div>
            <h3 className="text-lg font-serif font-bold text-white mb-2">Reasoning Vault</h3>
            <p className="text-slate-300 font-medium leading-relaxed text-sm">
              OCR-to-Text reasoning detects deep discrepancies automatically.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* --- THE SOLUTION --- */}
      <section className="py-32 px-6 md:px-16 bg-white border-y border-slate-100">
        <div className="container mx-auto max-w-7xl">
          <FadeIn className="mb-24 md:flex md:justify-between md:items-end">
            <div>
              <h2 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-6 tracking-tight">The Onboarding Captain</h2>
              <p className="text-slate-400 text-lg md:text-xl max-w-2xl font-medium leading-relaxed">
                A fully autonomous agent that handles end-to-end KYC and AML without human intervention, maintaining absolute sovereign control.
              </p>
            </div>
            <button className="hidden md:block px-8 py-4 bg-london-blue text-white font-bold uppercase tracking-widest text-xs rounded hover:bg-slate-900 transition-all shadow-lg active:scale-95">
              Protocol Documentation
            </button>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-10">
            <FadeIn delay={0.1} className="md:col-span-2 md:row-span-2 bg-slate-50 border border-slate-100 hover:border-london-blue/20 transition-all p-12 rounded-sm flex flex-col justify-end min-h-[500px] relative overflow-hidden group shadow-inner">
              <div className="absolute top-12 right-12 text-london-blue opacity-10 group-hover:opacity-30 transition-opacity">
                <Terminal size={100} />
              </div>
              <h3 className="text-4xl font-serif font-bold text-slate-900 mb-6 relative z-10 w-4/5 leading-tight">01. Intelligent Intake Classifier</h3>
              <p className="text-slate-500 text-lg relative z-10 max-w-md font-medium leading-relaxed mb-8">
                Our proprietary LLM analyzes matters in milliseconds, dynamically swapping checklists and SRA priority tags based on deterministic intent.
              </p>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden relative z-10">
                <div className="h-full bg-london-blue transition-all duration-1000 w-[78%]"></div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} className="md:col-span-2 bg-white border border-slate-100 hover:shadow-xl transition-all p-10 rounded-sm flex items-center shadow-lg">
              <div className="mr-10 text-london-blue bg-slate-50 p-6 rounded-full border border-slate-100">
                <Lock size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-serif font-bold text-slate-900 mb-3">02. OTP Identity Tethering</h3>
                <p className="text-slate-500 font-medium leading-relaxed">E.164 normalization and SMS verification ensures every lead is reachable before biometric gating.</p>
              </div>
            </FadeIn>

            <FadeIn delay={0.3} className="md:col-span-1 bg-white border border-slate-100 hover:shadow-xl transition-all p-8 rounded-sm flex flex-col justify-center shadow-lg">
              <ShieldAlert size={36} className="text-slate-300 mb-6" />
              <div>
                <h3 className="text-xl font-serif font-bold text-slate-900 mb-3 text-emerald-600">03. Conflict Check</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">Automated cross-referencing against Clio entities provides instant risk scoring.</p>
              </div>
            </FadeIn>

            <FadeIn delay={0.4} className="md:col-span-1 bg-london-blue border border-london-blue shadow-xl p-8 rounded-sm flex flex-col justify-center transition-all">
              <Fingerprint size={36} className="text-white mb-6" />
              <div>
                <h3 className="text-xl font-serif font-bold text-white mb-3">04. Reasoning Vault</h3>
                <p className="text-white/80 text-sm font-medium leading-relaxed text-blue-100">OCR reasoning detects deep discrepancies between registry records and user claims.</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* --- STEP 5: CLIO SYNTHESIS --- */}
      <section className="py-32 px-6 md:px-16 container mx-auto max-w-7xl">
        <div className="bg-white border border-slate-100 p-8 md:p-20 rounded-sm relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-3/5">
              <span className="text-london-blue font-bold tracking-[0.3em] uppercase text-[10px] mb-6 block">Matter Handover Protocol</span>
              <h2 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-8 leading-tight">Clio Synthesis.</h2>
              <p className="text-slate-500 text-lg font-medium leading-relaxed mb-10 border-l-4 border-london-blue pl-8">
                The lifecycle ends with total workspace integration. Lexis-AI creates the contact, opens the matter, uploads the Sovereign Audit Fingerprint, and drafts the initial engagement letter—automated handovers that save 4.5 hours per file.
              </p>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <CheckCircle size={18} className="text-emerald-500" /> Matter ID Generated
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <CheckCircle size={18} className="text-emerald-500" /> Audit Vault Locked
                </div>
              </div>
            </div>
            <div className="md:w-2/5 flex justify-center py-10">
              <Database size={240} className="text-london-blue opacity-5 hover:opacity-10 transition-opacity" strokeWidth={0.5} />
            </div>
          </div>
        </div>
      </section>

      {/* --- COMPLIANCE AUTHORITY --- */}
      <section className="py-32 px-6 md:px-16 bg-slate-50 text-center">
        <FadeIn>
          <div className="inline-flex items-center space-x-3 bg-white border border-emerald-100 px-6 py-3 rounded-full mb-12 shadow-sm">
            <ShieldAlert size={18} className="text-emerald-500" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-emerald-700">2026 Regulatory Landscape Ready</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-10 max-w-4xl mx-auto tracking-tight">Absolute Compliance Authority.</h2>
          <p className="text-slate-400 text-lg md:text-xl max-w-3xl mx-auto mb-20 font-medium leading-relaxed">
            Lexis-AI is built on zero-trust principles, ensuring sovereign control over all legal data and real-time SRA alignment.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          <FadeIn delay={0.1} className="flex flex-col items-center text-center p-12 bg-white rounded-sm border border-slate-100 shadow-xl group hover:border-london-blue/30 transition-all">
            <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-8 transform group-hover:scale-110 transition-transform">
              <FileText size={28} className="text-london-blue" />
            </div>
            <h3 className="text-xl font-serif font-bold text-slate-900 mb-4">Forensic Audit Trails</h3>
            <p className="text-slate-500 font-medium leading-relaxed text-sm">
              Immutable cryptographic hashing of all handshakes into our Safe Harbour vault for instant auditor review.
            </p>
          </FadeIn>

          <FadeIn delay={0.2} className="flex flex-col items-center text-center p-12 bg-white rounded-sm border border-slate-100 shadow-xl group hover:border-london-blue/30 transition-all">
            <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-8 transform group-hover:scale-110 transition-transform">
              <CheckCircle size={28} className="text-london-blue" />
            </div>
            <h3 className="text-xl font-serif font-bold text-slate-900 mb-4">Conflict Interception</h3>
            <p className="text-slate-500 font-medium leading-relaxed text-sm">
              Algorithmic verification against CRM entities prevents ethical conflicts before the first meeting.
            </p>
          </FadeIn>

          <FadeIn delay={0.3} className="flex flex-col items-center text-center p-12 bg-white rounded-sm border border-slate-100 shadow-xl group hover:border-london-blue/30 transition-all">
            <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-8 transform group-hover:scale-110 transition-transform">
              <Lock size={28} className="text-london-blue" />
            </div>
            <h3 className="text-xl font-serif font-bold text-slate-900 mb-4">UK Sovereignty</h3>
            <p className="text-slate-500 font-medium leading-relaxed text-sm">
              Built with High-Risk transparency. We explicitly flag automated systems while keeping PII sovereign within the UK.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-100 py-24 px-6 bg-white text-center">
        <div className="flex justify-center items-center space-x-4 mb-10">
          <div className="h-10 w-10 bg-london-blue rounded-sm shadow-xl"></div>
          <span className="text-slate-900 font-serif font-bold text-3xl tracking-wide">Lexis-AI</span>
        </div>
        <div className="flex flex-col md:flex-row justify-center items-center gap-10 mb-12 font-bold uppercase tracking-[0.2em] text-[11px] text-slate-400">
          <a href="/Security_and_Privacy.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-london-blue transition-colors">Governance protocol</a>
          <a href="mailto:contact@lexis-ai.co.uk" className="hover:text-london-blue transition-colors">Compliance support</a>
          <button className="hover:text-london-blue transition-colors">Forensic disclosure</button>
        </div>
        <p className="font-bold text-slate-300 text-[10px] uppercase tracking-[0.3em]">© 2026 Lexis-AI Compliance Boutique. Engineered for Truth.</p>
      </footer>
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isArchitect, setIsArchitect] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const onboarding = params.get('onboarding');
    const intakeToken = params.get('token');

    const state = params.get('state');

    if (intakeToken) {
      setCurrentPage('intake');
    } else if (onboarding === '1' || (state && state.includes('CLIO_HANDSHAKE'))) {
      setCurrentPage('onboarding');
    } else if (view === 'about') {
      setCurrentPage('about');
    } else if (view === 'admin') {
      if (!isArchitect) {
        window.history.replaceState(null, '', '?view=gateway-portal');
        setCurrentPage('gateway-portal');
      } else {
        setCurrentPage('admin');
      }
    } else if (view === 'gateway-portal') {
      if (isArchitect) {
        window.history.replaceState(null, '', '?view=admin');
        setCurrentPage('admin');
      } else {
        setCurrentPage('gateway-portal');
      }
    } else {
      setCurrentPage('home');
    }
  }, [isArchitect]);

  const navigate = (page: string) => {
    setCurrentPage(page);
    let newUrl = '?';
    if (page === 'onboarding') newUrl = '?onboarding=1';
    else if (page === 'about') newUrl = '?view=about';
    else if (page === 'admin') newUrl = '?view=admin';
    else if (page === 'gateway-portal') newUrl = '?view=gateway-portal';

    window.history.pushState({ page }, '', newUrl);
  };

  return (
    <div className="bg-white min-h-screen text-slate-800">
      {/* Absolute/Fixed Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 h-24">
        <div className="container mx-auto px-10 h-full flex items-center justify-between">
          <div
            className="flex items-center space-x-4 cursor-pointer group"
            onClick={() => navigate('home')}
          >
            <div className="h-6 w-6 bg-london-blue rounded-sm shadow-xl group-hover:scale-110 transition-all"></div>
            <span className="font-serif font-bold text-2xl tracking-tight text-slate-900">Lexis-AI</span>
          </div>

          <div className="flex items-center space-x-12 text-[11px] uppercase tracking-[0.2em] font-bold text-slate-400">
            <button
              onClick={() => navigate('home')}
              className={`${currentPage === 'home' ? 'text-london-blue border-b-2 border-london-blue' : 'hover:text-slate-900'} pb-1 transition-all`}
            >
              Technology
            </button>
            <button
              onClick={() => navigate('about')}
              className={`${currentPage === 'about' ? 'text-london-blue border-b-2 border-london-blue' : 'hover:text-slate-900'} pb-1 transition-all`}
            >
              The Firm View
            </button>
            <button
              onClick={() => navigate('onboarding')}
              className={`${currentPage === 'onboarding' ? 'text-london-blue border-b-2 border-london-blue' : 'hover:text-slate-900'} pb-1 transition-all`}
            >
              Onboard Firm
            </button>

            {/* GHOST NAVIGATION */}
            {(isArchitect || window.location.search.includes('architect=true')) && (
              <button
                onClick={() => navigate('admin')}
                className={`${currentPage === 'admin' ? 'bg-slate-900 text-white' : 'bg-london-blue text-white'} px-6 py-3 rounded-full flex items-center space-x-3 transition-all hover:shadow-xl active:scale-95`}
              >
                <Terminal size={14} />
                <span className="text-[10px]">Master Command</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Page Routing */}
      <main className="pt-24">
        {currentPage === 'home' && <Home />}
        {currentPage === 'about' && <About />}
        {currentPage === 'onboarding' && <Onboarding />}
        {currentPage === 'intake' && <ClientIntake />}
        {currentPage === 'gateway-portal' && <AdminLogin onLogin={() => { setIsArchitect(true); navigate('admin'); }} />}
        {currentPage === 'admin' && (isArchitect ? <AdminDashboard /> : null)}
      </main>
    </div>
  );
}
