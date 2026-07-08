import { useState, useEffect, useRef } from 'react'
import CryptoJS from 'crypto-js'
import { encryptData, decryptData } from '../utils/cryptoHelper'
import FileShare from './FileShare'

const SECRET_KEY = 'default-fallback-key-32chars-for-aes';
const SECRET_CHAT_KEY = "CollabZ_Secure_Vault_2026";

export default function ChatWorkspace({ socket, userName = 'Yashwantika G.' }) {
  const [conversations, setConversations] = useState([
    { id: 'global', name: 'Workspace Global', avatar: '🌐', status: 'Online', desc: 'Main team sync channel' },
    { id: 'alex', name: 'Alex Rivera', avatar: '👨‍💻', status: 'Online', desc: 'Systems Architect' },
    { id: 'sarah', name: 'Sarah Jenkins', avatar: '👩‍🎨', status: 'Away', desc: 'UI/UX Lead' }
  ])
  
  const [activeConvId, setActiveConvId] = useState('global')
  const [messages, setMessages] = useState({
    global: [
      { id: 1, user: 'Alex Rivera', text: 'Hey team, I set up the secure server bypass on Port 5000.', time: '13:51', avatarColor: 'bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/20' },
      { id: 2, user: 'Sarah Jenkins', text: 'Awesome! I am working on the whiteboard explain mode designs now.', time: '13:55', avatarColor: 'bg-brandSuccess/10 text-brandSuccess border border-brandSuccess/20' }
    ],
    alex: [
      { id: 3, user: 'Alex Rivera', text: 'Hi Yashwantika, did you check the latency metrics?', time: '12:10', avatarColor: 'bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/20' }
    ],
    sarah: [
      { id: 4, user: 'Sarah Jenkins', text: 'Can we align on the new sidebar layout later today?', time: '10:04', avatarColor: 'bg-brandSuccess/10 text-brandSuccess border border-brandSuccess/20' }
    ]
  })

  const [inputText, setInputText] = useState('')
  const [showFileModal, setShowFileModal] = useState(false)
  const [meetingFiles, setMeetingFiles] = useState([])
  const chatEndRef = useRef(null)

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeConvId])

  // Listen to socket messages
  useEffect(() => {
    if (!socket) return

    const handleIncomingMessage = async (encryptedPayload) => {
      try {
        let decryptedStr
        try {
          // Attempt CryptoJS decryption first
          const bytes = CryptoJS.AES.decrypt(encryptedPayload, SECRET_CHAT_KEY)
          decryptedStr = bytes.toString(CryptoJS.enc.Utf8)
          if (!decryptedStr) throw new Error("Empty decrypted string or invalid key")
        } catch (cryptoErr) {
          // Fall back to Web Crypto GCM decryption
          decryptedStr = await decryptData(encryptedPayload, SECRET_KEY)
        }

        const decMsg = JSON.parse(decryptedStr)

        // Make sure it matches format
        const formattedMsg = {
          id: decMsg.id || Date.now(),
          user: decMsg.user || 'Collaborator',
          text: decMsg.text,
          time: decMsg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatarColor: decMsg.avatarColor || 'bg-brandCard text-slate-400 border border-slate-800'
        }

        // Add to active thread or target channel
        const targetThread = decMsg.channelId || 'global'
        setMessages(prev => ({
          ...prev,
          [targetThread]: [...(prev[targetThread] || []), formattedMsg]
        }))
      } catch (err) {
        console.error('Failed to decrypt incoming chat message:', err)
      }
    }

    socket.on('receive-chat-message', handleIncomingMessage)
    return () => {
      socket.off('receive-chat-message', handleIncomingMessage)
    }
  }, [socket])

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if (!inputText.trim()) return

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const newMsg = {
      id: Date.now(),
      user: userName,
      text: inputText,
      time: timeString,
      self: true,
      channelId: activeConvId,
      avatarColor: 'bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/20'
    }

    // Append locally
    setMessages(prev => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMsg]
    }))
    setInputText('')

    // Emit encrypted via socket
    if (socket) {
      try {
        const plainText = JSON.stringify(newMsg)
        const encrypted = CryptoJS.AES.encrypt(plainText, SECRET_CHAT_KEY).toString()
        console.log("=== CRYPTO DEBUG ===");
        console.log("Original Plaintext:", newMsg.text);
        console.log("Encrypted Ciphertext (AES-256):", encrypted);
        socket.emit('new-chat-message', encrypted)
      } catch (err) {
        console.error('Encryption failed when sending chat:', err)
      }
    }
  }

  // File Share Attachment callback
  const handleFileAttached = (fileRecord) => {
    // Post a message in the chat that contains the file download details
    const fileMessage = `📁 [Shared File] ${fileRecord.name} (${(fileRecord.size / 1024).toFixed(1)} KB) - Securely encrypted. Click to access in File Share tab.`
    setInputText(fileMessage)
    setShowFileModal(false)
  }

  const activeMessages = messages[activeConvId] || []
  const activeConversation = conversations.find(c => c.id === activeConvId)

  return (
    <div className="flex h-full w-full bg-brandBg overflow-hidden select-text">
      
      {/* Left panel: Conversations List */}
      <aside className="w-80 border-r border-slate-800 bg-brandCard/40 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-800/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Direct Messages</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={`w-full flex items-start gap-3 p-3.5 rounded-xl text-left transition-all ${
                activeConvId === conv.id 
                  ? 'bg-brandPrimary/10 border border-brandPrimary/20 text-brandText shadow-lg shadow-brandPrimary/5' 
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-brandCard/50'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-brandCard border border-slate-800 flex items-center justify-center text-lg relative flex-shrink-0">
                {conv.avatar}
                {conv.status === 'Online' && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-brandSuccess border border-brandBg animate-pulse"></span>
                )}
              </div>
              <div className="overflow-hidden">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-brandText truncate">{conv.name}</h4>
                </div>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{conv.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Right panel: Active Thread Container */}
      <main className="flex-1 flex flex-col h-full bg-brandBg/60 relative">
        {/* Header */}
        <header className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between flex-shrink-0 select-none bg-brandCard/10">
          <div className="flex items-center gap-3">
            <span className="text-lg">{activeConversation?.avatar}</span>
            <div>
              <h4 className="text-xs font-bold text-brandText">{activeConversation?.name}</h4>
              <p className="text-[9px] text-slate-500 font-medium flex items-center gap-1.5">
                {activeConversation?.status === 'Online' ? 'Active Sync Room' : 'Away'}
                <span className="inline-flex items-center gap-0.5 text-brandSuccess font-semibold font-mono">
                  <span>•</span>
                  <span>🔒 End-to-End Encrypted (AES-256)</span>
                </span>
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowFileModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-brandCard border border-slate-800 hover:bg-slate-800 hover:text-brandText text-slate-400 text-[10px] font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5 text-brandPrimary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739 11.16 20.1a5.625 5.625 0 0 1-7.955-7.955l9.16-9.15a4 4 0 0 1 5.657 5.657l-8.2 8.2a2.25 2.25 0 0 1-3.18-3.18l7.25-7.25" />
            </svg>
            Attach File
          </button>
        </header>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeMessages.map((msg, index) => (
            <div 
              key={msg.id || index}
              className={`flex items-start gap-3.5 ${msg.self ? 'flex-row-reverse text-right' : ''} animate-[fadeIn_0.15s_ease-out]`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-[10px] select-none ${msg.avatarColor || 'bg-brandCard text-brandText border border-slate-800'}`}>
                {msg.user.substring(0, 1)}
              </div>
              <div className="max-w-[70%] space-y-1">
                <div className="flex items-center gap-2 justify-end flex-row">
                  <span className="text-[10px] font-bold text-slate-350">{msg.user}</span>
                  <span className="text-[8px] text-slate-500 font-mono">{msg.time}</span>
                </div>
                <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed border ${
                  msg.self 
                    ? 'bg-brandPrimary text-brandBg border-brandPrimary/80 font-medium shadow-md shadow-brandPrimary/5' 
                    : 'bg-brandCard/60 text-slate-300 border-slate-800/80'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Sticky Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-800/85 bg-brandCard/20 flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${activeConversation?.name}...`}
            className="flex-1 bg-brandBg border border-slate-800 text-xs px-4 py-3 rounded-xl text-brandText focus:outline-none focus:border-brandPrimary/60 placeholder-slate-600 shadow-inner"
          />
          <button
            type="submit"
            className="p-3 rounded-xl bg-brandPrimary hover:bg-brandPrimary/90 active:scale-95 text-brandBg font-bold transition-all shadow-lg shadow-brandPrimary/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </form>

        {/* File Attach Modal */}
        {showFileModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-brandCard border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative">
              <button 
                type="button"
                onClick={() => setShowFileModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-35"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>

              <h3 className="text-xs font-bold text-brandText uppercase tracking-wider select-none">Securely Upload & Attach File</h3>
              
              <FileShare 
                roomId="chat-attachment" 
                socket={socket} 
                files={meetingFiles} 
                setFiles={(updated) => {
                  setMeetingFiles(updated)
                  if (updated.length > 0) {
                    handleFileAttached(updated[0])
                  }
                }} 
              />
            </div>
          </div>
        )}

      </main>

    </div>
  )
}
