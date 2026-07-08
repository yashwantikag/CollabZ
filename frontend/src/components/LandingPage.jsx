import { useState } from 'react'

export default function LandingPage({ onNavigate }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // QR Code SVG path for mock scanner
  const qrCodePath = "M1 1h7v7H1V1zm1 1h5v5H1V2zm1 1h3v3H1V3zm8-2h1v1h-1V1zm2 0h1v1h-1V1zm1 0h2v1h-2V1zm3 0h1v1h-1V1zm1 0h1v2h-1V1zm2 0h7v7h-7V1zm1 1h5v5h-5V2zm1 1h3v3h-3V3zm-11 5h1v1h-1V8zm2 0h1v2h-1V8zm1 1h2v1h-2V9zm-5 2h1v1H8v-1zm1 0h2v1h-2v-1zm3 0h1v2h-1v-2zm2 0h2v1h-2v-1zm3 0h1v1h-1v-1zm2 0h1v1h-1v-1zm2 0h1v2h-1v-2zm-15 2h2v1h-2v-1zm3 0h1v1h-1v-1zm2 0h1v1h-1v-1zm2 1h1v1h-1v-1zm1 0h2v1h-2v-1zm3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1-2h2v1h-2v-1zm3 2h1v1h-1v-1zm-21 3h7v7H1v-7zm1 1h5v5H1v-5zm1 1h3v3H1v-3zm9-2h1v1h-1v-1zm2 0h1v2h-1v-2zm2 1h1v1h-1v-1zm1 1h1v1h-1v-1zm2-2h1v1h-1v-1zm1 1h2v1h-2v-1zm3 1h1v1h-1v-1zm2 0h1v1h-1v-1zm-12 3h1v1h-1v-1zm2 0h2v1h-2v-1zm3 0h1v1h-1v-1zm3 0h1v1h-1v-1zm2 0h2v1h-2v-1zm3 0h1v1h-1v-1zm-11 2h1v1h-1v-1zm3 0h1v1h-1v-1zm2 0h2v1h-2v-1zm3 0h1v1h-1v-1zm3 0h2v1h-2v-1z";

  return (
    <div className="min-h-screen bg-brandBg text-brandText font-sans selection:bg-brandPrimary/30 selection:text-brandPrimary">
      
      {/* --- Sticky Navbar --- */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-brandBg/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo with Professional SVG Icon */}
          <div className="flex items-center gap-2.5 select-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" fill="none" className="flex-shrink-0">
              <defs>
                <linearGradient id="collabzLogoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <path d="M12 20a8 8 0 1016 0 8 8 0 10-16 0" stroke="url(#collabzLogoGrad)" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M20 12a8 8 0 100 16 8 8 0 100-16" stroke="url(#collabzLogoGrad)" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
              <circle cx="20" cy="20" r="3.5" fill="#10b981" />
            </svg>
            <span className="text-xl tracking-tight font-sans select-none">
              <span className="text-white font-extrabold">Collab</span>
              <span className="text-brandPrimary font-black">Z</span>
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-350">
            <a href="#overview" className="hover:text-brandPrimary transition-colors">Overview</a>
            <a href="#features" className="hover:text-brandPrimary transition-colors">Features</a>
            <a href="#download" className="hover:text-brandPrimary transition-colors">Resources</a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => onNavigate('auth')}
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => onNavigate('auth')}
              className="bg-brandPrimary hover:bg-brandPrimary/95 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 transition-all duration-300 text-brandBg font-bold text-sm px-4 py-2 rounded-xl shadow-lg"
            >
              Try for free
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-slate-200 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-brandBg px-4 py-4 space-y-3 shadow-xl">
            <a href="#overview" onClick={() => setIsMobileMenuOpen(false)} className="block text-slate-300 hover:text-white py-1">Overview</a>
            <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="block text-slate-300 hover:text-white py-1">Features</a>
            <a href="#download" onClick={() => setIsMobileMenuOpen(false)} className="block text-slate-300 hover:text-white py-1">Resources</a>
            <div className="h-px bg-slate-800 my-2"></div>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => { setIsMobileMenuOpen(false); onNavigate('auth'); }}
                className="w-full text-center text-sm font-semibold text-slate-300 hover:text-white py-2 border border-slate-800 rounded-xl"
              >
                Sign in
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); onNavigate('auth'); }}
                className="w-full text-center bg-brandPrimary hover:bg-brandPrimary/90 text-brandBg font-bold text-sm py-2 rounded-xl"
              >
                Try for free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* --- Hero Section --- */}
      <section id="overview" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        
        {/* Glow Effects */}
        <div className="absolute top-24 left-1/4 w-96 h-96 bg-brandPrimary/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-24 right-1/4 w-96 h-96 bg-brandSuccess/10 rounded-full blur-3xl -z-10"></div>

        {/* Hero Left Content */}
        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/20 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-brandPrimary inline-block animate-pulse"></span>
            All-in-One Enterprise Platform
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            <span className="text-white font-extrabold">Collab</span>
            <span className="text-brandPrimary font-black">Z</span>
            <br />
            <span className="bg-gradient-to-r from-brandPrimary via-emerald-400 to-slate-200 bg-clip-text text-transparent">Real-Time Workspace</span>
          </h2>
          
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Connect your organization in a single, high-fidelity platform. Co-design on a synchronous vector whiteboard, host crisp video conferences, and centralize team chats instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
            <button
              onClick={() => onNavigate('auth')}
              className="w-full sm:w-auto bg-brandPrimary hover:bg-brandPrimary/95 active:scale-95 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-300 text-brandBg font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2"
            >
              Start for Free
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
            <button
              onClick={() => onNavigate('auth')}
              className="w-full sm:w-auto bg-brandCard border border-brandPrimary text-brandPrimary hover:bg-brandPrimary/10 active:scale-95 transition-all text-sm font-bold px-8 py-4 rounded-xl"
            >
              Sign up as Organization
            </button>
          </div>

          {/* Social Proof Badges */}
          <div className="pt-8 border-t border-slate-800 flex flex-wrap justify-center lg:justify-start items-center gap-6 text-[11px] font-bold uppercase tracking-wider text-slate-450 select-none">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brandPrimary animate-pulse"></span>SOC2 Certified</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brandPrimary animate-pulse"></span>HIPAA Compliant</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brandPrimary animate-pulse"></span>99.99% Uptime SLA</span>
          </div>
        </div>

        {/* Hero Right: SaaS Dashboard Mockup Preview */}
        <div className="flex-1 w-full max-w-xl lg:max-w-none relative aspect-[4/3] rounded-2xl bg-brandCard border border-slate-800 border-t border-t-brandPrimary/40 shadow-2xl flex flex-col justify-between overflow-hidden backdrop-blur-md">
          
          {/* Mockup Header Toolbar */}
          <div className="h-10 border-b border-slate-800 bg-brandBg/75 flex items-center justify-between px-4 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
            </div>
            <div className="bg-brandBg text-slate-500 text-[9px] px-6 py-1 rounded-md font-mono">
              workspace.collabz.com/project-delta
            </div>
            <div className="w-5 h-5 rounded bg-brandPrimary/20 text-brandPrimary font-bold text-[9px] flex items-center justify-center">
              Y
            </div>
          </div>

          {/* Mockup Main Workspace Area */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left Zone: Whiteboard Canvas with Grid */}
            <div className="flex-1 bg-brandCard/30 relative p-4 flex flex-col justify-center items-center">
              {/* Subtle Grid Pattern Overlay */}
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-[0.06] pointer-events-none">
                {[...Array(36)].map((_, i) => (
                  <div key={i} className="border-r border-b border-slate-200"></div>
                ))}
              </div>

              {/* Dynamic Vector Shape Flowchart Mock */}
              <svg viewBox="0 0 260 160" className="w-full h-full opacity-90 z-10">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#475569" />
                  </marker>
                </defs>

                {/* Nodes */}
                <rect x="15" y="25" width="65" height="26" rx="5" fill="#10b981" fillOpacity="0.1" stroke="#10b981" strokeWidth="1.2" />
                <text x="25" y="41" fill="#34d399" fontSize="8" fontWeight="bold">API Router</text>

                <rect x="110" y="25" width="65" height="26" rx="5" fill="#22c55e" fillOpacity="0.1" stroke="#22c55e" strokeWidth="1.2" />
                <text x="123" y="41" fill="#4ade80" fontSize="8" fontWeight="bold">Auth Pod</text>

                <rect x="62" y="90" width="85" height="28" rx="5" fill="#10b981" fillOpacity="0.1" stroke="#10b981" strokeWidth="1.2" />
                <text x="74" y="107" fill="#34d399" fontSize="8" fontWeight="bold">Canvas Server</text>

                {/* Connection paths */}
                <path d="M 80 38 L 104 38" stroke="#475569" strokeWidth="1.2" markerEnd="url(#arrow)" />
                <path d="M 47 51 L 68 85" stroke="#475569" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
                <path d="M 142 51 L 121 85" stroke="#475569" strokeWidth="1.2" />
              </svg>

              {/* Glowing cursor mock */}
              <div className="absolute top-1/4 left-1/3 flex items-center gap-1 bg-brandPrimary/90 text-brandBg text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg animate-bounce select-none">
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
                  <path d="M7 2l12 11.2-5.8.8 3.5 6.3-1.8 1-3.5-6.3-4.4 3.3V2z" />
                </svg>
                Yash (You)
              </div>
            </div>

            {/* Right Zone: Sidebar Previewing Collaborative Peer Avatars & Feeds */}
            <div className="w-36 border-l border-slate-800 bg-brandCard/40 p-2.5 flex flex-col gap-2.5 select-none">
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Collaborators</span>
              
              {/* Card 1: Sarah Jenkins */}
              <div className="p-1.5 rounded bg-brandCard border border-slate-800 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-brandSuccess/10 border border-brandSuccess/25 flex items-center justify-center font-extrabold text-[9px] text-brandSuccess">
                    SJ
                  </div>
                  <span className="text-[9px] font-bold text-slate-350">Sarah J.</span>
                </div>
                {/* Active Micro indicators */}
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brandSuccess"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-brandPrimary"></span>
                </div>
              </div>

              {/* Card 2: Alex Rivera */}
              <div className="p-1.5 rounded bg-brandCard border border-slate-800 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-brandPrimary/10 border border-brandPrimary/25 flex items-center justify-center font-extrabold text-[9px] text-brandPrimary">
                    AR
                  </div>
                  <span className="text-[9px] font-bold text-slate-350">Alex R.</span>
                </div>
                {/* Muted indicator */}
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
              </div>

              {/* Card 3: Live Video Box Mock */}
              <div className="mt-auto aspect-video rounded bg-brandCard border border-slate-800 overflow-hidden relative flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-brandCard via-brandPrimary/10 to-brandCard flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-brandPrimary/20 animate-ping absolute"></div>
                  <div className="w-4 h-4 rounded bg-brandPrimary/10 border border-brandPrimary/25 flex items-center justify-center font-bold text-[8px] text-brandPrimary">
                    Y
                  </div>
                </div>
                <span className="absolute bottom-1 left-1 text-[7px] text-slate-500 bg-brandBg/80 px-1 rounded border border-slate-800">
                  You
                </span>
              </div>

            </div>

          </div>

          {/* Canvas Ambient Info Banner */}
          <div className="h-6 px-4 bg-brandBg border-t border-slate-800 flex items-center justify-between text-[8px] font-mono text-slate-500 select-none">
            <span>GRID MODE: ENABLED</span>
            <span>SYNC LATENCY: 4MS</span>
          </div>

        </div>

      </section>

      {/* --- Key Features Section --- */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h3 className="text-3xl font-extrabold text-white">Why Teams Choose CollabZ</h3>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            CollabZ integrates every collaborative utility your workspace demands, delivering an elegant and cohesive experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
          {/* Feature 1 */}
          <div className="bg-brandCard border border-slate-800 rounded-2xl p-6 hover:border-brandPrimary/25 transition-all">
            <div className="w-10 h-10 rounded-xl bg-brandPrimary/10 border border-brandPrimary/20 flex items-center justify-center mb-5 text-brandPrimary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-white mb-2">Vector Whiteboard Sync</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Design complex technical architecture together with sub-millisecond drawing latency and state-preserving grids.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-brandCard border border-slate-800 rounded-2xl p-6 hover:border-brandPrimary/25 transition-all">
            <div className="w-10 h-10 rounded-xl bg-brandSuccess/10 border border-brandSuccess/20 flex items-center justify-center mb-5 text-brandSuccess">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.51 18h10.98A2.25 2.25 0 0 0 17.75 15.75V8.25A2.25 2.25 0 0 0 15.49 6H4.51A2.25 2.25 0 0 0 2.25 8.25v7.5A2.25 2.25 0 0 0 4.51 18Z" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-white mb-2">HD Voice & Video Call</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Experience stutter-free audio/video conversations with active speaker detection, mute controls, and fluid screen-sharing.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-brandCard border border-slate-800 rounded-2xl p-6 hover:border-brandPrimary/25 transition-all">
            <div className="w-10 h-10 rounded-xl bg-brandSuccess/10 border border-brandSuccess/20 flex items-center justify-center mb-5 text-brandSuccess">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379L12 21l2.62-3.132c1.154-.086 2.296-.213 3.423-.379 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-white mb-2">Centralized Workspace Chat</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Consolidate feedback in chat threads directly next to your active video grids and work canvases.
            </p>
          </div>
        </div>
      </section>

      {/* --- Mobile App Download Section --- */}
      <section id="download" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800">
        <div className="relative rounded-3xl bg-brandCard/40 border border-slate-800 p-8 sm:p-12 overflow-hidden flex flex-col md:flex-row items-center gap-10 md:gap-12">
          
          {/* Card Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-brandPrimary/5 rounded-full blur-3xl -z-10"></div>

          {/* Download Text Left */}
          <div className="flex-1 text-center md:text-left space-y-5">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Take CollabZ with you on the go
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-lg leading-relaxed">
              Download the CollabZ Mobile App for iOS and Android to draw, chat, and call with your organization from anywhere. Scan the QR code or tap the buttons below.
            </p>
            
            {/* App Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-3 select-none">
              
              {/* Apple App Store */}
              <a
                href="#app-store"
                onClick={(e) => { e.preventDefault(); onNavigate('auth'); }}
                className="bg-black hover:bg-brandCard text-white border border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-3 transition-colors max-w-[170px]"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.12.67-2.84 1.5-.61.7-1.15 1.84-1.01 2.96 1.08.08 2.2-.57 2.86-1.4z" />
                </svg>
                <div className="text-left">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold leading-none">Download on the</p>
                  <p className="text-xs font-bold leading-none mt-1">App Store</p>
                </div>
              </a>

              {/* Google Play Store */}
              <a
                href="#play-store"
                onClick={(e) => { e.preventDefault(); onNavigate('auth'); }}
                className="bg-black hover:bg-brandCard text-white border border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-3 transition-colors max-w-[170px]"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M3 5.277c0-.203.018-.39.052-.562l10.871 10.871-1.636 1.636L3 5.277zm11.758 9.943l1.83 1.83c.394-.482.412-1.164.052-1.636l-1.882-.194zm6.757-9.45l-4.103 4.103 4.413 4.413c.69-.69.957-1.74.557-2.617l-.867-1.9zm-4.707 4.707l-3.32-3.32-8.397 8.397c.502.046.993-.112 1.354-.473l10.363-4.604z" />
                </svg>
                <div className="text-left">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold leading-none">Get it on</p>
                  <p className="text-xs font-bold leading-none mt-1">Google Play</p>
                </div>
              </a>

            </div>

          </div>

          {/* Download QR Code Right */}
          <div className="flex flex-col items-center gap-3 bg-white p-5 rounded-2xl shadow-2xl border border-slate-100 select-none">
            {/* Custom High-Fidelity SVG QR Code */}
            <div className="w-36 h-36 bg-white flex items-center justify-center">
              <svg width="100%" height="100%" viewBox="0 0 29 29" shapeRendering="crispEdges" className="w-32 h-32">
                <path fill="#ffffff" d="M0 0h29v29H0z"/>
                <path fill="#020617" d={qrCodePath} />
              </svg>
            </div>
            
            <p className="text-xs font-bold text-slate-900 tracking-wide text-center">
              Get the Mobile App
            </p>
          </div>

        </div>
      </section>

      {/* --- Footer Section --- */}
      <footer className="bg-brandBg border-t border-slate-800 py-8 text-center text-[10px] text-slate-500 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p>© 2026 CollabZ Inc. All rights reserved.</p>
          <div className="flex justify-center gap-4 text-slate-400">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
            <span>•</span>
            <a href="#contact" className="hover:text-white transition-colors">Support Contact</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
