import { useState, useRef, useEffect, useCallback } from 'react'
import { compareStocks, searchTickers } from '../api/stockApi'
import LoadingSpinner from './LoadingSpinner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
} from 'recharts'

/* ─── Helpers ─────────────────────────────────────────────── */
function TrendBadge({ trend }) {
  if (!trend || trend === 'unknown') return <span className="badge-neutral">—</span>
  if (trend === 'bullish') return <span className="badge-bullish">▲ Bullish</span>
  if (trend === 'bearish') return <span className="badge-bearish">▼ Bearish</span>
  return <span className="badge-neutral">◆ Neutral</span>
}

function pct(n) {
  const v = Number(n ?? 0)
  const color = v >= 0 ? '#00d4aa' : '#ff4d6d'
  return (
    <span style={{ color, fontFamily: 'JetBrains Mono,monospace', fontWeight: 600 }}>
      {v >= 0 ? '+' : ''}{v.toFixed(2)}%
    </span>
  )
}

function fmtVolume(n) {
  const v = Number(n ?? 0)
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B'
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  return v.toLocaleString()
}

function fmtMarketCap(n) {
  const v = Number(n ?? 0)
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T'
  if (v >= 1e9)  return '$' + (v / 1e9).toFixed(2) + 'B'
  if (v >= 1e6)  return '$' + (v / 1e6).toFixed(2) + 'M'
  return '$' + v.toLocaleString()
}

/* ─── Chart palette ───────────────────────────────────────── */
const PALETTE = ['#00d4aa', '#6366f1', '#f59e0b', '#ff4d6d', '#3b82f6', '#a78bfa', '#34d399', '#fb923c']

/* ─── Custom Tooltip ──────────────────────────────────────── */
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,12,28,0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      color: '#e2e8f0',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#94a3b8' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: 'JetBrains Mono,monospace' }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </div>
      ))}
    </div>
  )
}

/* ─── Active Pie Shape ────────────────────────────────────── */
function ActivePieShape(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#e2e8f0" fontSize={15} fontWeight={700}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize={12}>
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 12} outerRadius={outerRadius + 16}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  )
}

/* ─── Section label ───────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8
    }}>
      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      {children}
      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
}

/* ─── Highlight match helper ──────────────────────────────── */
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

/* ─── Ticker Tag ──────────────────────────────────────────── */
function TickerTag({ symbol, color, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: 8, padding: '3px 10px',
      fontSize: 12, fontWeight: 700, color,
      fontFamily: 'JetBrains Mono,monospace',
    }}>
      {symbol}
      <button
        type="button"
        onClick={() => onRemove(symbol)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14, lineHeight: 1, padding: '0 1px', opacity: 0.7 }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
      >×</button>
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════ */
export default function CompareTable({ showToast }) {
  const [tags, setTags]           = useState(['AAPL', 'TSLA', 'MSFT'])
  const [inputVal, setInputVal]   = useState('')
  const [stocks, setStocks]       = useState([])
  const [loading, setLoading]     = useState(false)
  const [fetched, setFetched]     = useState(false)
  const [activePieIdx, setActivePieIdx] = useState(0)
  const [suggestions, setSuggestions]   = useState([])
  const [showDrop, setShowDrop]   = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef(null)
  const wrapRef  = useRef(null)
  const debounce = useRef(null)

  /* Close on outside click */
  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  /* Autocomplete */
  const fetchSugg = useCallback(q => {
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

  const addTag = sym => {
    const s = sym.trim().toUpperCase()
    if (!s || tags.includes(s)) return
    if (tags.length >= 8) { showToast('Max 8 tickers for comparison', 'error'); return }
    setTags(prev => [...prev, s])
    setInputVal(''); setSuggestions([]); setShowDrop(false)
  }

  const removeTag = sym => setTags(prev => prev.filter(t => t !== sym))

  const handleInputChange = e => {
    const v = e.target.value.toUpperCase()
    setInputVal(v)
    // If user typed a comma, add that tag
    if (v.endsWith(',')) { addTag(v.slice(0, -1)); return }
    fetchSugg(v)
  }

  const handleKeyDown = e => {
    if (showDrop && suggestions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
      else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); addTag(suggestions[activeIdx].symbol); return }
      else if (e.key === 'Escape') { setShowDrop(false); return }
    }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addTag(inputVal) }
    if (e.key === 'Backspace' && inputVal === '' && tags.length) setTags(prev => prev.slice(0, -1))
  }

  const run = async (e) => {
    e?.preventDefault()
    const tickers = tags.filter(Boolean)
    if (!tickers.length) return
    setLoading(true); setFetched(false)
    try {
      const res = await compareStocks(tickers)
      setStocks(res.data.stocks)
      setFetched(true)
    } catch (err) {
      showToast(err.response?.data?.detail || 'Compare failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  /* derived chart data */
  const barPriceData     = stocks.map(s => ({ name: s.symbol, Price: +(s.price ?? 0).toFixed(2) }))
  const barChangeData    = stocks.map(s => ({ name: s.symbol, 'Change %': +(s.change_percent ?? 0).toFixed(2), '30d Δ': +(s.period_change ?? 0).toFixed(2) }))
  const barVolumeData    = stocks.map(s => ({ name: s.symbol, Volume: +(s.volume ?? 0) }))
  const pieMarketCapData = stocks
    .filter(s => (s.market_cap ?? 0) > 0)
    .map((s, i) => ({ name: s.symbol, value: s.market_cap, color: PALETTE[i % PALETTE.length] }))

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
          Multi-Stock Comparison
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Compare up to 8 stocks side by side with charts &amp; metrics.
        </p>
      </div>

      {/* ── Tag Input with Autocomplete ── */}
      <form onSubmit={run} style={{ marginBottom: 28 }}>
        <div ref={wrapRef} style={{ position: 'relative' }}>
          {/* Tag container */}
          <div
            onClick={() => inputRef.current?.focus()}
            style={{
              display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
              minHeight: 48, padding: '8px 12px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, cursor: 'text',
              transition: 'border-color 0.2s',
            }}
          >
            {tags.map((sym, i) => (
              <TickerTag key={sym} symbol={sym} color={PALETTE[i % PALETTE.length]} onRemove={removeTag} />
            ))}
            <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
              <input
                ref={inputRef}
                id="compare-tickers-input"
                value={inputVal}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length && setShowDrop(true)}
                placeholder={tags.length === 0 ? 'Type ticker or company name…' : 'Add more…'}
                autoComplete="off"
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: '#e2e8f0', fontSize: 13, fontFamily: 'JetBrains Mono,monospace',
                  fontWeight: 600, width: '100%', padding: '2px 4px',
                }}
              />
              {searching && (
                <div style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}>
                  <LoadingSpinner size={12} color="#00d4aa" />
                </div>
              )}
            </div>
          </div>

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
                {suggestions.length} match{suggestions.length !== 1 ? 'es' : ''} · ↑↓ navigate · Enter / Space to add
              </div>
              {suggestions.map((s, i) => (
                <div
                  key={s.symbol}
                  onMouseDown={() => addTag(s.symbol)}
                  onMouseEnter={() => setActiveIdx(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', cursor: 'pointer',
                    background: i === activeIdx ? 'rgba(0,212,170,0.08)' : 'transparent',
                    borderLeft: i === activeIdx ? '2px solid #00d4aa' : '2px solid transparent',
                    transition: 'background 0.12s',
                    opacity: tags.includes(s.symbol) ? 0.4 : 1,
                  }}
                >
                  <span style={{
                    fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 13,
                    color: i === activeIdx ? '#00d4aa' : '#e2e8f0', minWidth: 58,
                  }}>
                    <Highlight text={s.symbol} query={inputVal} />
                  </span>
                  <span style={{ color: '#1e293b', fontSize: 18 }}>·</span>
                  <span style={{ color: '#64748b', fontSize: 13, flex: 1 }}>
                    <Highlight text={s.name} query={inputVal.toLowerCase()} />
                  </span>
                  {tags.includes(s.symbol) && <span style={{ fontSize: 10, color: '#334155' }}>already added</span>}
                  {i === activeIdx && !tags.includes(s.symbol) && <span style={{ color: '#00d4aa', fontSize: 11 }}>↵ add</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <div style={{ fontSize: 11, color: '#334155' }}>
            {tags.length}/8 · Press <kbd style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, padding: '1px 5px', fontFamily: 'inherit' }}>Space</kbd> or{' '}
            <kbd style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, padding: '1px 5px', fontFamily: 'inherit' }}>,</kbd> to add ·{' '}
            <kbd style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, padding: '1px 5px', fontFamily: 'inherit' }}>Backspace</kbd> to remove last
          </div>
          <button
            id="compare-btn"
            type="submit"
            className="btn-primary"
            disabled={loading || tags.length === 0}
            style={{ minWidth: 120, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
          >
            {loading && <LoadingSpinner size={14} color="#080810" />}
            {loading ? 'Fetching…' : `⚡ Compare ${tags.length > 0 ? tags.length : ''} Stocks`}
          </button>
        </div>
      </form>

      {fetched && stocks.length > 0 && (
        <>
          {/* ── Data Grid ──────────────────────────────────────── */}
          <div className="glass-card animate-slide-up" style={{ overflow: 'hidden', marginBottom: 28 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Symbol</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Change %</th>
                    <th>30-day Δ</th>
                    <th>Volume</th>
                    <th>Market Cap</th>
                    <th>Trend</th>
                    <th>Volatility</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s, i) => (
                    <tr key={s.symbol}>
                      <td style={{ color: '#334155', fontWeight: 600 }}>{i + 1}</td>
                      <td>
                        <span style={{
                          fontFamily: 'JetBrains Mono,monospace', fontWeight: 700,
                          color: PALETTE[i % PALETTE.length], fontSize: 13,
                        }}>{s.symbol}</span>
                      </td>
                      <td style={{ color: '#64748b', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono,monospace', color: '#e2e8f0', fontWeight: 600 }}>
                          ${Number(s.price ?? 0).toFixed(2)}
                        </span>
                      </td>
                      <td>{pct(s.change_percent)}</td>
                      <td>{pct(s.period_change)}</td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono,monospace', color: '#94a3b8', fontSize: 12 }}>
                          {fmtVolume(s.volume)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono,monospace', color: '#94a3b8', fontSize: 12 }}>
                          {fmtMarketCap(s.market_cap)}
                        </span>
                      </td>
                      <td><TrendBadge trend={s.trend} /></td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono,monospace', color: '#64748b' }}>
                          {Number(s.volatility ?? 0).toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary bar */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', gap: 24, flexWrap: 'wrap',
            }}>
              <Stat label="Stocks" value={stocks.length} />
              <Stat label="Best Performer" value={stocks[0]?.symbol || '—'} color="#00d4aa" />
              <Stat label="Worst Performer" value={stocks[stocks.length - 1]?.symbol || '—'} color="#ff4d6d" />
              <Stat
                label="Avg Change"
                value={`${(stocks.reduce((a, s) => a + (s.change_percent ?? 0), 0) / stocks.length).toFixed(2)}%`}
                color={stocks.reduce((a, s) => a + (s.change_percent ?? 0), 0) >= 0 ? '#00d4aa' : '#ff4d6d'}
              />
              <Stat
                label="Total Mkt Cap"
                value={fmtMarketCap(stocks.reduce((a, s) => a + (s.market_cap ?? 0), 0))}
                color="#6366f1"
              />
            </div>
          </div>

          {/* ── Charts Section ──────────────────────────────────── */}
          <SectionLabel>Visual Comparison</SectionLabel>

          {/* Row 1: Price Bar + Change Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px,1fr))', gap: 20, marginBottom: 20 }}>

            {/* Price Bar Chart */}
            <div className="glass-card" style={{ padding: '20px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>
                📊 Stock Price Comparison
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barPriceData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${v}`} width={55} />
                  <Tooltip content={<ChartTooltip formatter={v => `$${v.toLocaleString()}`} />} />
                  <Bar dataKey="Price" radius={[4, 4, 0, 0]}>
                    {barPriceData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Change % grouped bar */}
            <div className="glass-card" style={{ padding: '20px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>
                📈 Change % vs 30-Day Δ
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barChangeData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}%`} width={48} />
                  <Tooltip content={<ChartTooltip formatter={v => `${v > 0 ? '+' : ''}${v}%`} />} />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  <Bar dataKey="Change %" radius={[4, 4, 0, 0]} fill="#00d4aa" fillOpacity={0.85} />
                  <Bar dataKey="30d Δ"   radius={[4, 4, 0, 0]} fill="#6366f1" fillOpacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Volume Bar + Market Cap Pie */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px,1fr))', gap: 20, marginBottom: 20 }}>

            {/* Volume Bar Chart */}
            <div className="glass-card" style={{ padding: '20px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>
                📦 Volume Comparison
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barVolumeData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => fmtVolume(v)} width={52} />
                  <Tooltip content={<ChartTooltip formatter={v => fmtVolume(v)} />} />
                  <Bar dataKey="Volume" radius={[4, 4, 0, 0]}>
                    {barVolumeData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.75} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Market Cap Pie Chart */}
            {pieMarketCapData.length > 0 && (
              <div className="glass-card" style={{ padding: '20px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>
                  🥧 Market Cap Distribution
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      activeIndex={activePieIdx}
                      activeShape={ActivePieShape}
                      data={pieMarketCapData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={85}
                      dataKey="value"
                      onMouseEnter={(_, idx) => setActivePieIdx(idx)}
                    >
                      {pieMarketCapData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload
                        return (
                          <div style={{
                            background: 'rgba(10,12,28,0.95)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e2e8f0'
                          }}>
                            <div style={{ fontWeight: 700, color: d.color }}>{d.name}</div>
                            <div style={{ fontFamily: 'JetBrains Mono,monospace', marginTop: 4 }}>
                              {fmtMarketCap(d.value)}
                            </div>
                          </div>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', justifyContent: 'center', marginTop: 4 }}>
                  {pieMarketCapData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                      <span style={{ color: '#94a3b8' }}>{d.name}</span>
                      <span style={{ color: '#64748b', fontFamily: 'JetBrains Mono,monospace' }}>
                        {fmtMarketCap(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {fetched && stocks.length === 0 && (
        <div style={{
          color: '#ff4d6d', background: 'rgba(255,77,109,0.08)',
          border: '1px solid rgba(255,77,109,0.2)', borderRadius: 10,
          padding: '12px 16px', fontSize: 13,
        }}>
          ⚠ No data returned. Check your ticker symbols.
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || '#e2e8f0', fontFamily: 'JetBrains Mono,monospace' }}>{value}</div>
    </div>
  )
}
