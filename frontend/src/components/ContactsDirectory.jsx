import { useState } from 'react'

export default function ContactsDirectory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [syncStatus, setSyncStatus] = useState('Local Fallback Mode')
  
  // Default fallback mock database
  const [contacts, setContacts] = useState([
    { id: '1', name: 'Alex Rivera', email: 'alex.rivera@collabz.io', phone: '+1 (555) 019-2831', role: 'Systems Architect', avatar: 'AR', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
    { id: '2', name: 'Sarah Jenkins', email: 'sarah.j@collabz.io', phone: '+1 (555) 014-9982', role: 'UI/UX Design Lead', avatar: 'SJ', color: 'bg-pink-500/10 text-pink-400 border border-pink-500/20' },
    { id: '3', name: 'Yashwantika G.', email: 'yashwantikag@gmail.com', phone: '+1 (555) 012-2412', role: 'Full Stack Engineer', avatar: 'YG', color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' }
  ])

  // Sync using Web Contact Picker API
  const handleSyncContacts = async () => {
    const isSupported = ('contacts' in navigator && 'ContactsManager' in window)

    if (isSupported) {
      try {
        const props = ['name', 'email', 'tel']
        const opts = { multiple: true }
        
        // Trigger native device picker dialog
        const selected = await navigator.contacts.select(props, opts)
        
        if (selected && selected.length > 0) {
          const parsed = selected.map((contact, idx) => ({
            id: `device_${Date.now()}_${idx}`,
            name: contact.name?.[0] || 'Unknown Device Contact',
            email: contact.email?.[0] || 'N/A',
            phone: contact.tel?.[0] || 'N/A',
            role: 'Device Contact',
            avatar: (contact.name?.[0] || 'U').substring(0, 2).toUpperCase(),
            color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }))
          
          setContacts([...parsed, ...contacts])
          setSyncStatus('Successfully Synced Device Contacts')
        }
      } catch (err) {
        console.warn('Native Contact Picker cancelled or failed:', err)
        alert('Could not complete native contact sync. Loaded fallback contacts database instead.')
      }
    } else {
      // Mock API trigger simulator for desktop
      setSyncStatus('API Not Supported - Auto-Loaded Mock Database')
      alert('Web Contact Picker API is not supported on this device/browser. Simulation fallback active.')
    }
  }

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8 h-full overflow-y-auto space-y-8 select-text bg-[#0b0f19]">
      
      {/* Banner */}
      <div className="relative rounded-2xl border border-slate-800/80 bg-gradient-to-r from-indigo-950/20 via-slate-900 to-purple-950/20 p-8 overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500/5 blur-xl rounded-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-white">Contacts & Directory</h3>
            <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
              Sync contact records across devices or access the project-scoped enterprise team directory.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button 
              onClick={handleSyncContacts}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all active:scale-95 shadow-lg flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.656 48.656 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
              </svg>
              Sync Device Contacts
            </button>
          </div>
        </div>
      </div>

      {/* Directory Grid & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Contacts List ({filteredContacts.length})
            <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-500 px-2 py-0.5 rounded font-mono select-none">
              {syncStatus}
            </span>
          </h4>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search directory..."
            className="bg-slate-950/80 border border-slate-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500/80 placeholder-slate-650 w-full sm:w-64"
          />
        </div>

        {filteredContacts.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800/80 rounded-2xl bg-slate-900/5 select-none text-slate-500 text-xs">
            No contacts match the search filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContacts.map(contact => (
              <div key={contact.id} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/15 flex items-center gap-4 hover:border-slate-700/80 transition-all select-none">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${contact.color}`}>
                  {contact.avatar}
                </div>
                <div className="overflow-hidden space-y-0.5">
                  <h5 className="text-xs font-extrabold text-slate-200 truncate">{contact.name}</h5>
                  <p className="text-[10px] text-slate-400 truncate">{contact.role}</p>
                  <p className="text-[10px] font-mono text-slate-500 truncate">{contact.email}</p>
                  <p className="text-[10px] font-mono text-slate-500 truncate">{contact.phone}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
