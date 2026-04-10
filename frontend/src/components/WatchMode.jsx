import { useState, useEffect, useRef, useCallback } from 'react'
import { watchStock, searchTickers } from '../api/stockApi'
import SparklineChart from './SparklineChart'
import LoadingSpinner from './LoadingSpinner'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

/* ─── Constants ────────────────────────────────────────────── */
const INTERVAL    = 30
const MAX_HISTORY = 20
const PALETTE     = ['#00d4aa', '#6366f1', '#f59e0b', '#ff4d6d', '#3b82f6', '#a78bfa', '#34d399', '#fb923c']

/* ─── Formatters ───────────────────────────────────────────── */
const fmt    = (n, d = 2) => Number(n ?? 0).toFixed(d)
const fmtBig = n => {
  n = Number(n ?? 0)
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}
const fmtVol = n => {
  n = Number(n ?? 0)
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toString()
}
const now = () => new Date().toLocaleTimeString()

/* ─── Signal engine ────────────────────────────────────────── */
function generateSignal(data) {
  if (!data) return null
  const cp  = Number(data.change_percent ?? 0)
  const vol  = Number(data.volatility ?? 0)
  const ann  = Number(data.annual_volatility ?? 0)
  const trend = data.trend
  const price = Number(data.price ?? 0)
  const sup   = Number(data.support ?? 0)
  const res   = Number(data.resistance ?? 0)

  // Strong BUY
  if (trend === 'bullish' && cp > 1.5) return {
    type: 'BUY', color: '#00d4aa', bg: 'rgba(0,212,170,0.1)', icon: '🚀',
    label: 'Strong Buy', reason: `Bullish trend + ${fmt(cp)}% gain. Momentum is positive.`,
  }
  // Near support → BUY
  if (sup > 0 && price > 0 && (price - sup) / price < 0.02 && trend !== 'bearish') return {
    type: 'BUY', color: '#00d4aa', bg: 'rgba(0,212,170,0.1)', icon: '📈',
    label: 'Buy (Support)', reason: `Price is within 2% of support ($${fmt(sup)}). Potential bounce.`,
  }
  // Strong SELL
  if (trend === 'bearish' && cp < -1.5) return {
    type: 'SELL', color: '#ff4d6d', bg: 'rgba(255,77,109,0.1)', icon: '📉',
    label: 'Strong Sell', reason: `Bearish trend + ${fmt(cp)}% drop. Consider reducing exposure.`,
  }
  // Near resistance → SELL
  if (res > 0 && price > 0 && (res - price) / price < 0.02) return {
    type: 'SELL', color: '#ff4d6d', bg: 'rgba(255,77,109,0.1)', icon: '🔴',
    label: 'Sell (Resistance)', reason: `Price is within 2% of resistance ($${fmt(res)}). Potential reversal.`,
  }
  // High volatility → CAUTION
  if (ann > 45) return {
    type: 'CAUTION', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '⚠️',
    label: 'High Risk', reason: `Annual volatility ${fmt(ann)}% is extreme. Risk management advised.`,
  }
  // Neutral
  return {
    type: 'HOLD', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', icon: '⏸',
    label: 'Hold / Watch', reason: `No strong signal. Trend: ${trend || 'unknown'}. Monitor for breakout.`,
  }
}

/* ─── Smart alerts generator ───────────────────────────────── */
function generateAlerts(data, prevData) {
  const alerts = []
  if (!data) return alerts
  const cp  = Number(data.change_percent ?? 0)
  const ann = Number(data.annual_volatility ?? 0)
  const price = Number(data.price ?? 0)

  if (Math.abs(cp) > 3)
    alerts.push({ icon: '🔥', msg: `Extreme move: ${cp > 0 ? '+' : ''}${fmt(cp)}% today`, color: cp > 0 ? '#00d4aa' : '#ff4d6d' })
  if (ann > 50)
    alerts.push({ icon: '⚡', msg: `Very high volatility: ${fmt(ann)}% annual`, color: '#f59e0b' })
  if (data.support && Math.abs(price - Number(data.support)) / price < 0.015)
    alerts.push({ icon: '🛡', msg: `Near support $${fmt(data.support)}`, color: '#6366f1' })
  if (data.resistance && Math.abs(price - Number(data.resistance)) / price < 0.015)
    alerts.push({ icon: '🚧', msg: `Near resistance $${fmt(data.resistance)}`, color: '#f59e0b' })

  if (prevData) {
    const prev = Number(prevData.price ?? 0)
    const change30s = price - prev
    if (Math.abs(change30s) > prev * 0.005)
      alerts.push({
        icon: change30s > 0 ? '📈' : '📉',
        msg: `30s move: ${change30s > 0 ? '+' : ''}$${Math.abs(change30s).toFixed(2)}`,
        color: change30s > 0 ? '#00d4aa' : '#ff4d6d',
      })
  }
  return alerts
}

/* ─── Risk badge ───────────────────────────────────────────── */
const RISK_COLOR = { Low: '#00d4aa', Medium: '#f59e0b', High: '#ff4d6d', Extreme: '#a78bfa' }
function RiskBadge({ level }) {
  const c = RISK_COLOR[level] || '#64748b'
  return (
    <span style={{
      background: `${c}18`, border: `1px solid ${c}50`,
      color: c, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
    }}>{level || '—'}</span>
  )
}

/* ─── Trend badge ──────────────────────────────────────────── */
function TrendBadge({ trend }) {
  if (!trend || trend === 'unknown') return <span className="badge-neutral">◆ N/A</span>
  if (trend === 'bullish') return <span className="badge-bullish">▲ Bullish</span>
  if (trend === 'bearish') return <span className="badge-bearish">▼ Bearish</span>
  return <span className="badge-neutral">◆ Neutral</span>
}

/* ─── Autocomplete highlight ───────────────────────────────── */
function Highlight({ text, query }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: '#00d4aa', fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

/* ─── Chart Tooltip ────────────────────────────────────────── */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,12,28,0.97)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#e2e8f0',
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: 'JetBrains Mono,monospace' }}>
          ${Number(p.value).toFixed(2)}
        </div>
      ))}
    </div>
  )
}

/* ─── Single stock watch card ──────────────────────────────── */
function WatchCard({ sym, color, onRemove, showToast }) {
  const [data, setData]         = useState(null)
  const [prevData, setPrevData] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [countdown, setCountdown] = useState(INTERVAL)
  const [history, setHistory]   = useState([])        // {time, price}
  const [alerts, setAlerts]     = useState([])
  const [logEntries, setLog]    = useState([])
  const timerRef     = useRef(null)
  const countdownRef = useRef(null)

  const doFetch = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await watchStock(sym)
      const d    = res.data
      setPrevData(prev => prev ?? d)
      setAlerts(prev => {
        const newAlerts = generateAlerts(d, prev.__data)
        if (newAlerts.length)
          setLog(log => [{ time: now(), alerts: newAlerts }, ...log.slice(0, 29)])
        return newAlerts
      })
      setAlerts.__data = d   // store for next run
      setPrevData(d)
      setData(d)
      setHistory(h => {
        const entry = { time: now(), price: Number(d.price) }
        return [...h.slice(-(MAX_HISTORY - 1)), entry]
      })
      setCountdown(INTERVAL)
    } catch (err) {
      showToast(`${sym}: ${err.response?.data?.detail || 'fetch failed'}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [sym, showToast])

  useEffect(() => {
    doFetch()
    timerRef.current     = setInterval(doFetch, INTERVAL * 1000)
    countdownRef.current = setInterval(() => setCountdown(c => c <= 1 ? INTERVAL : c - 1), 1000)
    return () => { clearInterval(timerRef.current); clearInterval(countdownRef.current) }
  }, [doFetch])

  const signal = generateSignal(data)
  const cc     = data && data.change_percent >= 0 ? '#00d4aa' : '#ff4d6d'
  const riskColor = data ? (RISK_COLOR[data.risk_level] || '#64748b') : '#64748b'

  /* Compute live alerts separately from above race-condition workaround */
  const liveAlerts = data ? generateAlerts(data, prevData) : []

  return (
    <div className="glass-card animate-slide-up" style={{
      borderTop: `3px solid ${color}`,
      overflow: 'hidden', marginBottom: 20,
    }}>
      {/* Card header bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="live-dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 800, fontSize: 15, color }}>
            {sym}
          </span>
          {data && (
            <span style={{ color: '#64748b', fontSize: 12 }}>{data.name}</span>
          )}
          {loading && <LoadingSpinner size={12} color={color} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: '#334155' }}>
            ⟳ {countdown}s
          </span>
          <button
            onClick={() => onRemove(sym)}
            style={{
              background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.25)',
              color: '#ff4d6d', borderRadius: 6, padding: '3px 10px',
              fontSize: 12, cursor: 'pointer', fontWeight: 700,
            }}
          >✕ Remove</button>
        </div>
      </div>

      {!data && loading && (
        <div style={{ padding: 28, display: 'flex', alignItems: 'center', gap: 12, color: '#64748b' }}>
          <LoadingSpinner size={18} /> Fetching {sym}…
        </div>
      )}

      {data && (
        <div style={{ padding: 20 }}>
          {/* Price row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: '#e2e8f0', fontFamily: 'JetBrains Mono,monospace' }}>
                  ${fmt(data.price)}
                </span>
                <span style={{
                  fontSize: 14, fontWeight: 700, color: cc,
                  background: `${cc}18`, padding: '3px 10px', borderRadius: 8,
                }}>
                  {data.change_percent >= 0 ? '+' : ''}{fmt(data.change_percent)}%
                </span>
                {data.risk_level && <RiskBadge level={data.risk_level} />}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Prev close: ${fmt(data.previous_close)} &nbsp;·&nbsp; Vol: {fmtVol(data.volume)} &nbsp;·&nbsp; Cap: {fmtBig(data.market_cap)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
              <TrendBadge trend={data.trend} />
            </div>
          </div>

          {/* Signal box */}
          {signal && (
            <div style={{
              background: signal.bg, border: `1px solid ${signal.color}30`,
              borderRadius: 10, padding: '12px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <span style={{ fontSize: 22 }}>{signal.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: signal.color, marginBottom: 3 }}>
                  {signal.type} — {signal.label}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{signal.reason}</div>
              </div>
              <div style={{
                marginLeft: 'auto', background: signal.color, color: '#080810',
                borderRadius: 8, padding: '4px 14px', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap',
              }}>
                {signal.type}
              </div>
            </div>
          )}

          {/* Live alerts */}
          {liveAlerts.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                🔔 Live Alerts
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {liveAlerts.map((a, i) => (
                  <div key={i} style={{
                    background: `${a.color}12`, border: `1px solid ${a.color}30`,
                    borderRadius: 8, padding: '5px 12px', fontSize: 12,
                    color: a.color, display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {a.icon} {a.msg}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Price history area chart */}
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Live Price History
              </div>
              {history.length > 1 ? (
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={history} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${sym}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={cc} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={cc} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="time" tick={{ fill: '#334155', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `$${v.toFixed(0)}`} width={42} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="price" stroke={cc} strokeWidth={2}
                      fill={`url(#grad-${sym})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 12 }}>
                  Collecting data…
                </div>
              )}
            </div>

            {/* 30-day sparkline */}
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                30-Day Sparkline
              </div>
              <SparklineChart data={data.sparkline} color={cc} height={100} />
            </div>
          </div>

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 20px' }}>
            {[
              ['Day High',    `$${fmt(data.day_high)}`,           null],
              ['Day Low',     `$${fmt(data.day_low)}`,            null],
              ['Change $',    `${data.change >= 0 ? '+' : ''}$${fmt(data.change)}`, cc],
              ['Volatility',  `${fmt(data.volatility)}%`,         null],
              ['Ann. Vol.',   `${fmt(data.annual_volatility)}%`,  null],
              ['ATR',         `$${fmt(data.atr)}`,                null],
              ['Max Gain',    `+${fmt(data.max_gain)}%`,          '#00d4aa'],
              ['Max Loss',    `${fmt(data.max_loss)}%`,           '#ff4d6d'],
              ['Volume',      fmtVol(data.volume),                '#a78bfa'],
              ['Market Cap',  fmtBig(data.market_cap),            '#6366f1'],
              ['52W High',    `$${fmt(data.fifty_two_week_high)}`,null],
              ['52W Low',     `$${fmt(data.fifty_two_week_low)}`, null],
            ].map(([label, value, color]) => (
              <div key={label} className="stat-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, fontWeight: 700, color: color || '#e2e8f0' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Support / Resistance */}
          {(data.support || data.resistance) && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', gap: 28,
            }}>
              <div>
                <div style={{ fontSize: 10, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Support</div>
                <div style={{ color: '#00d4aa', fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', fontSize: 13 }}>${fmt(data.support)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Resistance</div>
                <div style={{ color: '#ff4d6d', fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', fontSize: 13 }}>${fmt(data.resistance)}</div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                {/* Price position bar */}
                {data.support && data.resistance && (() => {
                  const range = Number(data.resistance) - Number(data.support)
                  const pos   = range > 0 ? ((Number(data.price) - Number(data.support)) / range) * 100 : 50
                  return (
                    <div style={{ flex: 1, position: 'relative' }}>
                      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
                        <div style={{
                          position: 'absolute', height: '100%', borderRadius: 3,
                          width: `${Math.min(100, Math.max(0, pos))}%`,
                          background: `linear-gradient(90deg, #00d4aa, #ff4d6d)`,
                        }} />
                        <div style={{
                          position: 'absolute', left: `${Math.min(100, Math.max(0, pos))}%`,
                          top: '50%', transform: 'translate(-50%, -50%)',
                          width: 10, height: 10, borderRadius: '50%', background: cc,
                          border: '2px solid #080810', boxShadow: `0 0 4px ${cc}`,
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 9, color: '#334155' }}>
                        <span>Support</span><span>Resistance</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
export default function WatchMode({ showToast }) {
  const [watchList, setWatchList]   = useState(['AAPL'])
  const [input, setInput]           = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop]     = useState(false)
  const [activeIdx, setActiveIdx]   = useState(-1)
  const [searching, setSearching]   = useState(false)
  const [running, setRunning]       = useState(false)
  const wrapRef  = useRef(null)
  const debounce = useRef(null)

  /* Outside click closes dropdown */
  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  /* Autocomplete */
  const fetchSugg = useCallback((q) => {
    clearTimeout(debounce.current)
    if (!q.trim()) { setSuggestions([]); setShowDrop(false); return }
    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchTickers(q.trim())
        setSuggestions(res.data.results || [])
        setShowDrop(true)
        setActiveIdx(-1)
      } catch { /* silent */ } finally { setSearching(false) }
    }, 180)
  }, [])

  const handleChange = e => {
    const v = e.target.value.toUpperCase()
    setInput(v)
    fetchSugg(v)
  }

  const pickSugg = sym => {
    setInput(sym); setShowDrop(false); setSuggestions([])
  }

  const handleKeyDown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); pickSugg(suggestions[activeIdx].symbol) }
    else if (e.key === 'Enter') { e.preventDefault(); addToWatch() }
    else if (e.key === 'Escape') setShowDrop(false)
  }

  const addToWatch = () => {
    const sym = input.trim().toUpperCase()
    if (!sym) return
    if (watchList.includes(sym)) { showToast(`${sym} already in watch list`, 'error'); return }
    if (watchList.length >= 6)   { showToast('Max 6 stocks in watch mode', 'error'); return }
    setWatchList(prev => [...prev, sym])
    setInput(''); setSuggestions([]); setShowDrop(false)
    if (!running) setRunning(true)
  }

  const removeFromWatch = sym => {
    setWatchList(prev => prev.filter(s => s !== sym))
  }

  const startAll = () => {
    if (!watchList.length) { showToast('Add at least one ticker', 'error'); return }
    setRunning(true)
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
          🛰 Live Watch Mode
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Monitor up to 6 stocks simultaneously · Auto-refresh every 30s · Smart signals &amp; alerts
        </p>
      </div>

      {/* Feature callouts */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
        {[
          ['🚀', 'Buy/Sell Signals'],
          ['🔔', 'Smart Alerts'],
          ['📈', 'Live Trend Detection'],
          ['⚡', 'Risk Analysis'],
          ['🛡', 'Support/Resistance'],
          ['🕹', 'Multi-Stock Dashboard'],
        ].map(([icon, label]) => (
          <div key={label} style={{
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#94a3b8',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {icon} {label}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'flex-start' }}>
        <div ref={wrapRef} style={{ position: 'relative', flex: 1 }}>
          <input
            id="watch-ticker-input"
            className="sp-input"
            placeholder="Search ticker or company… (e.g. TSLA, Apple)"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length && setShowDrop(true)}
            autoComplete="off"
            style={{ fontFamily: 'JetBrains Mono,monospace', letterSpacing: '0.04em', width: '100%' }}
          />
          {searching && (
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
              <LoadingSpinner size={14} color="#00d4aa" />
            </div>
          )}

          {/* Autocomplete dropdown */}
          {showDrop && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: 'rgba(10,12,28,0.97)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(0,0,0,0.6)', zIndex: 999,
            }}>
              <div style={{
                padding: '7px 14px 5px', fontSize: 10, color: '#334155',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                {suggestions.length} match{suggestions.length !== 1 ? 'es' : ''} · ↑↓ navigate · Enter to add
              </div>
              {suggestions.map((s, i) => (
                <div
                  key={s.symbol}
                  onMouseDown={() => pickSugg(s.symbol)}
                  onMouseEnter={() => setActiveIdx(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', cursor: 'pointer',
                    background: i === activeIdx ? 'rgba(0,212,170,0.08)' : 'transparent',
                    borderLeft: i === activeIdx ? '2px solid #00d4aa' : '2px solid transparent',
                    transition: 'background 0.12s',
                  }}
                >
                  <span style={{
                    fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 13,
                    color: i === activeIdx ? '#00d4aa' : '#e2e8f0', minWidth: 58,
                  }}>
                    <Highlight text={s.symbol} query={input} />
                  </span>
                  <span style={{ color: '#1e293b', fontSize: 18 }}>·</span>
                  <span style={{ color: '#64748b', fontSize: 13, flex: 1 }}>
                    <Highlight text={s.name} query={input.toLowerCase()} />
                  </span>
                  {i === activeIdx && <span style={{ color: '#00d4aa', fontSize: 11 }}>↵ add</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          id="watch-add-btn"
          className="btn-primary"
          onClick={addToWatch}
          disabled={!input.trim()}
          style={{ minWidth: 110, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          ➕ Add
        </button>

        {!running ? (
          <button
            id="watch-start-btn"
            className="btn-primary"
            onClick={startAll}
            disabled={watchList.length === 0}
            style={{
              minWidth: 110, whiteSpace: 'nowrap',
              background: 'linear-gradient(135deg, #00d4aa, #0ea5e9)',
            }}
          >
            ▶ Start All
          </button>
        ) : (
          <button
            id="watch-stop-btn"
            className="btn-danger"
            onClick={() => setRunning(false)}
            style={{ minWidth: 110, whiteSpace: 'nowrap' }}
          >
            ■ Stop All
          </button>
        )}
      </div>

      {/* Watch list chips */}
      {watchList.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
          {watchList.map((sym, i) => (
            <div key={sym} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: `${PALETTE[i % PALETTE.length]}18`,
              border: `1px solid ${PALETTE[i % PALETTE.length]}40`,
              borderRadius: 8, padding: '4px 12px',
              fontSize: 12, fontWeight: 700,
              color: PALETTE[i % PALETTE.length],
              fontFamily: 'JetBrains Mono,monospace',
            }}>
              {sym}
              <button
                onClick={() => removeFromWatch(sym)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'inherit', fontSize: 14, lineHeight: 1, padding: 0, opacity: 0.7,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
              >×</button>
            </div>
          ))}
          <span style={{ fontSize: 12, color: '#334155', alignSelf: 'center' }}>
            {watchList.length}/6 slots
          </span>
        </div>
      )}

      {/* Live cards */}
      {running && watchList.map((sym, i) => (
        <WatchCard
          key={sym}
          sym={sym}
          color={PALETTE[i % PALETTE.length]}
          onRemove={removeFromWatch}
          showToast={showToast}
        />
      ))}

      {!running && watchList.length > 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 0', color: '#334155',
          border: '2px dashed rgba(255,255,255,0.06)', borderRadius: 16,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛰</div>
          <div style={{ fontSize: 16, color: '#64748b', marginBottom: 8 }}>
            {watchList.length} ticker{watchList.length !== 1 ? 's' : ''} ready to watch
          </div>
          <div style={{ fontSize: 13, color: '#334155' }}>
            Press <strong style={{ color: '#00d4aa' }}>Start All</strong> to begin live monitoring
          </div>
        </div>
      )}

      {watchList.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 0', color: '#334155',
          border: '2px dashed rgba(255,255,255,0.06)', borderRadius: 16,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📡</div>
          <div style={{ fontSize: 14, color: '#64748b' }}>
            Search a ticker above and press <strong style={{ color: '#00d4aa' }}>Add</strong> to start watching
          </div>
        </div>
      )}
    </div>
  )
}
