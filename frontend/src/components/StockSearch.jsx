import { useState, useEffect, useRef, useCallback } from 'react'
import { getStock, searchTickers } from '../api/stockApi'
import SparklineChart from './SparklineChart'
import LoadingSpinner from './LoadingSpinner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts'

/* ─── Helpers ──────────────────────────────────────────────── */
function TrendBadge({ trend }) {
  if (!trend || trend === 'unknown') return <span className="badge-neutral">—</span>
  if (trend === 'bullish') return <span className="badge-bullish">▲ Bullish</span>
  if (trend === 'bearish') return <span className="badge-bearish">▼ Bearish</span>
  return <span className="badge-neutral">◆ Neutral</span>
}

function fmt(n, dec = 2) { return Number(n ?? 0).toFixed(dec) }
function fmtBig(n) {
  n = Number(n ?? 0)
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}
function fmtVol(n) {
  n = Number(n ?? 0)
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toString()
}

/* ─── Risk helpers ─────────────────────────────────────────── */
const RISK_COLOR = { Low: '#00d4aa', Medium: '#f59e0b', High: '#ff4d6d', Extreme: '#a78bfa' }
const RISK_BG    = { Low: 'rgba(0,212,170,0.12)', Medium: 'rgba(245,158,11,0.12)', High: 'rgba(255,77,109,0.12)', Extreme: 'rgba(167,139,250,0.12)' }
function RiskBadge({ level }) {
  const c = RISK_COLOR[level] || '#64748b'
  return (
    <span style={{
      background: `${c}18`, border: `1px solid ${c}50`,
      color: c, borderRadius: 8, padding: '3px 12px', fontSize: 13, fontWeight: 700,
    }}>{level || '—'}</span>
  )
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

/* ─── Chart tooltip ────────────────────────────────────────── */
function ChartTip({ active, payload, label, fmtFn }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,12,28,0.97)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e2e8f0',
    }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 6, color: '#94a3b8' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.fill || p.color || '#e2e8f0', fontFamily: 'JetBrains Mono,monospace' }}>
          {p.name}: {fmtFn ? fmtFn(p.value) : p.value}
        </div>
      ))}
    </div>
  )
}

/* ─── Stat row ─────────────────────────────────────────────── */
function StatRow({ label, value, color }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value price" style={color ? { color } : undefined}>{value}</span>
    </div>
  )
}

/* ─── Section label ────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      margin: '20px 0 12px', display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      {children}
      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
}

/* ─── Price Range Bar ──────────────────────────────────────── */
function PriceRangeBar({ low, high, current, label }) {
  const range = high - low
  if (!range) return null
  const pct = Math.min(100, Math.max(0, ((current - low) / range) * 100))
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 5 }}>
        <span style={{ fontFamily: 'JetBrains Mono,monospace' }}>${fmt(low)}</span>
        <span style={{ color: '#94a3b8', fontWeight: 600 }}>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono,monospace' }}>${fmt(high)}</span>
      </div>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{
          position: 'absolute', left: 0, width: `${pct}%`,
          height: '100%', borderRadius: 4,
          background: 'linear-gradient(90deg, #6366f1, #00d4aa)',
        }} />
        <div style={{
          position: 'absolute', left: `${pct}%`, top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: '#00d4aa', border: '2px solid #080810',
          boxShadow: '0 0 6px #00d4aa',
        }} />
      </div>
      <div style={{ textAlign: 'center', marginTop: 5, fontSize: 12, fontFamily: 'JetBrains Mono,monospace', color: '#e2e8f0', fontWeight: 700 }}>
        ${fmt(current)} <span style={{ color: '#64748b', fontWeight: 400 }}>({pct.toFixed(1)}% of range)</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
export default function StockSearch({ showToast }) {
  const [ticker, setTicker]           = useState('')
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop]       = useState(false)
  const [activeIdx, setActiveIdx]     = useState(-1)
  const [searching, setSearching]     = useState(false)
  const wrapRef  = useRef(null)
  const debounce = useRef(null)

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* Debounced autocomplete */
  const fetchSuggestions = useCallback((q) => {
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

  const handleChange = (e) => {
    const val = e.target.value.toUpperCase()
    setTicker(val)
    fetchSuggestions(val)
  }

  const pickSuggestion = (sym) => {
    setTicker(sym); setShowDrop(false); setSuggestions([])
    doSearch(sym)
  }

  const handleKeyDown = (e) => {
    if (!showDrop || !suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); pickSuggestion(suggestions[activeIdx].symbol) }
    else if (e.key === 'Escape') setShowDrop(false)
  }

  const doSearch = async (sym) => {
    const t = (sym || ticker).trim().toUpperCase()
    if (!t) return
    setLoading(true); setError(''); setData(null)
    try {
      const res = await getStock(t)
      setData(res.data)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to fetch stock data'
      setError(msg); showToast(msg, 'error')
    } finally { setLoading(false) }
  }

  const handleSubmit = (e) => { e?.preventDefault(); setShowDrop(false); doSearch() }

  /* Derived */
  const changeColor = data && data.change_percent >= 0 ? '#00d4aa' : '#ff4d6d'
  const sparkColor  = changeColor
  const riskColor   = data ? (RISK_COLOR[data.risk_level] || '#64748b') : '#64748b'

  /* Chart data */
  const gainLossData = data ? [
    { name: 'Max Daily Gain',   value: +fmt(data.max_gain),               fill: '#00d4aa' },
    { name: 'Max Daily Loss',   value: +Math.abs(fmt(data.max_loss)),      fill: '#ff4d6d' },
    { name: 'Daily Volatility', value: +fmt(data.volatility),              fill: '#6366f1' },
    { name: 'Ann. Volatility',  value: +fmt(data.annual_volatility, 1),    fill: '#f59e0b' },
  ] : []

  const rangeBarData = data ? [
    { name: '52W Low',  value: +fmt(data.fifty_two_week_low),  fill: '#334155' },
    { name: 'Day Low',  value: +fmt(data.day_low),             fill: '#6366f1' },
    { name: 'Price',    value: +fmt(data.price),               fill: data.change_percent >= 0 ? '#00d4aa' : '#ff4d6d' },
    { name: 'Day High', value: +fmt(data.day_high),            fill: '#f59e0b' },
    { name: '52W High', value: +fmt(data.fifty_two_week_high), fill: '#334155' },
  ] : []

  /* Radial gauge data for risk */
  const riskScore = data
    ? Math.min(100, Math.round((data.annual_volatility / 80) * 100))
    : 0
  const radialData = [{ name: 'Risk', value: riskScore, fill: riskColor }]

  return (
    <div className="animate-slide-up" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Stock Search</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Enter a ticker symbol or company name to get real-time data, risk analysis, and charts.
        </p>
      </div>

      {/* ── Search bar with autocomplete ── */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <div ref={wrapRef} style={{ position: 'relative', flex: 1 }}>
          <input
            id="stock-ticker-input"
            className="sp-input"
            type="text"
            placeholder="e.g. AAPL, Tesla, Nvidia…"
            value={ticker}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length && setShowDrop(true)}
            autoComplete="off"
            style={{ letterSpacing: '0.04em', fontFamily: 'JetBrains Mono, monospace', width: '100%' }}
          />
          {searching && (
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
              <LoadingSpinner size={14} color="#00d4aa" />
            </div>
          )}
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
                {suggestions.length} match{suggestions.length !== 1 ? 'es' : ''} · ↑↓ navigate · Enter select
              </div>
              {suggestions.map((s, i) => (
                <div
                  key={s.symbol}
                  onMouseDown={() => pickSuggestion(s.symbol)}
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
                    <Highlight text={s.symbol} query={ticker} />
                  </span>
                  <span style={{ color: '#1e293b', fontSize: 18 }}>·</span>
                  <span style={{ color: '#64748b', fontSize: 13, flex: 1 }}>
                    <Highlight text={s.name} query={ticker.toLowerCase()} />
                  </span>
                  {i === activeIdx && <span style={{ color: '#00d4aa', fontSize: 11 }}>↵</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          id="stock-search-btn"
          type="submit"
          className="btn-primary"
          disabled={loading || !ticker.trim()}
          style={{ minWidth: 100, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
        >
          {loading ? <LoadingSpinner size={14} color="#080810" /> : null}
          {loading ? 'Fetching…' : 'Search'}
        </button>
      </form>

      {/* ── Stock Card ─────────────────────────────────────── */}
      {data && (
        <div className="glass-card glow-teal animate-slide-up" style={{ padding: 28 }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span className="price" style={{ fontSize: 32, fontWeight: 800, color: '#e2e8f0' }}>
                  ${fmt(data.price)}
                </span>
                <span style={{
                  fontSize: 15, fontWeight: 700, color: changeColor,
                  background: `${changeColor}18`, padding: '4px 12px', borderRadius: 8,
                }}>
                  {data.change_percent >= 0 ? '+' : ''}{fmt(data.change_percent)}%
                </span>
                <RiskBadge level={data.risk_level} />
              </div>
              <div style={{ color: '#64748b', fontSize: 13 }}>
                <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{data.symbol}</span>
                &nbsp;·&nbsp;{data.name}
                &nbsp;·&nbsp;<span style={{ color: '#334155' }}>{data.currency}</span>
              </div>
            </div>
            <TrendBadge trend={data.trend} />
          </div>

          {/* ── Sparkline ── */}
          <SectionLabel>30-Day Price History</SectionLabel>
          <SparklineChart data={data.sparkline} color={sparkColor} height={80} />

          {/* ── Day Range bar ── */}
          <SectionLabel>Price Ranges</SectionLabel>
          <PriceRangeBar low={data.day_low}              high={data.day_high}              current={data.price} label="Today's Range" />
          <PriceRangeBar low={data.fifty_two_week_low}   high={data.fifty_two_week_high}   current={data.price} label="52-Week Range" />

          {/* ── Charts row ── */}
          <SectionLabel>Analytics &amp; Risk</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, marginBottom: 20 }}>

            {/* Bar: Max Gain / Max Loss / Volatility */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '16px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>
                ⚡ Gain / Loss / Volatility (%)
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={gainLossData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip content={<ChartTip fmtFn={v => `${v}%`} />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {gainLossData.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Price level bar chart */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '16px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>
                📊 Price Levels — 52W &amp; Day Range
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={rangeBarData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${v}`} width={55} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTip fmtFn={v => `$${v}`} />} />
                  <ReferenceLine y={data.price} stroke={changeColor} strokeDasharray="4 4" label={{ value: 'Now', fill: changeColor, fontSize: 10 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {rangeBarData.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Risk Gauge (Radial Bar) */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '16px 12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 4, alignSelf: 'flex-start' }}>
                🎯 Risk Gauge
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <RadialBarChart
                  cx="50%" cy="80%"
                  innerRadius="60%" outerRadius="100%"
                  startAngle={180} endAngle={0}
                  data={radialData}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background={{ fill: 'rgba(255,255,255,0.04)' }}
                    dataKey="value" angleAxisId={0} fill={riskColor} cornerRadius={6} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: -20, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: riskColor, fontFamily: 'JetBrains Mono,monospace' }}>
                  {riskScore}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>/ 100 Risk Score</div>
                <RiskBadge level={data.risk_level} />
              </div>
            </div>
          </div>

          {/* ── Full Stats Grid ── */}
          <SectionLabel>Full Metrics</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
            {[
              ['Change',          `$${fmt(data.change)}`,           changeColor],
              ['Volume',           fmtVol(data.volume),              null],
              ['Market Cap',       fmtBig(data.market_cap),          '#6366f1'],
              ['Daily Vol. (avg)', `${fmt(data.volatility)}%`,       null],
              ['Ann. Volatility',  `${fmt(data.annual_volatility)}%`,null],
              ['ATR (Avg True Range)', `$${fmt(data.atr)}`,          null],
              ['Max Daily Gain',   `+${fmt(data.max_gain)}%`,        '#00d4aa'],
              ['Max Daily Loss',   `${fmt(data.max_loss)}%`,         '#ff4d6d'],
              ['Risk Level',       data.risk_level,                   riskColor],
              ['Trend Strength',   `${(data.trend_strength * 100).toFixed(0)}%`, null],
              ['Day High',         `$${fmt(data.day_high)}`,         null],
              ['Day Low',          `$${fmt(data.day_low)}`,          null],
              ['Day Range',        data.day_range,                    null],
              ['52W High',         `$${fmt(data.fifty_two_week_high)}`, null],
              ['52W Low',          `$${fmt(data.fifty_two_week_low)}`,  null],
              ['52W Range',        data.week52_range,                 null],
              ['Currency',         data.currency,                     null],
              ['Previous Close',   `$${fmt(data.previous_close)}`,   null],
            ].map(([label, value, color]) => (
              <StatRow key={label} label={label} value={value} color={color} />
            ))}
          </div>

          {/* ── Support / Resistance ── */}
          {(data.support || data.resistance) && (
            <>
              <SectionLabel>Support &amp; Resistance</SectionLabel>
              <div style={{
                padding: '14px 18px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', gap: 40,
              }}>
                <div>
                  <div className="stat-label" style={{ marginBottom: 4 }}>Support</div>
                  <div className="price" style={{ color: '#00d4aa', fontWeight: 700, fontSize: 15 }}>${fmt(data.support)}</div>
                </div>
                <div>
                  <div className="stat-label" style={{ marginBottom: 4 }}>Resistance</div>
                  <div className="price" style={{ color: '#ff4d6d', fontWeight: 700, fontSize: 15 }}>${fmt(data.resistance)}</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {error && !loading && (
        <div style={{
          color: '#ff4d6d', background: 'rgba(255,77,109,0.08)',
          border: '1px solid rgba(255,77,109,0.2)', borderRadius: 10,
          padding: '12px 16px', fontSize: 13, marginTop: 8,
        }}>
          ⚠ {error}
        </div>
      )}
    </div>
  )
}
