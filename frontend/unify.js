const fs = require('fs');

const files = [
  '/Users/yashkhemka/.gemini/antigravity/legal_compliance_agent/frontend/src/ClientIntake.tsx',
  '/Users/yashkhemka/.gemini/antigravity/legal_compliance_agent/frontend/src/VisionGate.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Mute emeralds:
  content = content.replace(/text-emerald-500/g, 'text-emerald-700');
  content = content.replace(/text-emerald-400/g, 'text-emerald-700/80');
  content = content.replace(/bg-emerald-50/g, 'bg-[#0a0b10]/80');
  content = content.replace(/bg-emerald-500/g, 'bg-emerald-700');
  content = content.replace(/border-emerald-100/g, 'border-emerald-900/40');
  
  content = content.replace(/text-emerald-600/g, 'text-[#B59410]'); // Gold for accents

  // Update backgrounds to dark theme cards:
  content = content.replace(/bg-white border([^ ]*) border-slate-[0-9]+/g, 'bg-[#0a0b10]/90 backdrop-blur-md border$1 border-white/10 text-white');
  content = content.replace(/bg-slate-50 border([^ ]*) border-slate-[0-9]+/g, 'bg-[#0a0b10] backdrop-blur-md border$1 border-white/10 text-slate-300');
  content = content.replace(/bg-white rounded-sm border border-slate-100/g, 'bg-[#0a0b10]/60 backdrop-blur-lg rounded-sm border border-white/10');
  
  // Specific backgrounds not captured:
  content = content.replace(/bg-slate-50/g, 'bg-[#0a0b10]');
  content = content.replace(/bg-white/g, 'bg-slate-950');
  content = content.replace(/border-slate-100/g, 'border-white/10');
  content = content.replace(/border-slate-200/g, 'border-white/10');
  content = content.replace(/text-slate-900/g, 'text-slate-200');
  content = content.replace(/text-slate-800/g, 'text-slate-300');
  content = content.replace(/text-slate-700/g, 'text-slate-400');
  
  // Update the Buttons:
  const btnClass = 'bg-[#1E3A8A] border border-[#1E3A8A]/50 hover:bg-[#0a0b10] text-[#B59410] font-bold py-5 px-10 text-[11px] uppercase tracking-[0.3em] transition-all rounded shadow-[0_0_15px_rgba(181,148,16,0.3)] hover:shadow-[0_0_25px_rgba(181,148,16,0.5)] active:scale-95 flex items-center justify-center gap-3 w-full';
  
  content = content.replace(/Establish Secure Handover/g, 'BEGIN DATA UPLOAD');
  content = content.replace(/Begin Security Handshake/g, 'Enter Client Portal');

  // We should apply btnClass to both of these buttons via a reliable regex.
  // We'll replace the class string manually inside the react elements that contain these texts.
  
  fs.writeFileSync(file, content);
});
console.log('Done script');
