import { useState, useEffect, useRef } from 'react'
import { encryptData } from '../utils/cryptoHelper'

const SECRET_KEY = 'default-fallback-key-32chars-for-aes';

export default function AuthPage({ socket, onNavigate, onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [step, setStep] = useState('email') // 'email' or 'otp'
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [timer, setTimer] = useState(0)

  const socketRef = useRef(socket)
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)]

  useEffect(() => {
    socketRef.current = socket
  }, [socket])

  // Count down resend timer
  useEffect(() => {
    if (timer <= 0) return
    const interval = setInterval(() => {
      setTimer(prev => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [timer])

  // Focus management helper for OTP inputs
  const handleCodeChange = (index, val) => {
    const cleanVal = val.replace(/[^0-9]/g, '')
    const newCode = [...code]
    newCode[index] = cleanVal
    setCode(newCode)

    if (cleanVal !== '' && index < 5) {
      inputRefs[index + 1].current.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      inputRefs[index - 1].current.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').trim()
    if (!/^\d{6}$/.test(pastedData)) return

    const digits = pastedData.split('')
    setCode(digits)
    inputRefs[5].current.focus()
  }

  // Handle flow navigation
  const handleBack = () => {
    onNavigate('landing')
  }

  const handleBackToEmail = () => {
    setStep('email')
    setError('')
    setSuccessMessage('')
  }

  // Socket action listeners
  useEffect(() => {
    const currentSocket = socketRef.current
    if (!currentSocket) return

    const handleOtpSent = (response) => {
      setIsLoading(false)
      if (response.success) {
        setStep('otp')
        setSuccessMessage('Verification code dispatched successfully.')
        setTimer(60)
        setError('')
      } else {
        setError(response.message || 'Verification delivery failed.')
      }
    }

    const handleOtpVerified = (response) => {
      setIsLoading(false)
      if (response.success) {
        setSuccessMessage('Authentication verified. Provisioning session...')
        setTimeout(() => {
          onLoginSuccess(response.userName || 'Collaborator')
        }, 1000)
      } else {
        setError(response.message || 'The verification code is incorrect or expired.')
      }
    }

    currentSocket.on('otp-sent', handleOtpSent)
    currentSocket.on('otp-verified', handleOtpVerified)

    return () => {
      currentSocket.off('otp-sent', handleOtpSent)
      currentSocket.off('otp-verified', handleOtpVerified)
    }
  }, [onLoginSuccess])

  // Actions
  const handleSendCode = async (e) => {
    if (e) e.preventDefault()
    if (!email.trim()) return

    setError('')
    setSuccessMessage('')
    setIsLoading(true)

    if (socketRef.current) {
      try {
        const encrypted = await encryptData(JSON.stringify({ email: email.trim() }), SECRET_KEY);
        socketRef.current.emit('send-otp', encrypted)
      } catch (err) {
        console.error('Encryption failed:', err);
        setError('Failed to encrypt authentication request.');
        setIsLoading(false);
      }
    }
  }

  const handleVerify = async (e) => {
    if (e) e.preventDefault()
    const otpValue = code.join('')
    if (otpValue.length !== 6) {
      setError('Please input the complete 6-digit code.')
      return
    }

    setError('')
    setSuccessMessage('')
    setIsLoading(true)

    if (socketRef.current) {
      try {
        const payload = { email: email.trim(), code: otpValue };
        const encrypted = await encryptData(JSON.stringify(payload), SECRET_KEY);
        socketRef.current.emit('verify-otp', encrypted)
      } catch (err) {
        console.error('Encryption failed:', err);
        setError('Failed to encrypt verification request.');
        setIsLoading(false);
      }
    }
  }

  const handleResend = async () => {
    setError('')
    setSuccessMessage('Resending verification code...')
    setIsLoading(true)

    if (socketRef.current) {
      try {
        const encrypted = await encryptData(JSON.stringify({ email: email.trim() }), SECRET_KEY);
        socketRef.current.emit('send-otp', encrypted)
      } catch (err) {
        console.error('Encryption failed:', err);
        setError('Failed to encrypt authentication request.');
        setIsLoading(false);
      }
    }
    setCode(['', '', '', '', '', ''])
  }

  return (
    <div className="min-h-screen bg-brandBg text-brandText flex flex-col lg:grid lg:grid-cols-2 font-sans selection:bg-brandPrimary/30 selection:text-brandPrimary overflow-y-auto relative">
      
      {/* Prominent Back to Home Button floating in top-left */}
      <button
        type="button"
        onClick={handleBack}
        className="absolute top-6 left-6 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brandCard hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all backdrop-blur-sm shadow-lg active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to Home
      </button>

      {/* --- LEFT SIDE: Brand Gradient Showcase --- */}
      <section className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-brandBg via-brandCard to-brandBg border-r border-slate-800 relative overflow-hidden">
        {/* Glow Elements */}
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-brandPrimary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-brandSuccess/10 rounded-full blur-3xl"></div>

        {/* Top Header Logo */}
        <div className="flex items-center gap-2.5 z-10 font-sans mt-12 select-none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" fill="none" className="flex-shrink-0">
            <defs>
              <linearGradient id="collabzAuthGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            <path d="M12 20a8 8 0 1016 0 8 8 0 10-16 0" stroke="url(#collabzAuthGrad)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M20 12a8 8 0 100 16 8 8 0 100-16" stroke="url(#collabzAuthGrad)" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
            <circle cx="20" cy="20" r="3.5" fill="#10b981" />
          </svg>
          <span className="text-xl font-bold tracking-tight text-white select-none">
            <span className="text-white font-extrabold">Collab</span>
            <span className="text-brandPrimary font-black">Z</span>
          </span>
        </div>

        {/* Center Welcome Messages */}
        <div className="space-y-6 max-w-md z-10 my-auto">
          <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Connect. Collaborate. <span className="bg-gradient-to-r from-brandPrimary to-brandSuccess bg-clip-text text-transparent">Create.</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Host high-fidelity video reviews, sketch interface logic on synced vector canvases, and keep discussions aligned in unified workspace channels.
          </p>

          {/* Feature highlights inside left column */}
          <div className="space-y-3 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="p-1 rounded bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/20">✓</span>
              <span>Ultra-low latency drawing synchronization</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="p-1 rounded bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/20">✓</span>
              <span>Multi-party high-definition audio/video calls</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="p-1 rounded bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/20">✓</span>
              <span>Robust SOC2 enterprise identity shielding</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-slate-600 z-10 select-none">
          © 2026 CollabZ Inc. Secure Enterprise Access Control.
        </p>
      </section>

      {/* --- RIGHT SIDE: Authentication Form Card --- */}
      <section className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 relative bg-brandBg">
        
        {/* Mobile Header (Shown on small viewports) */}
        <div className="flex items-center justify-start lg:hidden mb-8 mt-12 select-none gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="32" height="32" fill="none" className="flex-shrink-0">
            <defs>
              <linearGradient id="collabzAuthMobGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            <path d="M12 20a8 8 0 1016 0 8 8 0 10-16 0" stroke="url(#collabzAuthMobGrad)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M20 12a8 8 0 100 16 8 8 0 100-16" stroke="url(#collabzAuthMobGrad)" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
            <circle cx="20" cy="20" r="3.5" fill="#10b981" />
          </svg>
          <span className="text-lg font-bold text-white select-none">
            <span className="text-white font-extrabold">Collab</span>
            <span className="text-brandPrimary font-black">Z</span>
          </span>
        </div>

        <div className="max-w-md w-full mx-auto space-y-8 animate-[fadeIn_0.2s_ease-out]">
          
          {/* Headline */}
          <div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              {step === 'email' ? 'Enterprise Access' : 'Verify Identity'}
            </h3>
            <p className="text-slate-400 text-xs mt-2">
              {step === 'email' 
                ? 'Access your synchronized channels and canvases with passwordless OTP.' 
                : 'Enter the 6-digit verification code sent to your email.'}
            </p>
          </div>

          {/* Form Error Banner */}
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-500/15 border border-rose-500/25 text-xs text-rose-400 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-lg bg-brandSuccess/15 border border-brandSuccess/25 text-xs text-brandSuccess font-medium">
              ✨ {successMessage}
            </div>
          )}

          {/* Step 1: Email Form */}
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Organization Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@organization.com"
                  className="w-full bg-brandCard text-brandText placeholder-slate-600 text-xs px-3.5 py-3 rounded-lg border border-slate-800 focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary focus:outline-none transition-all"
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brandPrimary hover:bg-brandPrimary/90 active:scale-95 transition-all text-brandBg font-bold text-xs py-3.5 rounded-xl shadow-lg shadow-brandPrimary/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isLoading ? 'Processing...' : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            /* Step 2: 6-Digit OTP Form */
            <form onSubmit={handleVerify} className="space-y-6">
              
              {/* Styled display of email (read-only) with option to edit */}
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-brandCard border border-slate-850 text-xs">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Workspace Email</span>
                  <span className="text-slate-300 font-medium">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  disabled={isLoading}
                  className="text-[10px] text-brandPrimary hover:text-brandPrimary/80 font-semibold px-2 py-1 rounded bg-brandPrimary/10 border border-brandPrimary/20 hover:border-brandPrimary/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Edit Email
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block">Enter 6-Digit Code</label>
                <div className="flex justify-between gap-2" onPaste={handlePaste}>
                  {code.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={inputRefs[idx]}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      placeholder="-"
                      disabled={isLoading}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-lg sm:text-xl font-bold bg-brandCard text-brandPrimary placeholder-slate-700 rounded-xl border border-slate-800 focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary focus:outline-none transition-all disabled:opacity-50"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-brandPrimary hover:bg-brandPrimary/90 active:scale-95 transition-all text-brandBg font-bold text-xs py-3.5 rounded-xl shadow-lg shadow-brandPrimary/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Access Workspace'}
                </button>

                <div className="text-center space-y-3">
                  {timer > 0 ? (
                    <p className="text-[11px] text-slate-500 font-medium">
                      Resend Code in <span className="text-brandPrimary font-bold">{timer}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isLoading}
                      className="text-[11px] text-brandPrimary hover:text-brandPrimary/80 font-bold underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Resend Code
                    </button>
                  )}

                  <div className="pt-2 border-t border-slate-800/50">
                    <p className="text-[10px] text-slate-500 leading-relaxed italic">
                      Dev Mode: Check your backend terminal console for the generated OTP if email delivery is delayed.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          )}

        </div>
      </section>

    </div>
  )
}
