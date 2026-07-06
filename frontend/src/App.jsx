import { useState } from 'react'
import LandingPage from './components/LandingPage'
import AuthPage from './components/AuthPage'
import Dashboard from './components/Dashboard'

export default function App() {
  const [view, setView] = useState('landing') // 'landing', 'auth', or 'dashboard'

  if (view === 'landing') {
    return <LandingPage onNavigate={(nextView) => setView(nextView)} />
  }

  if (view === 'auth') {
    return (
      <AuthPage 
        onAuthSuccess={() => setView('dashboard')} 
        onBack={() => setView('landing')} 
      />
    )
  }

  return <Dashboard />
}
