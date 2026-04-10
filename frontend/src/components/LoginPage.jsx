import { useState, useEffect, useRef } from 'react'

/* ─── Floating particle canvas ─────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.1,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy
        if (p.x < 0 || p.x > canvas.width)  p.dx *= -1
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,212,170,${p.alpha})`
        ctx.fill()
      })
      // Connect nearby
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const d = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y)
          if (d < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(0,212,170,${0.08 * (1 - d / 120)})`
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
}

/* ─── Ticker tape ──────────────────────────────────────────── */
const TICKERS = ['AAPL +1.2%', 'TSLA +3.4%', 'MSFT +0.8%', 'NVDA +5.1%', 'AMZN −0.4%', 'META +2.3%', 'GOOGL +1.1%', 'JPM +0.6%', 'BRK −0.2%', 'V +0.9%']
function TickerTape() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
      background: 'rgba(0,212,170,0.06)', borderBottom: '1px solid rgba(0,212,170,0.15)',
      overflow: 'hidden', height: 32,
    }}>
      <div style={{
        display: 'flex', gap: 48, whiteSpace: 'nowrap',
        animation: 'tickerScroll 22s linear infinite',
        paddingTop: 6,
      }}>
        {[...TICKERS, ...TICKERS].map((t, i) => {
          const isPos = t.includes('+')
          return (
            <span key={i} style={{
              fontSize: 12, fontWeight: 600,
              fontFamily: 'JetBrains Mono, monospace',
              color: isPos ? '#00d4aa' : '#ff4d6d',
            }}>{t}</span>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Input Field ──────────────────────────────────────────── */
function Field({ id, label, type, placeholder, value, onChange, icon, error }) {
  const [focused, setFocused] = useState(false)
  const [show, setShow]       = useState(false)
  const isPass = type === 'password'
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>{icon}</span>
        <input
          id={id}
          type={isPass && !show ? 'password' : 'text'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={isPass ? 'current-password' : 'off'}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: focused ? 'rgba(0,212,170,0.05)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${error ? '#ff4d6d' : focused ? 'rgba(0,212,170,0.5)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 10, padding: `12px 44px 12px 42px`,
            color: '#e2e8f0', fontSize: 14, outline: 'none',
            transition: 'all 0.2s',
            fontFamily: isPass ? 'JetBrains Mono,monospace' : 'inherit',
          }}
        />
        {isPass && (
          <button type="button" onClick={() => setShow(s => !s)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16 }}>
            {show ? '🙈' : '👁'}
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: 11, color: '#ff4d6d', marginTop: 5 }}>⚠ {error}</div>}
    </div>
  )
}

/* ─── Demo accounts ────────────────────────────────────────── */
const DEMO_USERS = [
  { username: 'demo',  password: 'demo123',  name: 'Demo User',  avatar: '📊' },
  { username: 'vivek', password: 'vivek123', name: 'Vivek',       avatar: '🚀' },
  { username: 'admin', password: 'admin123', name: 'Admin',       avatar: '⚡' },
]

/* ═══════════════════════════════════════════════════════════ */
export default function LoginPage({ onLogin }) {
  const [tab, setTab]           = useState('login')     // 'login' | 'register'
  const [form, setForm]         = useState({ username: '', email: '', password: '', confirmPwd: '', name: '' })
  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(false)
  const [shake, setShake]       = useState(false)
  const [registered, setRegistered] = useState(false)

  // Load any registered users from localStorage
  const getUsers = () => {
    try { return JSON.parse(localStorage.getItem('sp_users') || 'null') || [...DEMO_USERS] }
    catch { return [...DEMO_USERS] }
  }
  const saveUsers = (users) => localStorage.setItem('sp_users', JSON.stringify(users))

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.username.trim()) e.username = 'Username is required'
    if (!form.password)        e.password = 'Password is required'
    if (tab === 'register') {
      if (!form.name.trim())           e.name = 'Full name is required'
      if (!form.email.includes('@'))   e.email = 'Valid email required'
      if (form.password.length < 6)    e.password = 'Min 6 characters'
      if (form.password !== form.confirmPwd) e.confirmPwd = 'Passwords do not match'
      const users = getUsers()
      if (users.some(u => u.username === form.username.toLowerCase()))
        e.username = 'Username already taken'
    }
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) { setShake(true); setTimeout(() => setShake(false), 500); return }

    setLoading(true)
    await new Promise(r => setTimeout(r, 800))  // simulate network

    if (tab === 'login') {
      const users = getUsers()
      const user  = users.find(u => u.username === form.username.toLowerCase() && u.password === form.password)
      if (!user) {
        setErrors({ password: 'Invalid username or password' })
        setShake(true); setTimeout(() => setShake(false), 500)
        setLoading(false); return
      }
      localStorage.setItem('sp_session', JSON.stringify({ username: user.username, name: user.name, avatar: user.avatar, loginTime: Date.now() }))
      onLogin({ username: user.username, name: user.name, avatar: user.avatar })
    } else {
      const users = getUsers()
      const newUser = { username: form.username.toLowerCase(), password: form.password, name: form.name, email: form.email, avatar: '👤' }
      saveUsers([...users, newUser])
      setRegistered(true)
      setTab('login')
      setForm(f => ({ ...f, password: '', confirmPwd: '' }))
    }
    setLoading(false)
  }

  const loginAsDemo = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    const user = DEMO_USERS[0]
    localStorage.setItem('sp_session', JSON.stringify({ username: user.username, name: user.name, avatar: user.avatar, loginTime: Date.now() }))
    onLogin({ username: user.username, name: user.name, avatar: user.avatar })
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080810',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');
        @keyframes tickerScroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes float { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-10px) } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 20px rgba(0,212,170,0.1) } 50% { box-shadow: 0 0 40px rgba(0,212,170,0.25) } }
        @keyframes shake { 0%,100% { transform: translateX(0) } 20%,60% { transform: translateX(-6px) } 40%,80% { transform: translateX(6px) } }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        .login-card { animation: slideUp 0.5s ease forwards, pulseGlow 3s ease infinite; }
        .logo-icon  { animation: float 3s ease infinite; }
        .tab-btn    { transition: all 0.2s; }
        .tab-btn:hover { color: #e2e8f0 !important; }
        .submit-btn { transition: all 0.2s; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,212,170,0.35) !important; }
        .demo-btn:hover { border-color: rgba(99,102,241,0.5) !important; color: #a78bfa !important; }
      `}</style>

      <ParticleCanvas />
      <TickerTape />

      {/* Glow orbs */}
      <div style={{ position: 'fixed', top: '20%',  left: '10%',  width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '15%', right: '8%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Main card */}
      <div className="login-card" style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: 440, margin: '52px 16px 16px',
        background: 'rgba(12,15,30,0.85)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 20, padding: '36px 36px 32px',
        backdropFilter: 'blur(24px)',
        animation: shake ? 'shake 0.4s ease' : 'slideUp 0.5s ease forwards',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div className="logo-icon" style={{ fontSize: 44, marginBottom: 10 }}>📈</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
            Stock<span style={{ color: '#00d4aa' }}>Pulse</span>
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>AI-Powered Market Intelligence</div>
        </div>

        {/* Success msg after register */}
        {registered && (
          <div style={{
            background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.25)',
            borderRadius: 10, padding: '10px 16px', marginBottom: 20,
            fontSize: 13, color: '#00d4aa', textAlign: 'center',
          }}>
            ✅ Account created! You can now log in.
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.04)',
          borderRadius: 10, padding: 4, marginBottom: 28, gap: 4,
        }}>
          {[['login', '🔑 Sign In'], ['register', '✨ Create Account']].map(([key, label]) => (
            <button key={key} className="tab-btn" onClick={() => { setTab(key); setErrors({}); setRegistered(false) }}
              style={{
                flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer', borderRadius: 8,
                fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                background: tab === key ? 'rgba(0,212,170,0.15)' : 'transparent',
                color: tab === key ? '#00d4aa' : '#64748b',
                boxShadow: tab === key ? 'inset 0 0 0 1px rgba(0,212,170,0.3)' : 'none',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {tab === 'register' && (
            <Field id="reg-name" label="Full Name" type="text" placeholder="John Doe"
              icon="👤" value={form.name} onChange={set('name')} error={errors.name} />
          )}
          {tab === 'register' && (
            <Field id="reg-email" label="Email Address" type="email" placeholder="john@example.com"
              icon="📧" value={form.email} onChange={set('email')} error={errors.email} />
          )}
          <Field id="login-username" label="Username" type="text" placeholder="your_username"
            icon="🧑" value={form.username} onChange={set('username')} error={errors.username} />
          <Field id="login-password" label="Password" type="password" placeholder="••••••••"
            icon="🔒" value={form.password} onChange={set('password')} error={errors.password} />
          {tab === 'register' && (
            <Field id="reg-confirm" label="Confirm Password" type="password" placeholder="••••••••"
              icon="🔐" value={form.confirmPwd} onChange={set('confirmPwd')} error={errors.confirmPwd} />
          )}

          {/* Forgot password (login only) */}
          {tab === 'login' && (
            <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 20 }}>
              <button type="button" onClick={() => alert('Use demo / demo123 to log in.')}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit */}
          <button id="login-submit-btn" type="submit" className="submit-btn"
            disabled={loading}
            style={{
              width: '100%', padding: '13px 0', border: 'none', borderRadius: 10,
              background: loading ? 'rgba(0,212,170,0.3)' : 'linear-gradient(135deg, #00d4aa, #0ea5e9)',
              color: loading ? '#334155' : '#080810',
              fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {loading ? (
              <>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#00d4aa', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                {tab === 'login' ? 'Signing in…' : 'Creating account…'}
              </>
            ) : (
              tab === 'login' ? '🚀 Sign In' : '✨ Create Account'
            )}
          </button>

          {/* Demo login */}
          {tab === 'login' && (
            <button id="demo-login-btn" type="button" className="demo-btn" onClick={loginAsDemo}
              disabled={loading}
              style={{
                width: '100%', padding: '11px 0', border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 10, background: 'rgba(255,255,255,0.03)',
                color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                letterSpacing: '0.02em', transition: 'all 0.2s',
              }}>
              ⚡ Try Demo Account
            </button>
          )}
        </form>

        {/* Demo credentials hint */}
        {tab === 'login' && (
          <div style={{
            marginTop: 20, padding: '12px 16px',
            background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 10, fontSize: 12, color: '#64748b',
          }}>
            <div style={{ fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>🔑 Demo Credentials</div>
            {DEMO_USERS.map(u => (
              <div key={u.username} style={{ fontFamily: 'JetBrains Mono,monospace', marginBottom: 3 }}>
                <span style={{ color: '#6366f1' }}>{u.username}</span>
                <span style={{ color: '#334155' }}> / </span>
                <span style={{ color: '#94a3b8' }}>{u.password}</span>
                <span style={{ marginLeft: 6 }}>{u.avatar}</span>
              </div>
            ))}
          </div>
        )}

        {/* Terms */}
        {tab === 'register' && (
          <div style={{ marginTop: 18, fontSize: 11, color: '#334155', textAlign: 'center', lineHeight: 1.6 }}>
            By creating an account you agree to our{' '}
            <span style={{ color: '#00d4aa', cursor: 'pointer' }}>Terms of Service</span>
            {' '}and{' '}
            <span style={{ color: '#00d4aa', cursor: 'pointer' }}>Privacy Policy</span>.
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ position: 'relative', zIndex: 2, fontSize: 12, color: '#334155', marginTop: 10, marginBottom: 16 }}>
        StockPulse © 2025 · AI-Powered Market Intelligence
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) }}`}</style>
    </div>
  )
}
