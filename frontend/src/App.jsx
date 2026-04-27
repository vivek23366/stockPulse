import { useState, useEffect, useCallback } from 'react'
import Navbar from './components/Navbar'
import StockSearch from './components/StockSearch'
import CompareTable from './components/CompareTable'
import MarketPulse from './components/MarketPulse'
import WatchMode from './components/WatchMode'
import PaperTrading from './components/PaperTrading'
import Toast from './components/Toast'
import LoginPage, { saveSession, clearSession } from './components/LoginPage'

const TABS = [
  { id: 'search',  label: 'Search',  icon: '🔍' },
  { id: 'compare', label: 'Compare', icon: '⚖️' },
  { id: 'pulse',   label: 'Pulse',   icon: '📡' },
  { id: 'watch',   label: 'Watch',   icon: '👁' },
  { id: 'trade',   label: 'Trade',   icon: '💼' },
]

/* ─── User avatar pill ─────────────────────────────────────── */
function UserPill({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.22)',
          borderRadius: 24, padding: '5px 14px 5px 8px',
          cursor: 'pointer', color: '#e2e8f0', fontSize: 13, fontWeight: 600,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,212,170,0.5)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,212,170,0.22)'}
      >
        <span style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg,#00d4aa,#6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>{user.avatar || '👤'}</span>
        {user.name}
        <span style={{ color: '#64748b', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'rgba(12,15,30,0.98)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, overflow: 'hidden', minWidth: 180,
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)', zIndex: 999,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono,monospace' }}>@{user.username}</div>
          </div>
          <button onClick={onLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '11px 16px', background: 'none', border: 'none',
            color: '#ff4d6d', fontSize: 13, cursor: 'pointer', textAlign: 'left',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,77,109,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            🚪 Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Session helpers ────────────────────────── */
const API = 'http://localhost:8000'

async function verifyToken(token) {
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return await res.json()  // returns user object
  } catch {
    return null
  }
}

/* ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [user, setUser]         = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [activeTab, setActiveTab] = useState('search')
  const [toast, setToast]       = useState(null)

  /* Restore session on mount — verify JWT with backend */
  useEffect(() => {
    const token = localStorage.getItem('sp_token')
    if (!token) { setAuthReady(true); return }
    verifyToken(token).then(user => {
      if (user) setUser(user)
      else clearSession()
      setAuthReady(true)
    })
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const handleLogin = (userData) => {
    setUser(userData)
    showToast(`Welcome back, ${userData.name}! 🎉`, 'success')
  }

  const handleLogout = () => {
    clearSession()
    setUser(null)
    setActiveTab('search')
    setToast(null)
  }

  /* Show nothing until auth state is resolved (avoids flash) */
  if (!authReady) return null

  /* Show login page if not authenticated */
  if (!user) return <LoginPage onLogin={handleLogin} />

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#080810' }}>
      {/* Navbar with user pill injected */}
      <div style={{ position: 'relative' }}>
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} tabs={TABS} />
        {/* User pill — absolutely positioned in top-right of navbar */}
        <div style={{ position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)', zIndex: 100 }}>
          <UserPill user={user} onLogout={handleLogout} />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-fade-in" key={activeTab}>
          {activeTab === 'search'  && <StockSearch showToast={showToast} />}
          {activeTab === 'compare' && <CompareTable showToast={showToast} />}
          {activeTab === 'pulse'   && <MarketPulse showToast={showToast} />}
          {activeTab === 'watch'   && <WatchMode showToast={showToast} />}
          {activeTab === 'trade'   && <PaperTrading showToast={showToast} />}
        </div>
      </main>

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}
    </div>
  )
}
