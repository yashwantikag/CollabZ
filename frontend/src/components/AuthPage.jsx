import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { encryptData, decryptData } from '../utils/cryptoHelper'

const SECRET_KEY = import.meta.env.VITE_SOCKET_ENCRYPTION_KEY || 'default-fallback-key-32chars-for-aes';

export default function AuthPage({ onAuthSuccess, onBack }) {
  const [step, setStep] = useState('email') // 'email' or 'code'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(0)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const socketRef = useRef(null)

  // Refs for the 6 OTP input boxes
  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ]

  // Setup Socket.io connection on component mount
  useEffect(() => {
    // Connect to the backend socket server
    socketRef.current = io('http://localhost:5000')

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server successfully')
    })

    socketRef.current.on('otp-sent', async (encryptedData) => {
      try {
        const decryptedString = await decryptData(encryptedData, SECRET_KEY);
        const data = JSON.parse(decryptedString);
        setIsLoading(false)
        setSuccessMessage(data?.message || 'Verification code sent successfully.')
        setError('')
        setTimer(30)
        setStep('code')
      } catch (err) {
        console.error('Decryption failed for otp-sent:', err);
        setIsLoading(false);
        setError('Security handshake failed.');
      }
    })

    socketRef.current.on('otp-error', async (encryptedData) => {
      try {
        const decryptedString = await decryptData(encryptedData, SECRET_KEY);
        const data = JSON.parse(decryptedString);
        setIsLoading(false)
        const errMsg = typeof data === 'string' ? data : (data?.message || 'An error occurred. Please try again.');
        setError(errMsg)
        setSuccessMessage('')
      } catch (err) {
        console.error('Decryption failed for otp-error:', err);
        setIsLoading(false);
        setError('Security handshake failed.');
      }
    })

    socketRef.current.on('auth-success', async (encryptedData) => {
      try {
        const decryptedString = await decryptData(encryptedData, SECRET_KEY);
        const data = JSON.parse(decryptedString);
        setIsLoading(false)
        setError('')
        setSuccessMessage(data?.message || 'Workspace unlocked! Redirecting...')
        // Wait briefly for user feedback before transition
        setTimeout(() => {
          onAuthSuccess()
        }, 600)
      } catch (err) {
        console.error('Decryption failed for auth-success:', err);
        setIsLoading(false);
        setError('Security handshake failed.');
      }
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [onAuthSuccess])

  // Timer effect for resending code
  useEffect(() => {
    let interval = null
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timer])

  // Automatically focus the first input box when step transitions to 'code'
  useEffect(() => {
    if (step === 'code' && inputRefs[0].current) {
      inputRefs[0].current.focus()
    }
  }, [step])

  const handleBack = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (onBack) onBack()
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim() || !emailRegex.test(email)) {
      setError('Please enter a valid organization email address.')
      return
    }

    setError('')
    setSuccessMessage('Generating security code...')
    setIsLoading(true)

    // Emit send-otp event to the backend socket
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
    e.preventDefault()
    const enteredCode = code.join('')
    
    if (enteredCode.length < 6) {
      setError('Please enter the complete 6-digit verification code.')
      return
    }

    setError('')
    setIsLoading(true)

    // Emit verify-otp event to the backend socket
    if (socketRef.current) {
      try {
        const encrypted = await encryptData(JSON.stringify({ 
          email: email.trim(), 
          otp: enteredCode 
        }), SECRET_KEY);
        socketRef.current.emit('verify-otp', encrypted)
      } catch (err) {
        console.error('Encryption failed:', err);
        setError('Failed to encrypt verification request.');
        setIsLoading(false);
      }
    }
  }

  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    setError('')

    // Focus next input box if digit is entered
    if (value && index < 5) {
      inputRefs[index + 1].current.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      // If current input is empty, clear the previous one and focus it
      if (!code[index] && index > 0) {
        const newCode = [...code]
        newCode[index - 1] = ''
        setCode(newCode)
        inputRefs[index - 1].current.focus()
      } else {
        const newCode = [...code]
        newCode[index] = ''
        setCode(newCode)
      }
      setError('')
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('')
      setCode(digits)
      setError('')
      if (inputRefs[5].current) {
        inputRefs[5].current.focus()
      }
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setCode(['', '', '', '', '', ''])
    setError('')
    setSuccessMessage('')
  }

  const handleResend = async (e) => {
    e.preventDefault()
    if (timer > 0) return
    
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:grid lg:grid-cols-2 font-sans selection:bg-indigo-600/30 selection:text-indigo-200 overflow-y-auto relative">
      
      {/* Prominent Back to Home Button floating in top-left */}
      <button
        type="button"
        onClick={handleBack}
        className="absolute top-6 left-6 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all backdrop-blur-sm shadow-lg active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to Home
      </button>

      {/* --- LEFT SIDE: Brand Gradient Showcase --- */}
      <section className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border-r border-slate-900 relative overflow-hidden">
        {/* Glow Elements */}
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>

        {/* Top Header Logo */}
        <div className="flex items-center gap-2.5 z-10 font-sans mt-12 select-none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" fill="none" className="flex-shrink-0">
            <defs>
              <linearGradient id="collabzAuthGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>
            <path d="M12 20a8 8 0 1016 0 8 8 0 10-16 0" stroke="url(#collabzAuthGrad)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M20 12a8 8 0 100 16 8 8 0 100-16" stroke="url(#collabzAuthGrad)" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
            <circle cx="20" cy="20" r="3.5" fill="#4f46e5" />
          </svg>
          <span className="text-xl font-bold tracking-tight text-white select-none">
            <span className="text-white font-extrabold">Collab</span>
            <span className="text-indigo-500 font-black">Z</span>
          </span>
        </div>

        {/* Center Welcome Messages */}
        <div className="space-y-6 max-w-md z-10 my-auto">
          <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Connect. Collaborate. <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Create.</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Host high-fidelity video reviews, sketch interface logic on synced vector canvases, and keep discussions aligned in unified workspace channels.
          </p>

          {/* Feature highlights inside left column */}
          <div className="space-y-3 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="p-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">✓</span>
              <span>Ultra-low latency drawing synchronization</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="p-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">✓</span>
              <span>Multi-party high-definition audio/video calls</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="p-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">✓</span>
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
      <section className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 relative">
        
        {/* Mobile Header (Shown on small viewports) */}
        <div className="flex items-center justify-start lg:hidden mb-8 mt-12 select-none gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="32" height="32" fill="none" className="flex-shrink-0">
            <defs>
              <linearGradient id="collabzAuthMobGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>
            <path d="M12 20a8 8 0 1016 0 8 8 0 10-16 0" stroke="url(#collabzAuthMobGrad)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M20 12a8 8 0 100 16 8 8 0 100-16" stroke="url(#collabzAuthMobGrad)" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
            <circle cx="20" cy="20" r="3.5" fill="#4f46e5" />
          </svg>
          <span className="text-lg font-bold text-white select-none">
            <span className="text-white font-extrabold">Collab</span>
            <span className="text-indigo-500 font-black">Z</span>
          </span>
        </div>

        <div className="max-w-md w-full mx-auto space-y-8">
          
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
            <div className="p-3.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-xs text-emerald-400 font-medium">
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
                  className="w-full bg-slate-900/50 text-slate-100 placeholder-slate-600 text-xs px-3.5 py-3 rounded-lg border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white text-xs font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isLoading ? 'Processing...' : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            /* Step 2: 6-Digit OTP Form */
            <form onSubmit={handleVerify} className="space-y-6">
              
              {/* Styled display of email (read-only) with option to edit */}
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-900 border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Workspace Email</span>
                  <span className="text-slate-300 font-medium">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  disabled={isLoading}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-lg sm:text-xl font-bold bg-slate-900/50 text-indigo-400 placeholder-slate-700 rounded-xl border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all disabled:opacity-50"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white text-xs font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Access Workspace'}
                </button>

                <div className="text-center space-y-3">
                  {timer > 0 ? (
                    <p className="text-[11px] text-slate-500 font-medium">
                      Resend Code in <span className="text-indigo-400 font-bold">{timer}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isLoading}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Resend Code
                    </button>
                  )}

                  <div className="pt-2 border-t border-slate-900/50">
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
