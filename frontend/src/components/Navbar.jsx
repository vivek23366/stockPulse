import { useState, useEffect } from 'react'

function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#334155' }}>
      {time}
    </span>
  )
}

export default function Navbar({ activeTab, onTabChange, tabs }) {
  return (
    <header style={{
      background: 'rgba(8,8,16,0.9)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg,#00d4aa,#00a3ff)',
            borderRadius: 9, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#080810',
          }}>S</div>
          <span className="gradient-text" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>
            StockPulse
          </span>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1">
          {tabs.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                id={`nav-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                style={{
                  padding: '5px 14px', borderRadius: 8, border: 'none',
                  cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 500,
                  fontFamily: 'Inter,sans-serif', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: active ? 'rgba(0,212,170,0.12)' : 'transparent',
                  color: active ? '#00d4aa' : '#64748b',
                  boxShadow: active ? 'inset 0 -2px 0 #00d4aa40' : 'none',
                }}
              >
                <span style={{ fontSize: 11 }}>{tab.icon}</span>
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Clock */}
        <LiveClock />
      </div>
    </header>
  )
}
