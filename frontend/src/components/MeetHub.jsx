import { useState, useRef, useEffect } from 'react'
import Whiteboard from './Whiteboard'
import FileShare from './FileShare'

export default function MeetHub({ 
  roomID, // activeRoomId from Dashboard
  localStream,
  peerConnection,
  meetingLinks = [], 
  setMeetingLinks, 
  scheduledMeetings = [], 
  setScheduledMeetings, 
  onJoinMeeting,
  onLeaveMeeting,
  onStartLocalVideo,
  localVideoRef,
  remoteVideoRef,
  remoteStream,
  isVideoOn,
  setIsVideoOn,
  isMuted,
  setIsMuted,
  showCallWhiteboard,
  setShowCallWhiteboard,
  showCallFiles,
  setShowCallFiles,
  socket,
  wbHistory,
  setWbHistory,
  wbHistoryIndex,
  setWbHistoryIndex,
  isExplainMode,
  setIsExplainMode,
  explainModeSpeaker,
  meetingFiles,
  setMeetingFiles
}) {
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  
  // Schedule Form State
  const [schedName, setSchedName] = useState('')
  const [schedDate, setSchedDate] = useState('')
  const [schedTime, setSchedTime] = useState('')
  const [schedDesc, setSchedDesc] = useState('')
  
  // Join Form State
  const [joinCode, setJoinCode] = useState('')

  // Copy State for active session
  const [copied, setCopied] = useState(false)

  // Local video DOM element reference
  const localVideoElRef = useRef(null)
  
  // Refs to avoid stale closures in event callbacks
  const localStreamPropsRef = useRef(localStream)
  const peerConnectionPropsRef = useRef(peerConnection)
  const screenTrackRef = useRef(null)

  useEffect(() => {
    localStreamPropsRef.current = localStream
  }, [localStream])

  useEffect(() => {
    peerConnectionPropsRef.current = peerConnection
  }, [peerConnection])

  // Clean up screen share track on unmount
  useEffect(() => {
    return () => {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop()
      }
    }
  }, [])

  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const track = stream.getVideoTracks()[0]
      screenTrackRef.current = track

      // Handle native browser "Stop Sharing" button click
      track.onended = () => {
        stopScreenShare()
      }

      // Replace track on RTCPeerConnection sender
      const pc = peerConnectionPropsRef.current
      if (pc) {
        const senders = pc.getSenders()
        const videoSender = senders.find(s => s.track && s.track.kind === 'video')
        if (videoSender) {
          await videoSender.replaceTrack(track)
          console.log("[ScreenShare] Replaced webcam track with screen track on peer connection")
        }
      }

      // Update local preview DOM element
      if (localVideoElRef.current) {
        localVideoElRef.current.srcObject = stream
      }

      setIsScreenSharing(true)
    } catch (err) {
      console.error("[ScreenShare] Failed to start screen share:", err)
    }
  }

  const stopScreenShare = async () => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop()
      screenTrackRef.current = null
    }

    const pc = peerConnectionPropsRef.current
    const localStreamObj = localStreamPropsRef.current
    const webcamTrack = localStreamObj ? localStreamObj.getVideoTracks()[0] : null

    // Restore webcam track on RTCPeerConnection sender
    if (pc && webcamTrack) {
      const senders = pc.getSenders()
      const videoSender = senders.find(s => s.track && s.track.kind === 'video')
      if (videoSender) {
        try {
          await videoSender.replaceTrack(webcamTrack)
          console.log("[ScreenShare] Replaced screen track back with webcam track on peer connection")
        } catch (err) {
          console.error("[ScreenShare] Failed to restore webcam track on peer connection:", err)
        }
      }
    }

    // Restore local video preview element
    if (localVideoElRef.current && localStreamObj) {
      localVideoElRef.current.srcObject = localStreamObj
    }

    setIsScreenSharing(false)
  }

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare()
    } else {
      await startScreenShare()
    }
  }
  
  // Create a Meeting Link
  const handleCreateMeetingLink = () => {
    const part1 = Math.random().toString(36).substring(2, 5)
    const part2 = Math.floor(1000 + Math.random() * 9000)
    const part3 = Math.random().toString(36).substring(2, 5)
    const randomCode = `${part1}-${part2}-${part3}`
    const fullUrl = `${window.location.origin}/meet/${randomCode}`
    
    const newLink = {
      id: `meet_${Date.now()}`,
      name: `Sync Session ${meetingLinks.length + 1}`,
      code: randomCode,
      url: fullUrl,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }
    
    setMeetingLinks([newLink, ...meetingLinks])
    if (onStartLocalVideo) {
      onStartLocalVideo()
    }
  }

  // Schedule a Meeting
  const handleScheduleMeeting = (e) => {
    e.preventDefault()
    if (!schedName || !schedDate || !schedTime) return

    const part1 = Math.random().toString(36).substring(2, 5)
    const part2 = Math.floor(1000 + Math.random() * 9000)
    const part3 = Math.random().toString(36).substring(2, 5)
    const randomCode = `${part1}-${part2}-${part3}`
    const fullUrl = `${window.location.origin}/meet/${randomCode}`

    const newSched = {
      id: `sched_${Date.now()}`,
      name: schedName,
      date: schedDate,
      time: schedTime,
      description: schedDesc || 'Project sync session',
      code: randomCode,
      url: fullUrl
    }

    setScheduledMeetings([newSched, ...scheduledMeetings])
    
    // Reset form
    setSchedName('')
    setSchedDate('')
    setSchedTime('')
    setSchedDesc('')
    setShowScheduleModal(false)
  }

  // Join by Code/URL
  const handleJoinByCode = (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    
    // Extract code if user pasted full URL
    let cleanCode = joinCode.trim()
    if (cleanCode.includes('/meet/')) {
      cleanCode = cleanCode.split('/meet/').pop()
    }

    onJoinMeeting(cleanCode)
    setJoinCode('')
    setShowJoinModal(false)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert(`Copied secure link: ${text}`)
  }

  // Copy Active Room Invite Link
  const handleCopyInvite = () => {
    const professionalMeetingLink = `${window.location.origin}/meet/${roomID}`;
    const inviteText = `Yashwantika G. is inviting you to a secure corporate session on CollabZ.\nMeeting ID: ${roomID}\nJoin Link: ${professionalMeetingLink}`;
    
    navigator.clipboard.writeText(inviteText)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err)
      })
  }

  // If we are in an active session, render the active call view
  if (roomID) {
    return (
      <div className="flex h-full w-full bg-brandBg overflow-hidden select-text relative">
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
          
          {/* Active meeting header */}
          <div className="h-14 px-6 border-b border-slate-800 bg-brandCard/40 flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-brandPrimary animate-pulse"></span>
              <h3 className="text-xs font-bold text-brandText uppercase tracking-wider">
                Sync Room: <span className="font-mono text-brandPrimary font-bold">{roomID}</span>
              </h3>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500 font-mono">00:14:32</span>
              {isExplainMode && (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/20 uppercase animate-pulse">
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
                <div className="rounded-2xl border border-slate-800 bg-brandBg overflow-hidden relative flex flex-col justify-center items-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-brandPrimary/10 to-transparent"></div>
                  <div className="text-center p-6 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-brandPrimary/25 border-2 border-brandPrimary text-white flex items-center justify-center font-bold text-lg mx-auto shadow-2xl animate-pulse">
                      {explainModeSpeaker ? explainModeSpeaker.split(' ').map(n => n[0]).join('') : 'SP'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-brandText block">{explainModeSpeaker} (Presenter)</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-1 block">Broadcasting Live Media Stream</span>
                    </div>
                  </div>
                  
                  <span className="absolute bottom-4 left-4 flex items-center gap-2 text-[10px] bg-brandCard/90 px-2 py-1 rounded font-mono text-slate-400 border border-slate-800">
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brandPrimary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brandPrimary"></span>
                    </span>
                    Audio Stream Active
                  </span>
                </div>

                {/* Shared Whiteboard Canvas */}
                <div className="rounded-2xl border border-slate-800 overflow-hidden relative">
                  <Whiteboard 
                    socket={socket}
                    roomId={roomID}
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
                        <div className="rounded-xl border border-slate-800 bg-brandCard overflow-hidden relative flex flex-col justify-center items-center min-h-[120px] max-h-[180px]">
                          <video
                            ref={(el) => {
                              if (localVideoRef) localVideoRef(el);
                              localVideoElRef.current = el;
                            }}
                            muted
                            autoPlay
                            playsInline
                            className={`w-full h-full object-cover ${isVideoOn ? '' : 'hidden'}`}
                          />
                          {!isVideoOn && (
                            <div className="text-center p-3 select-none">
                              <div className="w-8 h-8 rounded-full bg-brandBg text-slate-500 border border-slate-800 flex items-center justify-center font-bold text-xs mx-auto mb-1">Y</div>
                              <span className="text-[9px] text-slate-550 font-medium block text-slate-500">Camera Off</span>
                            </div>
                          )}
                          <span className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-400 bg-brandBg/90 border border-slate-800 px-1.5 py-0.5 rounded">You</span>
                          <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isMuted ? 'bg-rose-500' : 'bg-brandPrimary'}`}></span>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-brandCard overflow-hidden relative flex flex-col justify-center items-center min-h-[120px] max-h-[180px]">
                          {remoteStream ? (
                            <video
                              ref={remoteVideoRef}
                              autoPlay
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-brandBg flex items-center justify-center relative select-none">
                              <div className="absolute inset-0 bg-gradient-to-br from-brandPrimary/10 to-transparent"></div>
                              <div className="w-10 h-10 rounded-full bg-brandPrimary/20 border border-brandPrimary/30 text-brandPrimary flex items-center justify-center font-bold text-sm">SJ</div>
                              <span className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-400 bg-brandCard/90 border border-slate-800 px-1.5 py-0.5 rounded">Sarah Jenkins</span>
                              <span className="absolute top-2 right-2 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brandSuccess opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-brandSuccess"></span>
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-brandCard overflow-hidden relative flex flex-col justify-center items-center min-h-[120px] max-h-[180px]">
                          <div className="w-full h-full bg-brandBg flex items-center justify-center relative select-none">
                            <div className="absolute inset-0 bg-gradient-to-br from-brandPrimary/5 to-transparent"></div>
                            <div className="w-10 h-10 rounded-full bg-brandCard border border-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm">AR</div>
                            <span className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-400 bg-brandCard/90 border border-slate-800 px-1.5 py-0.5 rounded">Alex Rivera</span>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-2 rounded-2xl border border-slate-800 overflow-hidden relative min-h-[250px]">
                        <Whiteboard 
                          socket={socket}
                          roomId={roomID}
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
                    <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                      {/* Flexible larger responsive container for remote participant */}
                      <div className="flex-1 rounded-2xl border border-slate-800 bg-brandCard overflow-hidden relative flex items-center justify-center min-h-[300px]">
                        {remoteStream ? (
                          <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-6 space-y-4 select-none z-10">
                            <div className="w-16 h-16 rounded-full bg-brandBg border border-slate-800 text-brandPrimary flex items-center justify-center font-bold text-lg mx-auto shadow-xl animate-pulse">
                              SJ
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-brandText block">Sarah Jenkins (Remote Partner)</span>
                              <span className="text-[10px] text-slate-500 font-mono block">Waiting for remote user stream track...</span>
                            </div>
                          </div>
                        )}

                        {/* Small floating corner tile for local participant */}
                        <div className="absolute bottom-4 right-4 w-40 h-28 sm:w-48 sm:h-36 rounded-xl border border-slate-800 bg-brandBg shadow-2xl overflow-hidden z-20 transition-all duration-300 hover:scale-105">
                          <video
                            ref={(el) => {
                              if (localVideoRef) localVideoRef(el);
                              localVideoElRef.current = el;
                            }}
                            muted
                            autoPlay
                            playsInline
                            className={`w-full h-full object-cover ${isVideoOn ? '' : 'hidden'}`}
                          />
                          {!isVideoOn && (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-brandCard select-none">
                              <div className="w-8 h-8 rounded-full bg-brandBg border border-slate-800 text-slate-500 flex items-center justify-center font-bold text-xs">Y</div>
                              <span className="text-[9px] text-slate-550 mt-1 block text-slate-500">Camera Off</span>
                            </div>
                          )}
                          <span className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-350 bg-brandBg/90 border border-slate-800 px-1.5 py-0.5 rounded">You</span>
                          <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isMuted ? 'bg-rose-500' : 'bg-brandPrimary'}`}></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {showCallFiles && (
                  <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4 overflow-hidden border-t lg:border-t-0 lg:border-l border-slate-800 pl-0 lg:pl-6 pt-6 lg:pt-0">
                    <FileShare 
                      socket={socket}
                      roomId={roomID}
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
          <div className="h-20 bg-brandCard border-t border-slate-800 px-8 flex items-center justify-between select-none z-20">
            {/* Styled professional copy invite container */}
            <div className="flex items-center gap-3 bg-brandBg border border-slate-800 rounded-xl px-3 py-1.5 shadow-sm hover:border-slate-700/50 transition-all select-none">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brandPrimary animate-pulse"></span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wide">
                  Room ID: <span className="text-brandPrimary font-bold">{roomID}</span>
                </span>
              </div>
              
              <div className="h-4 w-px bg-slate-800"></div>

              <button
                onClick={handleCopyInvite}
                className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-brandText font-bold transition-all duration-200 active:scale-95 focus:outline-none"
                title="Copy structured invite text to clipboard"
              >
                {copied ? (
                  <span className="text-brandSuccess flex items-center gap-1 transition-all duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                    Copied! ✓
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 group">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-350 transition-colors">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z" />
                    </svg>
                    Copy Invite
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3.5 rounded-xl border transition-all active:scale-95 shadow-md ${
                  isMuted 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                    : 'bg-brandCard border border-slate-800 text-slate-300 hover:bg-slate-800'
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
                    : 'bg-brandCard border border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
                title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                </svg>
              </button>

              <button
                onClick={toggleScreenShare}
                className={`p-3.5 rounded-xl border transition-all active:scale-95 shadow-md ${
                  isScreenSharing 
                    ? 'bg-brandPrimary text-brandBg border-brandPrimary shadow-brandPrimary/10' 
                    : 'bg-brandCard border border-slate-800 text-slate-450 hover:text-brandText hover:bg-slate-800'
                }`}
                title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                </svg>
              </button>

              {!isExplainMode && (
                <button
                  onClick={() => setShowCallWhiteboard(!showCallWhiteboard)}
                  className={`p-3.5 rounded-xl border transition-all active:scale-95 shadow-md ${
                    showCallWhiteboard 
                      ? 'bg-brandPrimary text-brandBg border-brandPrimary' 
                      : 'bg-brandCard border border-slate-800 text-slate-400 hover:text-brandText hover:bg-slate-800'
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
                    ? 'bg-brandPrimary text-brandBg border-brandPrimary' 
                    : 'bg-brandCard border border-slate-800 text-slate-400 hover:text-brandText hover:bg-slate-800'
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
                onClick={onLeaveMeeting}
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

  // Lobby rendering when not in an active roomID
  return (
    <div className="p-8 h-full overflow-y-auto space-y-8 select-text bg-brandBg">
      
      {/* Glow welcome banner */}
      <div className="relative rounded-2xl border border-slate-800/80 bg-gradient-to-r from-brandPrimary/5 via-brandCard to-brandSuccess/5 p-8 overflow-hidden">
        <div className="absolute inset-0 bg-brandPrimary/5 blur-xl rounded-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-brandText animate-pulse">Video Meetings & Presentations</h3>
            <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
              Initiate instant video calls, schedule collaborative drawing sessions, share files securely, and present in split-screen Explain Mode.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button 
              onClick={() => setShowJoinModal(true)} 
              className="px-4 py-2.5 rounded-xl bg-brandCard hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-800 transition-all active:scale-95 shadow-md"
            >
              Join with Code
            </button>
          </div>
        </div>
      </div>

      {/* Main Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Create Link Card */}
        <div 
          onClick={handleCreateMeetingLink}
          className="p-6 rounded-2xl border border-slate-800/60 bg-brandCard/30 hover:bg-brandCard/60 transition-all cursor-pointer group hover:border-brandPrimary/50 flex flex-col justify-between h-44 select-none relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-brandPrimary/0 group-hover:bg-brandPrimary/5 transition-all duration-300 blur-xl rounded-2xl"></div>
          <div className="flex items-center justify-between z-10">
            <div className="w-10 h-10 rounded-xl bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/20 flex items-center justify-center text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-brandPrimary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Instant</span>
          </div>
          <div className="space-y-1.5 z-10">
            <h4 className="text-sm font-bold text-brandText">Create a meeting link</h4>
            <p className="text-[11px] text-slate-450 leading-normal text-slate-400">
              Generate a unique workspace link to share with colleagues for instant connection.
            </p>
          </div>
        </div>

        {/* Schedule Card */}
        <div 
          onClick={() => setShowScheduleModal(true)}
          className="p-6 rounded-2xl border border-slate-800/60 bg-brandCard/30 hover:bg-brandCard/60 transition-all cursor-pointer group hover:border-brandSuccess/50 flex flex-col justify-between h-44 select-none relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-brandSuccess/0 group-hover:bg-brandSuccess/5 transition-all duration-300 blur-xl rounded-2xl"></div>
          <div className="flex items-center justify-between z-10">
            <div className="w-10 h-10 rounded-xl bg-brandSuccess/10 text-brandSuccess border border-brandSuccess/20 flex items-center justify-center text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-brandSuccess uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Calendar</span>
          </div>
          <div className="space-y-1.5 z-10">
            <h4 className="text-sm font-bold text-brandText">Schedule a meeting</h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              Book a meeting for later and add it directly to your scheduled synchronization list.
            </p>
          </div>
        </div>

        {/* Join by ID Card */}
        <div 
          onClick={() => setShowJoinModal(true)}
          className="p-6 rounded-2xl border border-slate-800/60 bg-brandCard/30 hover:bg-brandCard/60 transition-all cursor-pointer group hover:border-brandPrimary/50 flex flex-col justify-between h-44 select-none relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-brandPrimary/0 group-hover:bg-brandPrimary/5 transition-all duration-300 blur-xl rounded-2xl"></div>
          <div className="flex items-center justify-between z-10">
            <div className="w-10 h-10 rounded-xl bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/20 flex items-center justify-center text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-brandPrimary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Access</span>
          </div>
          <div className="space-y-1.5 z-10">
            <h4 className="text-sm font-bold text-brandText">Join with a meeting ID</h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              Enter an existing meeting ID or room code to participate in an active collaboration.
            </p>
          </div>
        </div>

      </div>

      {/* Meeting Links Section */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brandPrimary"></span>
          Generated Meeting Links
        </h4>

        {meetingLinks.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800/80 rounded-2xl bg-brandCard/20 select-none text-slate-500 text-xs">
            No meeting links created yet. Click "Create a meeting link" above to start.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meetingLinks.map(link => (
              <div key={link.id} className="p-5 rounded-2xl border border-slate-800 bg-brandCard/40 flex flex-col justify-between space-y-4 hover:border-brandPrimary/50 transition-all relative">
                
                {/* Dismiss (Delete) Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMeetingLinks(meetingLinks.filter(l => l.id !== link.id))
                  }}
                  className="absolute top-4 right-4 text-slate-500 hover:text-rose-450 transition-all p-1 hover:bg-rose-500/10 rounded-lg"
                  title="Delete Link"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="space-y-1 pr-6">
                  <span className="text-[9px] text-slate-500 font-mono block">{link.createdAt}</span>
                  <h5 className="text-xs font-bold text-brandText">{link.name}</h5>
                  <span className="text-[10px] font-mono text-brandPrimary bg-brandPrimary/5 border border-brandPrimary/10 px-2 py-0.5 rounded inline-block mt-1 select-all break-all">
                    {link.url || `${window.location.origin}/meet/${link.code}`}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                  <button 
                    onClick={() => onJoinMeeting(link.code)}
                    className="flex-1 py-2 rounded-lg bg-brandPrimary hover:bg-brandPrimary/90 active:scale-95 text-brandBg font-bold text-[10px] uppercase transition-all shadow-md"
                  >
                    Join
                  </button>
                  <button 
                    onClick={() => copyToClipboard(link.url || `${window.location.origin}/meet/${link.code}`)}
                    className="px-3 py-2 rounded-lg bg-brandCard border border-slate-800 hover:bg-slate-800 hover:text-brandText text-slate-400 transition-all active:scale-95 flex items-center justify-center"
                    title="Copy Share Link"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scheduled Meetings Tracker */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brandSuccess"></span>
          Scheduled Meetings Tracking
        </h4>

        {scheduledMeetings.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800/80 rounded-2xl bg-brandCard/25 select-none text-slate-500 text-xs">
            No scheduled meetings tracked. Click "Schedule a meeting" to book a future sync.
          </div>
        ) : (
          <div className="border border-slate-800/80 bg-brandCard/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-brandCard/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
                    <th className="py-4 px-6">Meeting Details</th>
                    <th className="py-4 px-6">Scheduled Date</th>
                    <th className="py-4 px-6">Secure Link</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {scheduledMeetings.map(meet => (
                    <tr key={meet.id} className="hover:bg-brandCard/30 text-xs text-slate-300 transition-all">
                      <td className="py-4 px-6">
                        <span className="font-bold text-brandText block">{meet.name}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{meet.description}</span>
                      </td>
                      <td className="py-4 px-6 font-mono text-[11px]">
                        {meet.date} • {meet.time}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-brandPrimary px-2 py-0.5 bg-brandPrimary/5 border border-brandPrimary/10 rounded text-[10px] select-all break-all">
                          {meet.url || `${window.location.origin}/meet/${meet.code}`}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => onJoinMeeting(meet.code)}
                            className="px-3.5 py-1.5 rounded-lg bg-brandSuccess text-brandBg font-bold text-[10px] uppercase transition-all shadow-md"
                          >
                            Start
                          </button>
                          <button
                            onClick={() => copyToClipboard(meet.url || `${window.location.origin}/meet/${meet.code}`)}
                            className="p-1.5 rounded-lg bg-brandCard border border-slate-800 text-slate-400 hover:text-brandText hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center"
                            title="Copy Share Link"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setScheduledMeetings(scheduledMeetings.filter(m => m.id !== meet.id))}
                            className="p-1.5 rounded-lg bg-brandCard border border-slate-800 hover:bg-rose-500/10 text-rose-400 hover:text-rose-350 active:scale-95 transition-all flex items-center justify-center"
                            title="Delete Schedule"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-brandCard border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative animate-[scaleIn_0.18s_ease-out]">
            <button 
              onClick={() => setShowScheduleModal(false)}
              className="absolute top-4 right-4 text-slate-555 hover:text-brandText"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-sm font-bold text-brandText uppercase tracking-wider select-none">Schedule Synchronization</h3>
            
            <form onSubmit={handleScheduleMeeting} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Meeting Name</label>
                <input 
                  type="text" 
                  value={schedName}
                  onChange={(e) => setSchedName(e.target.value)}
                  placeholder="e.g. Design Sync & Whiteboarding"
                  className="w-full bg-brandBg text-xs px-3.5 py-2.5 rounded-lg border border-slate-800 text-brandText focus:border-brandPrimary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Date</label>
                  <input 
                    type="date" 
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    className="w-full bg-brandBg text-xs px-3.5 py-2.5 rounded-lg border border-slate-800 text-brandText focus:border-brandPrimary focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Time</label>
                  <input 
                    type="time" 
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    className="w-full bg-brandBg text-xs px-3.5 py-2.5 rounded-lg border border-slate-800 text-brandText focus:border-brandPrimary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Description (Optional)</label>
                <textarea 
                  value={schedDesc}
                  onChange={(e) => setSchedDesc(e.target.value)}
                  placeholder="Brief agenda..."
                  className="w-full h-20 bg-brandBg text-xs px-3.5 py-2.5 rounded-lg border border-slate-800 text-brandText focus:border-brandPrimary focus:outline-none resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 rounded-xl bg-brandSuccess hover:bg-brandSuccess/90 text-brandBg font-bold text-xs uppercase transition-all shadow-lg shadow-brandSuccess/10"
              >
                Schedule Sync
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-brandCard border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative animate-[scaleIn_0.18s_ease-out]">
            <button 
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-brandText"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-sm font-bold text-brandText uppercase tracking-wider select-none">Join Meeting</h3>
            
            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Enter Meeting ID / Secure URL</label>
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. xxx-yyyy-zzz or full link"
                  className="w-full bg-brandBg text-xs px-3.5 py-2.5 rounded-lg border border-slate-800 text-brandText focus:border-brandPrimary focus:outline-none"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 rounded-xl bg-brandPrimary hover:bg-brandPrimary/90 active:scale-95 text-brandBg font-bold text-xs uppercase transition-all shadow-lg shadow-brandPrimary/10"
              >
                Join Sync
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
