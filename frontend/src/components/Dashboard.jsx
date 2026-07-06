import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { encryptData, decryptData } from '../utils/cryptoHelper'
import MeetHub from './MeetHub'
import Whiteboard from './Whiteboard'
import FileShare from './FileShare'
import ChatWorkspace from './ChatWorkspace'
import ContactsDirectory from './ContactsDirectory'

const SECRET_KEY = import.meta.env.VITE_SOCKET_ENCRYPTION_KEY || 'default-fallback-key-32chars-for-aes';

export default function Dashboard() {
  const socketRef = useRef(null)
  const [currentView, setCurrentView] = useState('overview') // 'overview', 'channels', 'canvas', 'editor', 'trading', 'analytics', 'meet'

  const navigateToView = (newView, pushState = true) => {
    if (pushState) {
      window.history.pushState({ view: newView }, '', '')
    }
    setCurrentView(newView)
  }

  useEffect(() => {
    // Force-enable browser arrows by populating history stack
    window.history.replaceState({ view: 'overview' }, '', '')
    window.history.pushState({ view: 'overview' }, '', '')

    const handlePopState = (event) => {
      const targetView = (event.state && event.state.view) ? event.state.view : 'overview'
      navigateToView(targetView, false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])
  const [selectedChannel, setSelectedChannel] = useState('#general')
  const [tradingAsset, setTradingAsset] = useState('BTC')
  const [editorFile, setEditorFile] = useState('App.jsx')

  // --- Collaborative Editor Content State ---
  const [editorContent, setEditorContent] = useState({
    'App.jsx': `import React, { useState } from 'react';\nimport AuthPage from './components/AuthPage';\nimport Dashboard from './components/Dashboard';\n\nexport default function App() {\n  const [isAuth, setIsAuth] = useState(false);\n  return isAuth ? <Dashboard /> : <AuthPage onAuthSuccess={() => setIsAuth(true)} />;\n}`,
    'server.js': `const express = require('express');\nconst http = require('http');\nconst { Server } = require('socket.io');\n\nconst app = express();\nconst server = http.createServer(app);\nconst io = new Server(server);\n\nio.on('connection', (socket) => {\n  console.log('User connected: ' + socket.id);\n});`,
    'index.css': `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody {\n  background-color: #020617;\n  color: #f8fafc;\n}`
  })

  // --- Real-time Ticker Simulation (Trading Dashboard) ---
  const [assets, setAssets] = useState({
    BTC: { price: 68420.50, change: 2.45, history: [68100, 68250, 68050, 68310, 68400, 68420.50] },
    ETH: { price: 3450.25, change: -1.15, history: [3490, 3480, 3465, 3470, 3445, 3450.25] },
    SOL: { price: 145.80, change: 5.12, history: [138, 140, 142, 141, 144, 145.80] },
    AAPL: { price: 189.20, change: 0.35, history: [188.5, 188.9, 189.1, 188.8, 189.0, 189.2] },
    NVDA: { price: 920.45, change: 8.75, history: [880, 895, 905, 910, 915, 920.45] }
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setAssets((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((key) => {
          const asset = next[key]
          const delta = (Math.random() - 0.47) * (asset.price * 0.0012)
          const newPrice = Number((asset.price + delta).toFixed(2))
          const newHistory = [...asset.history.slice(1), newPrice]
          next[key] = {
            ...asset,
            price: newPrice,
            change: Number((asset.change + (delta / asset.price) * 100).toFixed(2)),
            history: newHistory
          }
        })
        return next
      })
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  // --- Reward Center State ---
  const [showRewardPopover, setShowRewardPopover] = useState(false)

  // --- Meet Module State ---
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [meetingLinks, setMeetingLinks] = useState([
    { id: 'meet_1', name: 'Design Review Sync', code: 'dsn-revy-syc', url: 'http://localhost:5173/meet/dsn-revy-syc', createdAt: 'Jul 1, 2026' },
    { id: 'meet_2', name: 'Frontend Refactor Planning', code: 'frt-plan-syc', url: 'http://localhost:5173/meet/frt-plan-syc', createdAt: 'Jun 30, 2026' }
  ])
  const [scheduledMeetings, setScheduledMeetings] = useState([
    { id: 'sched_1', name: 'Weekly Architecture Alignment', date: '2026-07-02', time: '14:30', description: 'Reviewing next-gen collaboration schema', code: 'arc-align-syc', url: 'http://localhost:5173/meet/arc-align-syc' }
  ])
  const [meetingFiles, setMeetingFiles] = useState([])
  const [isExplainMode, setIsExplainMode] = useState(false)
  const [explainModeSpeaker, setExplainModeSpeaker] = useState(null)
  const [showCallWhiteboard, setShowCallWhiteboard] = useState(false)
  const [showCallFiles, setShowCallFiles] = useState(true)
  const [showSyncModal, setShowSyncModal] = useState(false)

  // Whiteboard States (Persists drawing context across tab switches)
  const [wbHistory, setWbHistory] = useState([])
  const [wbHistoryIndex, setWbHistoryIndex] = useState(-1)

  // Persistent Drawing Stroke Buffer for Tab Switching
  const pendingStrokesRef = useRef([])
  const onStrokeReceivedCallback = useRef(null)

  // --- Video Call State ---
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  // --- Chat State ---
  const [messages, setMessages] = useState([
    {
      id: 1,
      user: 'Alex Rivera',
      text: "Hey team! I've started sketching the main application flow. Feel free to add ideas.",
      time: '19:35',
      self: false,
      avatarColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    },
    {
      id: 2,
      user: 'Sarah Jenkins',
      text: 'Looks great! I think we should add a direct database connection layer right here in the center.',
      time: '19:36',
      self: false,
      avatarColor: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
    },
    {
      id: 3,
      user: 'Alex Rivera',
      text: 'Good point. Let me select the pink brush to mark that path.',
      time: '19:37',
      self: false,
      avatarColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef(null)

  // --- Predefined Colors ---
  const colors = [
    { value: '#6366f1', name: 'Indigo' },
    { value: '#ec4899', name: 'Pink' },
    { value: '#10b981', name: 'Emerald' },
    { value: '#f59e0b', name: 'Amber' },
    { value: '#ffffff', name: 'White' },
  ]

  // --- Auto-scroll Chat to Bottom ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentView])

  // Setup Socket.io connection for real-time encrypted communication
  useEffect(() => {
    socketRef.current = io('http://localhost:5000')

    socketRef.current.on('connect', () => {
      console.log('Dashboard connected to socket server')
    })

    // Listen for encrypted chat messages
    socketRef.current.on('receive-chat-message', async (encryptedPayload) => {
      try {
        const decryptedString = await decryptData(encryptedPayload, SECRET_KEY);
        const incomingMessage = JSON.parse(decryptedString);
        incomingMessage.self = false;
        setMessages((prev) => [...prev, incomingMessage]);
      } catch (err) {
        console.error('Failed to decrypt incoming chat message:', err);
      }
    })

    // Listen for encrypted drawing strokes (Buffered for tab switching)
    socketRef.current.on('receive-draw-stroke', async (encryptedPayload) => {
      try {
        const decryptedString = await decryptData(encryptedPayload, SECRET_KEY);
        const stroke = JSON.parse(decryptedString);
        pendingStrokesRef.current.push(stroke);
        if (onStrokeReceivedCallback.current) {
          onStrokeReceivedCallback.current();
        }
      } catch (err) {
        console.error('Failed to decrypt drawing stroke:', err);
      }
    })

    // Listen for Explain Mode layouts
    socketRef.current.on('explain-mode-changed', (data) => {
      setIsExplainMode(data.isExplainMode);
      setExplainModeSpeaker(data.isExplainMode ? data.speakerName : null);
    });

    socketRef.current.on('user-joined-meeting', (data) => {
      console.log(`[MEET] User joined: ${data.userName}`);
    });

    socketRef.current.on('user-left-meeting', (data) => {
      console.log(`[MEET] User left: ${data.userName}`);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  // --- Meet Module Handlers ---
  const handleJoinMeeting = (roomId) => {
    setActiveRoomId(roomId)
    if (socketRef.current) {
      socketRef.current.emit('join-meeting', { roomId, userName: 'Yashwantika G.' })
    }
    navigateToView('meet')
  }

  const handleLeaveMeeting = () => {
    if (socketRef.current && activeRoomId) {
      socketRef.current.emit('leave-meeting', { roomId: activeRoomId, userName: 'Yashwantika G.' })
    }
    setActiveRoomId(null)
    setIsExplainMode(false)
    setExplainModeSpeaker(null)
    setShowCallWhiteboard(false)
  }

  // --- Chat logic ---
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const now = new Date()
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const newMessage = {
      id: Date.now(),
      user: 'You',
      text: chatInput,
      time: timeString,
      self: true,
      avatarColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
    }

    setMessages((prev) => [...prev, newMessage])
    setChatInput('')

    // Emit encrypted message to socket
    if (socketRef.current) {
      try {
        const encrypted = await encryptData(JSON.stringify(newMessage), SECRET_KEY);
        socketRef.current.emit('new-chat-message', encrypted);
      } catch (err) {
        console.error('Encryption failed for chat message:', err);
      }
    }
  }

  // ==========================================
  // --- SUB-VIEW RENDERING FUNCTIONS ---
  // ==========================================

  // 1. Welcome / Overview Dashboard View
  const renderOverviewView = () => (
    <div className="p-8 h-full overflow-y-auto space-y-8 select-text">
      {/* Glow welcome banner */}
      <div className="relative rounded-2xl border border-slate-800/80 bg-gradient-to-r from-indigo-950/20 via-slate-900 to-purple-950/20 p-8 overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500/5 blur-xl rounded-2xl"></div>
        <div className="relative z-10">
          <h3 className="text-2xl font-extrabold text-white">Welcome back, Yashwantika</h3>
          <p className="text-slate-400 text-xs mt-2 max-w-2xl leading-relaxed">
            Access secure collaborative workspaces, whiteboards, code files, and stock analytics modules in real time from a single unified workspace.
          </p>
          <div className="mt-6 flex gap-3">
            <button onClick={() => navigateToView('canvas')} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-lg active:scale-95">
              Open Canvas
            </button>
            <button onClick={() => navigateToView('meet')} className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-850 text-xs font-semibold text-slate-300 border border-slate-800 transition-all active:scale-95">
              Open Meet Hub
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            title: 'Drawing Board', 
            value: '1 Active Canvas', 
            desc: 'Real-time vector board', 
            icon: '🎨', 
            color: 'text-indigo-400 bg-indigo-500/10',
            onClick: () => navigateToView('canvas')
          },
          { 
            title: 'Sync Status', 
            value: 'Bypassed', 
            desc: 'Secure local verification', 
            icon: '🔑', 
            color: 'text-emerald-400 bg-emerald-500/10',
            onClick: () => setShowSyncModal(true)
          },
          { 
            title: 'Connections', 
            value: '3 Active Users', 
            desc: 'Collaborators synced', 
            icon: '👥', 
            color: 'text-purple-400 bg-purple-500/10',
            onClick: () => navigateToView('meet')
          },
          { 
            title: 'Server Latency', 
            value: '12ms', 
            desc: 'US-East-1 Edge location', 
            icon: '⚡', 
            color: 'text-amber-400 bg-amber-500/10',
            onClick: () => alert("Latency pinged successfully: 12ms connection stable.")
          }
        ].map((stat, idx) => (
          <div 
            key={idx} 
            onClick={stat.onClick}
            className="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/10 flex items-center justify-between cursor-pointer hover:scale-[1.02] hover:bg-[#161b26] border-slate-700/40 hover:border-slate-650 transition-all duration-200 select-none group"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 group-hover:text-slate-400 transition-colors">{stat.title}</span>
              <span className="text-lg font-black text-white block">{stat.value}</span>
              <span className="text-[10px] text-slate-400 block mt-1.5">{stat.desc}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-transform duration-200 group-hover:scale-110 ${stat.color}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* System Activity & Logs */}
      <div className="p-6 rounded-2xl border border-slate-800/60 bg-slate-900/10">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          System Event Feed
        </h4>
        <div className="space-y-4 font-mono">
          {[
            { time: '13:51', user: 'System', text: 'Secure Dev-Bypass server verified on port 5000.', color: 'text-indigo-400' },
            { time: '13:50', user: 'Alex Rivera', text: 'Created drawings on vector whiteboard.', color: 'text-emerald-400' },
            { time: '13:42', user: 'Sarah Jenkins', text: 'Joined general workspace conference call.', color: 'text-pink-400' },
            { time: '13:19', user: 'You', text: 'OTP authentication bypassed successfully.', color: 'text-indigo-400' }
          ].map((log, idx) => (
            <div key={idx} className="flex items-start gap-4 text-xs">
              <span className="text-slate-500 text-[10px] w-14 flex-shrink-0">{log.time}</span>
              <span className={`font-bold flex-shrink-0 text-[10px] ${log.color}`}>{log.user}</span>
              <span className="text-slate-400 text-[11px]">{log.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Status Info Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative animate-[scaleIn_0.18s_ease-out]">
            <button 
              onClick={() => setShowSyncModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider select-none flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Sync Security Parameters
            </h3>

            <div className="space-y-3 font-mono text-[10px] text-slate-400 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-850">
              <p>STATUS: <span className="text-emerald-400 font-bold">DEV_BYPASS_ACTIVE</span></p>
              <p>PORT: <span className="text-indigo-400 font-bold">5000</span></p>
              <p>ENCRYPTION: <span className="text-indigo-400 font-bold">AES-256-GCM (Web Crypto)</span></p>
              <p>EDGE LATENCY: <span className="text-amber-400 font-bold">12ms</span></p>
              <p>LOCAL CACHE: <span className="text-indigo-400 font-bold">In-Memory Transient Buffer</span></p>
              <p>AUTH MODE: <span className="text-slate-350">Local verification mock bypassed.</span></p>
            </div>
            
            <button
              onClick={() => setShowSyncModal(false)}
              className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-bold uppercase rounded-xl transition-all border border-slate-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // Helper: Video Conference Panel inside Channels Layout
  const renderVideoSection = () => (
    <section className="p-4 flex flex-col gap-3 h-full overflow-hidden">
      <div className="flex items-center justify-between select-none">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block"></span>
          Video Panel
        </h2>
        <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-medium">
          {isInCall ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {isInCall ? (
        <div className="flex-1 grid grid-rows-2 gap-2 overflow-hidden min-h-[220px]">
          {/* You */}
          <div className="relative rounded-xl border border-slate-850 bg-slate-950 overflow-hidden flex flex-col justify-center items-center">
            {isVideoOn ? (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs select-none">Y</div>
                <span className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded">You</span>
              </div>
            ) : (
              <div className="text-center p-3 select-none">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-xs mx-auto mb-1">Y</div>
                <span className="text-[9px] text-slate-500 font-medium block">Camera Off</span>
              </div>
            )}
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMuted ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isMuted ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
            </span>
          </div>

          {/* Sarah Jenkins */}
          <div className="relative rounded-xl border border-slate-850 bg-slate-950 overflow-hidden flex flex-col justify-center items-center">
            <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent"></div>
              <div className="w-8 h-8 rounded-full bg-pink-600/30 border border-pink-500/30 text-pink-400 flex items-center justify-center font-bold text-xs select-none">SJ</div>
              <span className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded">Sarah Jenkins</span>
              <span className="absolute top-2 right-2 text-[8px] bg-slate-950/60 border border-slate-800 text-indigo-400 font-mono px-1 rounded select-none">Screen Sharing</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 p-4 text-center select-none min-h-[220px]">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-slate-600 mb-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.51 18h11.25a2.25 2.25 0 0 0 2.25-2.25V8.25A2.25 2.25 0 0 0 15.76 6H4.51a2.25 2.25 0 0 0-2.25 2.25v7.5A2.25 2.25 0 0 0 4.51 18Z" />
          </svg>
          <span className="text-[10px] text-slate-500 font-medium block">Conference call disconnected.</span>
        </div>
      )}

      {/* Conference Buttons */}
      <div className="flex items-center justify-between gap-1 mt-1 border-t border-slate-800/60 pt-3">
        <div className="flex items-center gap-1.5">
          <button
            disabled={!isInCall}
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg border transition-all ${!isInCall ? 'opacity-20 cursor-not-allowed border-slate-850' : isMuted ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-800'}`}
          >
            {isMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
              </svg>
            )}
          </button>

          <button
            disabled={!isInCall}
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-2 rounded-lg border transition-all ${!isInCall ? 'opacity-20 cursor-not-allowed border-slate-850' : !isVideoOn ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-800'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            </svg>
          </button>
        </div>

        <button
          onClick={() => setIsInCall(!isInCall)}
          className={`px-3.5 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${isInCall ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-600 shadow-md' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-md'}`}
        >
          {isInCall ? 'Leave' : 'Join'}
        </button>
      </div>
    </section>
  )

  // 2. Workspace Channels & Collaborative Chat View
  const renderChannelsView = () => (
    <div className="flex h-full overflow-hidden select-text">
      {/* Channels sidebar */}
      <div className="w-56 bg-slate-950/20 border-r border-slate-800/80 flex flex-col flex-shrink-0 select-none">
        <div className="p-4 border-b border-slate-850">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Channels</span>
        </div>
        <div className="p-3 space-y-1.5 overflow-y-auto flex-1">
          {['#general', '#design-reviews', '#code-sync', '#crypto-trading'].map((chan) => (
            <button
              key={chan}
              onClick={() => setSelectedChannel(chan)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                selectedChannel === chan 
                  ? 'bg-slate-900 text-white border border-slate-800' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              <span>{chan}</span>
              {chan === '#general' && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main chat column */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/10">
          {/* Chat Message Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-3.5 ${msg.self ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs select-none ${msg.avatarColor}`}>
                  {msg.user.split(' ').map(n => n[0]).join('')}
                </div>
                <div className={`flex flex-col max-w-[70%] ${msg.self ? 'items-end' : ''}`}>
                  <div className="flex items-center gap-2 mb-1 select-none">
                    <span className="text-[10px] font-bold text-slate-300">{msg.user}</span>
                    <span className="text-[9px] text-slate-500 font-mono">{msg.time}</span>
                  </div>
                  <div className={`p-3 rounded-xl text-xs leading-relaxed break-words border ${
                    msg.self 
                      ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' 
                      : 'bg-slate-900 text-slate-300 border-slate-800 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Message input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800/80 bg-slate-900/40 flex items-center gap-3">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Message ${selectedChannel}...`}
              className="flex-1 bg-slate-950 text-xs text-slate-100 placeholder-slate-650 px-4 py-3 rounded-xl border border-slate-800/85 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
            />
            <button
              type="submit"
              className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition-all shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>

        {/* Video Panel sidebar (right side of channels view) */}
        <div className="w-72 border-l border-slate-800/80 bg-slate-950/20">
          {renderVideoSection()}
        </div>
      </div>
    </div>
  )

  // 3. Standalone Collaborative Drawing Whiteboard Canvas View
  const renderCanvasView = () => (
    <Whiteboard 
      socket={socketRef.current}
      roomId={null}
      userName="Yashwantika G."
      history={wbHistory}
      setHistory={setWbHistory}
      historyIndex={wbHistoryIndex}
      setHistoryIndex={setWbHistoryIndex}
      isExplainMode={false}
      setIsExplainMode={() => {}}
      explainModeSpeaker={null}
      inCall={false}
    />
  )

  // 3.6. Standalone File Share View
  const renderFileShareView = () => (
    <div className="h-full w-full bg-[#0b0f19] flex flex-col p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Secure File Storage</h2>
            <p className="text-xs text-slate-400 mt-1">
              Upload files securely to the workspace vault. Slices, GCM encrypts, and buffers your documents.
            </p>
          </div>
        </div>
        <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-6">
          <FileShare 
            roomId={activeRoomId || 'global-vault'} 
            socket={socketRef.current} 
            files={meetingFiles} 
            setFiles={setMeetingFiles} 
          />
        </div>
      </div>
    </div>
  )

  // 3.5. Meet Module View Rendering
  const renderMeetView = () => {
    if (!activeRoomId) {
      return (
        <MeetHub
          meetingLinks={meetingLinks}
          setMeetingLinks={setMeetingLinks}
          scheduledMeetings={scheduledMeetings}
          setScheduledMeetings={setScheduledMeetings}
          onJoinMeeting={handleJoinMeeting}
        />
      )
    }

    return (
      <div className="flex h-full w-full bg-[#080c14] overflow-hidden select-text relative">
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
          
          {/* Active meeting header */}
          <div className="h-14 px-6 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Sync Room: <span className="font-mono text-indigo-400 font-bold">{activeRoomId}</span>
              </h3>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500 font-mono">00:14:32</span>
              {isExplainMode && (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase animate-pulse">
                  Explain Mode Active ({explainModeSpeaker})
                </span>
              )}
            </div>
          </div>

          {/* Call content grid */}
          <div className="flex-1 p-6 relative overflow-hidden">
            {isExplainMode ? (
              <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                {/* Presenter Feed */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden relative flex flex-col justify-center items-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                  <div className="text-center p-6 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-indigo-650/30 border-2 border-indigo-500 text-white flex items-center justify-center font-bold text-lg mx-auto shadow-2xl animate-pulse">
                      {explainModeSpeaker ? explainModeSpeaker.split(' ').map(n => n[0]).join('') : 'SP'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{explainModeSpeaker} (Presenter)</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-1 block">Broadcasting Live Media Stream</span>
                    </div>
                  </div>
                  
                  <span className="absolute bottom-4 left-4 flex items-center gap-2 text-[10px] bg-slate-900/80 px-2 py-1 rounded font-mono text-slate-400">
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                    </span>
                    Audio Stream Active
                  </span>
                </div>

                {/* Shared Whiteboard Canvas */}
                <div className="rounded-2xl border border-slate-800 overflow-hidden relative">
                  <Whiteboard 
                    socket={socketRef.current}
                    roomId={activeRoomId}
                    userName="Yashwantika G."
                    history={wbHistory}
                    setHistory={setWbHistory}
                    historyIndex={wbHistoryIndex}
                    setHistoryIndex={setWbHistoryIndex}
                    isExplainMode={isExplainMode}
                    setIsExplainMode={setIsExplainMode}
                    explainModeSpeaker={explainModeSpeaker}
                    inCall={true}
                  />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col lg:flex-row gap-6 overflow-hidden">
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                  {showCallWhiteboard ? (
                    <div className="w-full h-full grid grid-rows-3 lg:grid-rows-1 lg:grid-cols-3 gap-6 overflow-hidden">
                      <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-4 overflow-y-auto pr-1">
                        <div className="rounded-xl border border-slate-850 bg-slate-950 overflow-hidden relative flex flex-col justify-center items-center min-h-[120px] max-h-[180px]">
                          {isVideoOn ? (
                            <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">Y</div>
                              <span className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded">You</span>
                            </div>
                          ) : (
                            <div className="text-center p-3 select-none">
                              <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-xs mx-auto mb-1">Y</div>
                              <span className="text-[9px] text-slate-500 font-medium block">Camera Off</span>
                            </div>
                          )}
                          <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isMuted ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                        </div>

                        <div className="rounded-xl border border-slate-850 bg-slate-950 overflow-hidden relative flex flex-col justify-center items-center min-h-[120px] max-h-[180px]">
                          <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent"></div>
                            <div className="w-10 h-10 rounded-full bg-pink-650/30 border border-pink-500/30 text-pink-400 flex items-center justify-center font-bold text-sm">SJ</div>
                            <span className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded">Sarah Jenkins</span>
                            <span className="absolute top-2 right-2 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-850 bg-slate-950 overflow-hidden relative flex flex-col justify-center items-center min-h-[120px] max-h-[180px]">
                          <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
                            <div className="w-10 h-10 rounded-full bg-emerald-650/30 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">AR</div>
                            <span className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded">Alex Rivera</span>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-2 rounded-2xl border border-slate-800 overflow-hidden relative min-h-[250px]">
                        <Whiteboard 
                          socket={socketRef.current}
                          roomId={activeRoomId}
                          userName="Yashwantika G."
                          history={wbHistory}
                          setHistory={setWbHistory}
                          historyIndex={wbHistoryIndex}
                          setHistoryIndex={setWbHistoryIndex}
                          isExplainMode={isExplainMode}
                          setIsExplainMode={setIsExplainMode}
                          explainModeSpeaker={explainModeSpeaker}
                          inCall={true}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-1">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden relative flex flex-col justify-center items-center min-h-[200px]">
                        {isVideoOn ? (
                          <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                            <div className="w-12 h-12 rounded-full bg-indigo-650 text-white flex items-center justify-center font-bold text-sm border-2 border-indigo-500">Y</div>
                            <span className="absolute bottom-3 left-3 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded">You (Yashwantika)</span>
                          </div>
                        ) : (
                          <div className="text-center p-4">
                            <div className="w-12 h-12 rounded-full bg-slate-850 text-slate-500 flex items-center justify-center font-bold text-sm mx-auto mb-2">Y</div>
                            <span className="text-xs text-slate-500 font-medium block">Camera Off</span>
                          </div>
                        )}
                        <span className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${isMuted ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                      </div>

                      <div className="rounded-2xl border border-slate-850 bg-slate-950 overflow-hidden relative flex flex-col justify-center items-center min-h-[200px]">
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent"></div>
                          <div className="w-12 h-12 rounded-full bg-pink-650/30 border-2 border-pink-500/30 text-pink-400 flex items-center justify-center font-bold text-sm animate-pulse">SJ</div>
                          <span className="absolute bottom-3 left-3 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded">Sarah Jenkins</span>
                          <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-850 bg-slate-950 overflow-hidden relative flex flex-col justify-center items-center min-h-[200px]">
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
                          <div className="w-12 h-12 rounded-full bg-emerald-650/30 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">AR</div>
                          <span className="absolute bottom-3 left-3 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded">Alex Rivera</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {showCallFiles && (
                  <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4 overflow-hidden border-t lg:border-t-0 lg:border-l border-slate-850/80 pl-0 lg:pl-6 pt-6 lg:pt-0">
                    <FileShare 
                      socket={socketRef.current}
                      roomId={activeRoomId}
                      userName="Yashwantika G."
                      files={meetingFiles}
                      setFiles={setMeetingFiles}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Call Control Bar */}
          <div className="h-20 bg-slate-950 border-t border-slate-850 px-8 flex items-center justify-between select-none z-20">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-xl font-mono">
                Room ID: {activeRoomId}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3.5 rounded-xl border transition-all active:scale-95 shadow-md ${
                  isMuted 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={`p-3.5 rounded-xl border transition-all active:scale-95 shadow-md ${
                  !isVideoOn 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
                title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                </svg>
              </button>

              {!isExplainMode && (
                <button
                  onClick={() => setShowCallWhiteboard(!showCallWhiteboard)}
                  className={`p-3.5 rounded-xl border transition-all active:scale-95 shadow-md ${
                    showCallWhiteboard 
                      ? 'bg-indigo-600 text-white border-indigo-500' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title="Collaborative Canvas"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                  </svg>
                </button>
              )}

              <button
                onClick={() => setShowCallFiles(!showCallFiles)}
                className={`p-3.5 rounded-xl border transition-all active:scale-95 shadow-md ${
                  showCallFiles 
                    ? 'bg-indigo-600 text-white border-indigo-500' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Shared Files & History"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </button>
            </div>

            <div>
              <button
                onClick={handleLeaveMeeting}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-lg shadow-rose-600/15"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 4. Code Editor View
  const renderEditorView = () => (
    <div className="p-8 h-full flex flex-col space-y-6 overflow-y-auto select-text">
      <div className="flex items-center justify-between select-none">
        {/* File tabs */}
        <div className="flex border border-slate-850 p-0.5 bg-slate-950/60 rounded-xl">
          {['App.jsx', 'server.js', 'index.css'].map((f) => (
            <button
              key={f}
              onClick={() => setEditorFile(f)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                editorFile === f 
                  ? 'bg-slate-800 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Sync indicators */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-mono">JS / Babel</span>
          <span className="text-xs text-slate-500 font-medium">Active Editors: 2</span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[350px]">
        {/* Main Code Editor */}
        <div className="flex-1 rounded-2xl border border-slate-800 bg-[#070b13] p-4 flex flex-col relative font-mono text-xs">
          <div className="absolute top-4 right-4 z-10 select-none flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[9px] font-bold">Sarah Jenkins Editing</span>
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping"></span>
          </div>
          <textarea
            value={editorContent[editorFile]}
            onChange={(e) => {
              setEditorContent({
                ...editorContent,
                [editorFile]: e.target.value
              })
            }}
            className="w-full flex-1 bg-transparent text-slate-350 resize-none outline-none leading-relaxed overflow-y-auto selection:bg-indigo-600/30"
            spellCheck="false"
          />
        </div>

        {/* Active side-panel */}
        <div className="w-full lg:w-64 flex flex-col gap-4 select-none">
          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/10 space-y-3">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Workspace Collaborators</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-[10px] text-indigo-400">Y</div>
                <div>
                  <span className="text-slate-300 font-medium block">You (Yashwantika)</span>
                  <span className="text-[9px] text-slate-500">Editing line 1</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <div className="w-6 h-6 rounded bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-[10px] text-pink-400">SJ</div>
                <div>
                  <span className="text-slate-300 font-medium block">Sarah Jenkins</span>
                  <span className="text-[9px] text-slate-500">Editing line 6</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // 5. Crypto/Stock Trading Dashboard View
  const renderTradingView = () => {
    const asset = assets[tradingAsset]
    const minVal = Math.min(...asset.history)
    const maxVal = Math.max(...asset.history)
    const range = maxVal - minVal || 1

    // Map 6 points to x: 0 to 500, y: 170 to 10
    const points = asset.history.map((val, idx) => {
      const x = idx * 100
      const y = 170 - ((val - minVal) / range) * 140
      return `${x},${y}`
    }).join(' ')

    return (
      <div className="p-8 h-full overflow-y-auto space-y-6 select-text">
        {/* Asset tabs */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 select-none">
          <div className="flex border border-slate-850 p-0.5 bg-slate-950/60 rounded-xl">
            {Object.keys(assets).map((symbol) => (
              <button
                key={symbol}
                onClick={() => setTradingAsset(symbol)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  tradingAsset === symbol 
                    ? 'bg-slate-850 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
          
          <div className="text-right">
            <span className="text-xl font-black text-white font-mono block">${asset.price.toLocaleString()}</span>
            <span className={`text-[10px] font-bold font-mono ${asset.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {asset.change >= 0 ? '▲' : '▼'} {Math.abs(asset.change)}% (24H)
            </span>
          </div>
        </div>

        {/* Dynamic Ticker Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Glowing Line SVG chart card */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800/80 bg-[#070b13] p-6 relative flex flex-col justify-between overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-2xl"></div>
            <div className="flex justify-between items-center mb-6 select-none relative z-10">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interactive Live Feed</span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            </div>
            
            <div className="w-full h-48 relative overflow-visible z-10">
              <svg className="w-full h-full text-indigo-500 overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="tradingChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path
                  d={`M ${points}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-700"
                />
                <path
                  d={`M 0,180 L ${points} L 500,180 Z`}
                  fill="url(#tradingChartGrad)"
                  className="transition-all duration-700"
                />
              </svg>
            </div>
          </div>

          {/* Quick Buy/Sell Terminal Form */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/10 p-6 flex flex-col justify-between select-none">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-4">Trade Console</span>
              <div className="flex border border-slate-800 p-0.5 bg-slate-950 rounded-xl mb-4">
                <button className="flex-1 py-1.5 text-center text-[10px] font-bold bg-slate-850 text-white rounded-lg shadow-sm">BUY</button>
                <button className="flex-1 py-1.5 text-center text-[10px] font-bold text-slate-500 hover:text-slate-350">SELL</button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Amount (USD)</label>
                  <input type="text" placeholder="100" defaultValue="100" className="w-full bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-800 text-white focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Limit Price</label>
                  <input type="text" placeholder={asset.price.toString()} className="w-full bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-800 text-slate-400 focus:outline-none" disabled />
                </div>
              </div>
            </div>

            <button className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white text-xs font-bold py-3 rounded-xl mt-6 shadow-lg shadow-indigo-600/15">
              Execute Order
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 6. Analytics & Workspace Usage View
  const renderAnalyticsView = () => (
    <div className="p-8 h-full overflow-y-auto space-y-8 select-text">
      {/* Dynamic Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Drawing Stroke Count', value: '412 Strokes', desc: 'Vector drawing operations', valueColor: 'text-indigo-400' },
          { title: 'Workspace Messages', value: '86 Messages', desc: 'Total chat conversation logs', valueColor: 'text-emerald-400' },
          { title: 'Collaborator Sync Time', value: '2 Hours Active', desc: 'Voice/Video connection sessions', valueColor: 'text-purple-400' }
        ].map((met, idx) => (
          <div key={idx} className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/10 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{met.title}</span>
            <span className={`text-2xl font-black block ${met.valueColor}`}>{met.value}</span>
            <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-900/50">{met.desc}</span>
          </div>
        ))}
      </div>

      {/* SVG Bar Chart cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 select-none">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/10 p-6 space-y-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Weekly Whiteboard Activity (Strokes)</span>
          <div className="h-44 flex items-end justify-between gap-4 pt-4">
            {[30, 45, 60, 25, 80, 50, 75].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-gradient-to-t from-indigo-650 to-indigo-500 rounded-t-lg transition-all" style={{ height: `${h}%` }}></div>
                <span className="text-[9px] font-mono text-slate-500">M T W T F S S.split('')[i]</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/10 p-6 space-y-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Edge Connection Network Health</span>
          <div className="space-y-4">
            {[
              { label: 'WebSocket Signal Strengths', value: 98 },
              { label: 'WebRTC Peer Loss Rates', value: 1.2 },
              { label: 'Socket.io Handshake Times', value: 92 }
            ].map((metric, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">{metric.label}</span>
                  <span className="text-slate-200 font-bold font-mono">{metric.value}%</span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${metric.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      
      {/* --- Left Sidebar Navigation --- */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 z-20">
        {/* App Logo & Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none" className="w-5 h-5">
              <defs>
                <linearGradient id="sidebarLogoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>
              <path d="M12 20a8 8 0 1016 0 8 8 0 10-16 0" stroke="url(#sidebarLogoGrad)" strokeWidth="3.5" />
              <path d="M20 12a8 8 0 100 16 8 8 0 100-16" stroke="url(#sidebarLogoGrad)" strokeWidth="3.5" opacity="0.85" />
              <circle cx="20" cy="20" r="3.5" fill="#4f46e5" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white">
              Collab<span className="text-indigo-500">Z</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">Enterprise Suite</p>
          </div>
        </div>

        {/* Vertical Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {[
            { id: 'overview', label: 'Overview', icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            )},

            { id: 'chat', label: 'Chat Workspace', icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379L12 21l2.62-3.132c1.154-.086 2.296-.213 3.423-.379 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
            )},
            { id: 'meet', label: 'Meet Hub', icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.51 18h11.25a2.25 2.25 0 0 0 2.25-2.25V8.25A2.25 2.25 0 0 0 15.76 6H4.51a2.25 2.25 0 0 0-2.25 2.25v7.5A2.25 2.25 0 0 0 4.51 18Z" />
              </svg>
            )},
            { id: 'canvas', label: 'Whiteboard', icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
            )},
            { id: 'fileshare', label: 'File Share', icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
            )},
            { id: 'contacts', label: 'Contacts Directory', icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            )}
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => navigateToView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl transition-all relative ${
                currentView === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {item.icon}
              {item.label}
              {currentView === item.id && (
                <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          ))}
        </nav>

        {/* User Card at Sidebar Bottom */}
        <div className="p-4 border-t border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-505 to-purple-505 border border-indigo-400/20 flex items-center justify-center font-extrabold text-sm text-white select-none">
            Y
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-slate-200 truncate select-text">Yashwantika G.</h4>
            <p className="text-[10px] text-slate-500 font-medium truncate select-text">yashwantikag@gmail.com</p>
          </div>
        </div>
      </aside>

      {/* --- Dynamic Content Area (Right-hand Side) --- */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0b0f19]">
        
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/10 px-6 flex items-center justify-between flex-shrink-0 relative">
          <div className="flex items-center gap-3 select-none">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {currentView === 'overview' && 'Workspace Overview'}
              {currentView === 'chat' && 'Chat Workspace'}
              {currentView === 'meet' && (activeRoomId ? `Active Meeting • ${activeRoomId}` : 'Meet Hub')}
              {currentView === 'canvas' && 'Interactive Whiteboard'}
              {currentView === 'fileshare' && 'Secure File Vault'}
              {currentView === 'contacts' && 'Contacts Directory'}
            </h2>
            {currentView === 'canvas' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"></span>
                LIVE SYNC
              </span>
            )}
          </div>

          {/* Connected indicators */}
          <div className="flex items-center gap-4 select-none">
            <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800/80 px-3 py-1.5 rounded-xl text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Connected: US-East-1 (12ms)</span>
            </div>
            
            {/* Reward Center */}
            <div className="relative">
              <button
                onClick={() => setShowRewardPopover(!showRewardPopover)}
                className={`p-2 rounded-lg border transition-all flex items-center justify-center gap-1.5 shadow-lg ${showRewardPopover ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 shadow-amber-500/5'}`}
                title="Reward Center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25 2.25 12l9.75 9.75 9.75-9.75L12 2.25Z" />
                </svg>
                <span className="hidden sm:inline text-[10px] font-bold font-mono">+50 XP</span>
              </button>

              {showRewardPopover && (
                <div className="absolute right-0 mt-2.5 w-64 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-30 select-text animate-[fadeIn_0.2s_ease-out]">
                  <div className="flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-amber-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25 2.25 12l9.75 9.75 9.75-9.75L12 2.25Z" />
                    </svg>
                    <h4 className="text-xs font-bold text-slate-200">CollabZ Reward Center</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal mb-3">
                    Unlock features to earn rewards <span className="text-amber-400 font-semibold font-mono">+50 XP</span>. Create shapes, start video calls, or invite peers to earn rewards.
                  </p>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 rounded-full" style={{ width: '20%' }}></div>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-500 font-mono">
                    <span>1/5 TASKS DONE</span>
                    <span>20% COMPLETE</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Display Area */}
        <div className="flex-1 overflow-hidden relative">
          {/* 1. Overview Dashboard */}
          {currentView === 'overview' && renderOverviewView()}

          {/* 1.5. Chat Workspace */}
          {currentView === 'chat' && <ChatWorkspace socket={socketRef.current} userName="Yashwantika G." />}

          {/* 2. Meet View */}
          {currentView === 'meet' && renderMeetView()}

          {/* 3. Canvas */}
          {currentView === 'canvas' && renderCanvasView()}

          {/* 4. File Share */}
          {currentView === 'fileshare' && renderFileShareView()}

          {/* 5. Contacts Directory */}
          {currentView === 'contacts' && <ContactsDirectory />}
        </div>

      </div>

    </div>
  )
}
