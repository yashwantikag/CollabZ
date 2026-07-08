import { useState } from 'react'

export default function MeetHub({ 
  meetingLinks = [], 
  setMeetingLinks, 
  scheduledMeetings = [], 
  setScheduledMeetings, 
  onJoinMeeting,
  onStartLocalVideo
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
  
  // Create a Meeting Link
  const handleCreateMeetingLink = () => {
    const part1 = Math.random().toString(36).substring(2, 5)
    const part2 = Math.floor(1000 + Math.random() * 9000)
    const part3 = Math.random().toString(36).substring(2, 5)
    const randomCode = `${part1}-${part2}-${part3}`
    const fullUrl = `http://localhost:5173/meet/${randomCode}`
    
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
    const fullUrl = `http://localhost:5173/meet/${randomCode}`

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

  return (
    <div className="p-8 h-full overflow-y-auto space-y-8 select-text">
      
      {/* Glow welcome banner */}
      <div className="relative rounded-2xl border border-slate-800/80 bg-gradient-to-r from-indigo-950/20 via-slate-900 to-purple-950/20 p-8 overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500/5 blur-xl rounded-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-white">Video Meetings & Presentations</h3>
            <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
              Initiate instant video calls, schedule collaborative drawing sessions, share files securely, and present in split-screen Explain Mode.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button 
              onClick={() => setShowJoinModal(true)} 
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-xs font-bold text-slate-200 border border-slate-800 transition-all active:scale-95 shadow-md"
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
          className="p-6 rounded-2xl border border-slate-800/60 bg-slate-900/10 hover:bg-slate-900/20 transition-all cursor-pointer group hover:border-indigo-500/50 flex flex-col justify-between h-44 select-none relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-all duration-300 blur-xl rounded-2xl"></div>
          <div className="flex items-center justify-between z-10">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Instant</span>
          </div>
          <div className="space-y-1.5 z-10">
            <h4 className="text-sm font-bold text-slate-100">Create a meeting link</h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              Generate a unique workspace link to share with colleagues for instant connection.
            </p>
          </div>
        </div>

        {/* Schedule Card */}
        <div 
          onClick={() => setShowScheduleModal(true)}
          className="p-6 rounded-2xl border border-slate-800/60 bg-slate-900/10 hover:bg-slate-900/20 transition-all cursor-pointer group hover:border-emerald-500/50 flex flex-col justify-between h-44 select-none relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-all duration-300 blur-xl rounded-2xl"></div>
          <div className="flex items-center justify-between z-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Calendar</span>
          </div>
          <div className="space-y-1.5 z-10">
            <h4 className="text-sm font-bold text-slate-100">Schedule a meeting</h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              Book a meeting for later and add it directly to your scheduled synchronization list.
            </p>
          </div>
        </div>

        {/* Join by ID Card */}
        <div 
          onClick={() => setShowJoinModal(true)}
          className="p-6 rounded-2xl border border-slate-800/60 bg-slate-900/10 hover:bg-slate-900/20 transition-all cursor-pointer group hover:border-purple-500/50 flex flex-col justify-between h-44 select-none relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/5 transition-all duration-300 blur-xl rounded-2xl"></div>
          <div className="flex items-center justify-between z-10">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Access</span>
          </div>
          <div className="space-y-1.5 z-10">
            <h4 className="text-sm font-bold text-slate-100">Join with a meeting ID</h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              Enter an existing meeting ID or room code to participate in an active collaboration.
            </p>
          </div>
        </div>

      </div>

      {/* Meeting Links Section */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          Generated Meeting Links
        </h4>

        {meetingLinks.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800/80 rounded-2xl bg-slate-900/5 select-none text-slate-500 text-xs">
            No meeting links created yet. Click "Create a meeting link" above to start.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meetingLinks.map(link => (
              <div key={link.id} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/15 flex flex-col justify-between space-y-4 hover:border-slate-700/80 transition-all relative">
                
                {/* Dismiss (Delete) Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMeetingLinks(meetingLinks.filter(l => l.id !== link.id))
                  }}
                  className="absolute top-4 right-4 text-slate-500 hover:text-rose-400 transition-all p-1 hover:bg-rose-500/10 rounded-lg"
                  title="Delete Link"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="space-y-1 pr-6">
                  <span className="text-[9px] text-slate-500 font-mono block">{link.createdAt}</span>
                  <h5 className="text-xs font-bold text-slate-200">{link.name}</h5>
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-2 py-0.5 rounded inline-block mt-1 select-all break-all">
                    {link.url || `http://localhost:5173/meet/${link.code}`}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 pt-2 border-t border-slate-900/60">
                  <button 
                    onClick={() => onJoinMeeting(link.code)}
                    className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-[10px] uppercase transition-all shadow-md"
                  >
                    Join
                  </button>
                  <button 
                    onClick={() => copyToClipboard(link.url || `http://localhost:5173/meet/${link.code}`)}
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-slate-200 text-slate-400 transition-all active:scale-95 flex items-center justify-center"
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
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Scheduled Meetings Tracking
        </h4>

        {scheduledMeetings.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800/80 rounded-2xl bg-slate-900/5 select-none text-slate-500 text-xs">
            No scheduled meetings tracked. Click "Schedule a meeting" to book a future sync.
          </div>
        ) : (
          <div className="border border-slate-800/80 bg-slate-900/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
                    <th className="py-4 px-6">Meeting Details</th>
                    <th className="py-4 px-6">Scheduled Date</th>
                    <th className="py-4 px-6">Secure Link</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {scheduledMeetings.map(meet => (
                    <tr key={meet.id} className="hover:bg-slate-900/20 text-xs text-slate-300 transition-all">
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-200 block">{meet.name}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{meet.description}</span>
                      </td>
                      <td className="py-4 px-6 font-mono text-[11px]">
                        {meet.date} • {meet.time}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-indigo-400 px-2 py-0.5 bg-indigo-500/5 border border-indigo-500/10 rounded text-[10px] select-all break-all">
                          {meet.url || `http://localhost:5173/meet/${meet.code}`}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => onJoinMeeting(meet.code)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-[10px] uppercase transition-all shadow-md"
                          >
                            Start
                          </button>
                          <button
                            onClick={() => copyToClipboard(meet.url || `http://localhost:5173/meet/${meet.code}`)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all flex items-center justify-center"
                            title="Copy Share Link"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setScheduledMeetings(scheduledMeetings.filter(m => m.id !== meet.id))}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-850 hover:bg-rose-500/10 text-rose-400 hover:text-rose-350 active:scale-95 transition-all flex items-center justify-center"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative animate-[scaleIn_0.18s_ease-out]">
            <button 
              onClick={() => setShowScheduleModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider select-none">Schedule Synchronization</h3>
            
            <form onSubmit={handleScheduleMeeting} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Meeting Name</label>
                <input 
                  type="text" 
                  value={schedName}
                  onChange={(e) => setSchedName(e.target.value)}
                  placeholder="e.g. Design Sync & Whiteboarding"
                  className="w-full bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-800 text-slate-200 focus:border-indigo-500 focus:outline-none"
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
                    className="w-full bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-800 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Time</label>
                  <input 
                    type="time" 
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    className="w-full bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-800 text-slate-200 focus:border-indigo-500 focus:outline-none"
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
                  className="w-full h-20 bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-800 text-slate-200 focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs uppercase transition-all shadow-lg shadow-emerald-600/10"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative animate-[scaleIn_0.18s_ease-out]">
            <button 
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider select-none">Join Meeting</h3>
            
            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Enter Meeting ID / Secure URL</label>
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. xxx-yyyy-zzz or full link"
                  className="w-full bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-800 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs uppercase transition-all shadow-lg shadow-indigo-600/10"
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
