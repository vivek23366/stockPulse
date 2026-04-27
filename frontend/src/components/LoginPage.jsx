import { useState, useEffect } from 'react'

const API = 'http://localhost:8000'

/* ── API helpers ─────────────────────────────────────────── */
async function apiLogin(username, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Login failed')
  return data
}

async function apiRegister(username, password, name, email) {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, name, email }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Registration failed')
  return data
}

/* ── Session helpers (exported for App.jsx) ──────────────── */
export function saveSession(token, user) {
  localStorage.setItem('sp_token', token)
  localStorage.setItem('sp_session', JSON.stringify({ ...user, loginTime: Date.now() }))
}
export function clearSession() {
  localStorage.removeItem('sp_token')
  localStorage.removeItem('sp_session')
}

/* ── Demo accounts ───────────────────────────────────────── */
const DEMOS = [
  { username: 'demo',  password: 'demo123',  avatar: '📊' },
  { username: 'vivek', password: 'vivek123', avatar: '🚀' },
  { username: 'admin', password: 'admin123', avatar: '⚡' },
]

/* ═══════════════════════════════════════════════════════════
   LOGIN PAGE
═══════════════════════════════════════════════════════════ */
export default function LoginPage({ onLogin }) {
  const [tab, setTab]         = useState('login')
  const [form, setForm]       = useState({ username: '', password: '', name: '', email: '', confirmPwd: '' })
  const [errors, setErrors]   = useState({})
  const [apiErr, setApiErr]   = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake]     = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 450) }

  const validate = () => {
    const e = {}
    if (!form.username.trim()) e.username = 'Required'
    if (!form.password)        e.password = 'Required'
    if (tab === 'register') {
      if (!form.name.trim())         e.name       = 'Required'
      if (!form.email.includes('@')) e.email      = 'Valid email required'
      if (form.password.length < 6)  e.password   = 'Min 6 characters'
      if (form.password !== form.confirmPwd) e.confirmPwd = "Passwords don't match"
    }
    return e
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setApiErr('')
    const errs = validate(); setErrors(errs)
    if (Object.keys(errs).length) { triggerShake(); return }
    setLoading(true)
    try {
      let data
      if (tab === 'login') {
        data = await apiLogin(form.username.trim(), form.password)
      } else {
        data = await apiRegister(form.username.trim(), form.password, form.name.trim(), form.email.trim())
      }
      saveSession(data.token, data.user)
      onLogin(data.user)
    } catch (err) {
      setApiErr(err.message)
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const demoLogin = async (hint) => {
    setApiErr('')
    setLoading(true)
    try {
      const data = await apiLogin(hint.username, hint.password)
      saveSession(data.token, data.user)
      onLogin(data.user)
    } catch (err) {
      setApiErr(err.message)
    } finally {
      setLoading(false)
    }
  }

  const switchTab = t => { setTab(t); setErrors({}); setApiErr(''); setSuccess(false) }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07090f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes shake {
          0%,100% { transform: translateX(0) }
          20%,60%  { transform: translateX(-6px) }
          40%,80%  { transform: translateX(6px) }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes spin {
          to { transform: rotate(360deg) }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; transform: scale(1) }
          50%     { opacity: 0.4; transform: scale(0.75) }
        }
        @keyframes orb1 {
          0%,100% { transform: translate(0,0) }
          50%     { transform: translate(30px, -20px) }
        }
        @keyframes orb2 {
          0%,100% { transform: translate(0,0) }
          50%     { transform: translate(-20px, 25px) }
        }
        .sp-field:focus { outline: none; border-color: #00d4aa !important; background: rgba(0,212,170,0.04) !important; }
        .sp-field::placeholder { color: #2d3748; }
        .tab-btn:hover { color: #94a3b8 !important; }
        .btn-demo:hover { background: rgba(0,212,170,0.12) !important; }
      `}</style>

      {/* Background orbs */}
      <div style={{ position: 'absolute', top: '15%',  left: '10%',  width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,170,0.07) 0%, transparent 70%)', animation: 'orb1 12s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '8%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)', animation: 'orb2 15s ease-in-out infinite', pointerEvents: 'none' }} />

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'rgba(13,14,25,0.95)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20,
        padding: '40px 36px',
        animation: 'fadeUp 0.5s ease',
        position: 'relative',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,170,0.05)',
        backdropFilter: 'blur(20px)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: 'linear-gradient(135deg, #00d4aa, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>📈</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
              Stock<span style={{ color: '#00d4aa' }}>Pulse</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4aa', animation: 'pulse 1.5s ease infinite' }} />
              <span style={{ fontSize: 10, color: '#00d4aa', fontWeight: 600, letterSpacing: '0.05em' }}>LIVE MARKETS</span>
            </div>
          </div>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4, letterSpacing: '-0.02em' }}>
            {tab === 'login' ? 'Welcome back 👋' : 'Create account ✨'}
          </div>
          <div style={{ fontSize: 13, color: '#475569' }}>
            {tab === 'login' ? 'Sign in to your trading dashboard' : 'Join StockPulse for free'}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3, marginBottom: 24, gap: 3 }}>
          {[['login','Sign In'],['register','Register']].map(([k,l]) => (
            <button key={k} className="tab-btn" onClick={() => switchTab(k)} style={{
              flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
              background: tab === k ? 'rgba(0,212,170,0.15)' : 'transparent',
              color: tab === k ? '#00d4aa' : '#64748b',
              fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
            }}>{l}</button>
          ))}
        </div>

        {/* Api error */}
        {apiErr && (
          <div style={{ background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.2)', borderRadius: 9, padding: '9px 13px', marginBottom: 16, fontSize: 12, color: '#ff4d6d' }}>
            🚫 {apiErr}
          </div>
        )}

        {/* Success */}
        {success && (
          <div style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 9, padding: '9px 13px', marginBottom: 16, fontSize: 12, color: '#00d4aa' }}>
            ✅ Account created — sign in below.
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate key={tab} style={{ animation: 'fadeUp 0.25s ease' }}>

          {tab === 'register' && (
            <InputField label="Full Name" id="fn" placeholder="John Doe" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
          )}
          {tab === 'register' && (
            <InputField label="Email" id="em" placeholder="john@example.com" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
          )}

          <InputField label="Username" id="un" placeholder="username" value={form.username} onChange={set('username')} error={errors.username} autoComplete="username" />

          {/* Password */}
          <div style={{ marginBottom: errors.password ? 4 : 18 }}>
            <label htmlFor="pw" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="pw" className="sp-field"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password} onChange={set('password')}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                style={{
                  width: '100%', padding: '11px 40px 11px 14px',
                  background: 'rgba(255,255,255,0.04)', border: `1.5px solid ${errors.password ? '#ff4d6d' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 10, color: '#e2e8f0', fontSize: 14,
                  fontFamily: showPwd ? 'Inter,sans-serif' : 'JetBrains Mono,monospace',
                  outline: 'none', transition: 'all 0.2s',
                }}
              />
              <button type="button" onClick={() => setShowPwd(s => !s)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 14, padding: 0,
              }}>
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
            {errors.password && <div style={{ fontSize: 11, color: '#ff4d6d', marginTop: 4 }}>⚠ {errors.password}</div>}
          </div>

          {tab === 'register' && (
            <InputField label="Confirm Password" id="cp" type="password" placeholder="••••••••" value={form.confirmPwd} onChange={set('confirmPwd')} error={errors.confirmPwd} autoComplete="new-password" />
          )}

          {/* Submit */}
          <button id="login-submit-btn" type="submit" disabled={loading} style={{
            width: '100%', padding: '13px 0', border: 'none', borderRadius: 11,
            background: loading ? 'rgba(0,212,170,0.15)' : 'linear-gradient(135deg, #00d4aa, #0ea5e9)',
            color: loading ? '#475569' : '#040810',
            fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s', letterSpacing: '0.01em', marginTop: 4,
            boxShadow: loading ? 'none' : '0 4px 24px rgba(0,212,170,0.3)',
            animation: shake ? 'shake 0.4s ease' : 'none',
          }}>
            {loading
              ? <><span style={{ width: 15, height: 15, border: '2px solid rgba(0,212,170,0.25)', borderTopColor: '#00d4aa', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Please wait…</>
              : tab === 'login' ? '🚀 Sign In' : '✨ Create Account'
            }
          </button>
        </form>

        {/* Demo accounts */}
        {tab === 'login' && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 10, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.09em', textAlign: 'center', marginBottom: 10 }}>
              — Demo accounts —
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DEMOS.map(u => (
                <button key={u.username} className="btn-demo" type="button" disabled={loading}
                  onClick={() => demoLogin(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 13px', borderRadius: 9,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer', transition: 'background 0.2s', width: '100%',
                  }}>
                  <span style={{ fontSize: 16 }}>{u.avatar}</span>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', color: '#6366f1', fontSize: 12, fontWeight: 700 }}>{u.username}</span>
                  <span style={{ color: '#1e293b', fontSize: 11 }}>/</span>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', color: '#334155', fontSize: 11 }}>{u.password}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#00d4aa', fontWeight: 700, letterSpacing: '0.04em' }}>USE →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, fontSize: 10, color: '#1e293b', textAlign: 'center' }}>
          StockPulse © 2025 · AI-Powered Market Intelligence
        </div>
      </div>
    </div>
  )
}

/* ── Reusable text input ─────────────────────────────────── */
function InputField({ label, id, placeholder, value, onChange, error, autoComplete, type = 'text' }) {
  return (
    <div style={{ marginBottom: error ? 4 : 18 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>
        {label}
      </label>
      <input
        id={id} type={type} className="sp-field"
        placeholder={placeholder} value={value} onChange={onChange}
        autoComplete={autoComplete || 'off'}
        style={{
          width: '100%', padding: '11px 14px',
          background: 'rgba(255,255,255,0.04)',
          border: `1.5px solid ${error ? '#ff4d6d' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10, color: '#e2e8f0', fontSize: 14, outline: 'none', transition: 'all 0.2s',
        }}
      />
      {error && <div style={{ fontSize: 11, color: '#ff4d6d', marginTop: 4 }}>⚠ {error}</div>}
    </div>
  )
}
