import { useState, useRef } from 'react'
import { getMarketPulse } from '../api/stockApi'
import LoadingSpinner from './LoadingSpinner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'

const DEFAULT_TICKERS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM']
const PALETTE = ['#00d4aa', '#6366f1', '#f59e0b', '#ff4d6d', '#3b82f6', '#a78bfa', '#34d399', '#fb923c']

/* ─── Formatters ───────────────────────────────────────────── */
function fmtVol(n) {
  n = Number(n ?? 0)
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toString()
}
function fmtCap(n) {
  n = Number(n ?? 0)
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}
function pct(n, bold = false) {
  const v = Number(n ?? 0)
  const color = v >= 0 ? '#00d4aa' : '#ff4d6d'
  return (
    <span style={{ color, fontWeight: bold ? 700 : 600, fontFamily: 'JetBrains Mono,monospace' }}>
      {v >= 0 ? '+' : ''}{v.toFixed(2)}%
    </span>
  )
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
  if (!trend || trend === 'unknown') return <span className="badge-neutral">— N/A</span>
  if (trend === 'bullish') return <span className="badge-bullish">▲ Bullish</span>
  if (trend === 'bearish') return <span className="badge-bearish">▼ Bearish</span>
  return <span className="badge-neutral">◆ Neutral</span>
}

/* ─── Sentiment Card ───────────────────────────────────────── */
function SentimentCard({ sentiment, count }) {
  const isBull = sentiment === 'bullish'
  const isBear = sentiment === 'bearish'
  const color  = isBull ? '#00d4aa' : isBear ? '#ff4d6d' : '#f59e0b'
  const bg     = isBull ? 'rgba(0,212,170,0.08)' : isBear ? 'rgba(255,77,109,0.08)' : 'rgba(245,158,11,0.08)'
  const icon   = isBull ? '📈' : isBear ? '📉' : '〰️'
  const label  = isBull ? 'BULLISH MARKET' : isBear ? 'BEARISH MARKET' : 'MIXED MARKET'
  return (
    <div style={{
      background: bg, border: `1px solid ${color}30`, borderRadius: 14,
      padding: '20px 28px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.01em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#64748b' }}>Based on {count} stock{count !== 1 ? 's' : ''}</div>
    </div>
  )
}

/* ─── Metric Card ──────────────────────────────────────────── */
function MetricCard({ label, value, sub, color }) {
  return (
    <div className="glass-card" style={{ padding: '18px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || '#e2e8f0', fontFamily: 'JetBrains Mono,monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

/* ─── Ticker Tag ───────────────────────────────────────────── */
function TickerTag({ ticker, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.3)',
      borderRadius: 8, padding: '4px 10px',
      fontSize: 12, fontWeight: 700, color: '#00d4aa',
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      {ticker}
      <button
        onClick={() => onRemove(ticker)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#00d4aa', fontSize: 14, lineHeight: 1,
          padding: '0 2px', opacity: 0.7,
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
        title={`Remove ${ticker}`}
      >×</button>
    </span>
  )
}

/* ─── Section Divider ──────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      {children}
      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
}

/* ─── Chart Tooltip ────────────────────────────────────────── */
function ChartTip({ active, payload, label, fmt: fmtFn }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,12,28,0.97)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e2e8f0',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#94a3b8' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill, fontFamily: 'JetBrains Mono,monospace' }}>
          {p.name}: {fmtFn ? fmtFn(p.value, p.name) : p.value}
        </div>
      ))}
    </div>
  )
}

/* ─── Active Pie Shape ─────────────────────────────────────── */
function ActivePieShape(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#e2e8f0" fontSize={15} fontWeight={700}>{payload.name}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize={12}>{(percent * 100).toFixed(1)}%</text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 12} outerRadius={outerRadius + 16}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  )
}

/* ═══════════════════════════════════════════════════════════ */
export default function MarketPulse({ showToast }) {
  const [tickers, setTickers]   = useState([...DEFAULT_TICKERS])
  const [inputVal, setInputVal] = useState('')
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [activePie, setActivePie] = useState(0)
  const inputRef = useRef(null)

  const addTicker = () => {
    const val = inputVal.trim().toUpperCase().replace(/[^A-Z.]/g, '')
    if (!val) return
    if (tickers.includes(val)) {
      showToast(`${val} is already in the list`, 'error')
      setInputVal('')
      return
    }
    setTickers(prev => [...prev, val])
    setInputVal('')
  }

  const removeTicker = (t) => setTickers(prev => prev.filter(x => x !== t))
  const resetToDefault = () => { setTickers([...DEFAULT_TICKERS]); setData(null) }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { e.preventDefault(); addTicker() }
    if (e.key === 'Backspace' && inputVal === '' && tickers.length > 0)
      setTickers(prev => prev.slice(0, -1))
  }

  const fetchPulse = async () => {
    if (tickers.length === 0) { showToast('Add at least one ticker', 'error'); return }
    setLoading(true)
    try {
      const res = await getMarketPulse(tickers)
      setData(res.data)
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to fetch market pulse', 'error')
    } finally {
      setLoading(false)
    }
  }

  /* ── Derived chart data ────────────────────────────────────── */
  const stocks = data?.stocks ?? []

  const barChangeData = stocks.map(s => ({
    name: s.symbol,
    'Change %': +(s.change_percent ?? 0).toFixed(2),
    '30d Δ':    +(s.period_change   ?? 0).toFixed(2),
  }))

  const barVolumeData = stocks.map(s => ({
    name: s.symbol,
    Volume: +(s.volume ?? 0),
  }))

  const barRiskData = stocks.map(s => ({
    name: s.symbol,
    'Ann. Vol %': +(s.annual_volatility ?? 0).toFixed(2),
    'Max Gain %': +(s.max_gain ?? 0).toFixed(2),
    'Max Loss %': Math.abs(+(s.max_loss ?? 0)).toFixed(2),
  }))

  const pieCapData = stocks
    .filter(s => (s.market_cap ?? 0) > 0)
    .map((s, i) => ({ name: s.symbol, value: s.market_cap, color: PALETTE[i % PALETTE.length] }))

  const radarData = stocks.map((s, i) => ({
    symbol: s.symbol,
    Volatility: +(s.volatility ?? 0).toFixed(2),
    'Max Gain':  Math.abs(+(s.max_gain ?? 0)).toFixed(2),
    'Max Loss':  Math.abs(+(s.max_loss ?? 0)).toFixed(2),
    'Ann Vol':   +(s.annual_volatility ?? 0).toFixed(2),
    fill: PALETTE[i % PALETTE.length],
  }))

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Market Pulse</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Customize the tickers below, then fetch aggregated market sentiment with full metrics &amp; charts.
        </p>
      </div>

      {/* Ticker builder */}
      <div className="glass-card" style={{ padding: '20px 22px', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            📊 Tickers to Analyze ({tickers.length})
          </div>
          <button
            onClick={resetToDefault}
            style={{
              background: 'none', border: '1px solid rgba(100,116,139,0.3)',
              borderRadius: 6, padding: '4px 12px', fontSize: 11, color: '#64748b', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,170,0.4)'; e.currentTarget.style.color = '#00d4aa' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(100,116,139,0.3)'; e.currentTarget.style.color = '#64748b' }}
          >↺ Reset to Default</button>
        </div>
        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
            minHeight: 44, padding: '8px 12px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, cursor: 'text',
          }}
        >
          {tickers.map(t => <TickerTag key={t} ticker={t} onRemove={removeTicker} />)}
          <input
            ref={inputRef}
            id="ticker-input"
            value={inputVal}
            onChange={e => setInputVal(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            onBlur={addTicker}
            placeholder={tickers.length === 0 ? 'Type a ticker and press Enter…' : 'Add ticker…'}
            maxLength={10}
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: '#e2e8f0', fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600, width: 140, minWidth: 80, padding: '2px 4px',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: '#334155', marginTop: 8 }}>
          Press <kbd style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, padding: '1px 5px' }}>Enter</kbd> or{' '}
          <kbd style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, padding: '1px 5px' }}>,</kbd>{' '}
          to add · <kbd style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, padding: '1px 5px' }}>Backspace</kbd> to remove last
        </div>
      </div>

      {/* Fetch button */}
      <div style={{ marginBottom: 28 }}>
        <button
          id="pulse-btn"
          className="btn-primary"
          onClick={fetchPulse}
          disabled={loading || tickers.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, padding: '12px 28px' }}
        >
          {loading ? <LoadingSpinner size={16} color="#080810" /> : <span>📡</span>}
          {loading ? 'Analyzing Market…' : `Fetch Pulse for ${tickers.length} Ticker${tickers.length !== 1 ? 's' : ''}`}
        </button>
      </div>

      {data && (
        <div className="animate-slide-up">
          {/* Sentiment banner */}
          <div style={{ marginBottom: 20 }}>
            <SentimentCard sentiment={data.sentiment} count={data.tickers_analyzed?.length ?? tickers.length} />
          </div>

          {/* Summary metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
            <MetricCard label="Gainers"    value={data.gainers}   sub="stocks up"      color="#00d4aa" />
            <MetricCard label="Losers"     value={data.losers}    sub="stocks down"     color="#ff4d6d" />
            <MetricCard label="Unchanged"  value={data.unchanged} sub="flat"            color="#f59e0b" />
            <MetricCard
              label="Avg Change"
              value={`${Number(data.average_change ?? 0) >= 0 ? '+' : ''}${Number(data.average_change ?? 0).toFixed(2)}%`}
              sub="across selection"
              color={Number(data.average_change ?? 0) >= 0 ? '#00d4aa' : '#ff4d6d'}
            />
            {stocks.length > 0 && <>
              <MetricCard
                label="Best Performer"
                value={stocks[0]?.symbol || '—'}
                sub={`+${Number(stocks[0]?.change_percent ?? 0).toFixed(2)}%`}
                color="#00d4aa"
              />
              <MetricCard
                label="Worst Performer"
                value={stocks[stocks.length - 1]?.symbol || '—'}
                sub={`${Number(stocks[stocks.length - 1]?.change_percent ?? 0).toFixed(2)}%`}
                color="#ff4d6d"
              />
              <MetricCard
                label="Total Mkt Cap"
                value={fmtCap(stocks.reduce((a, s) => a + (s.market_cap ?? 0), 0))}
                sub="combined"
                color="#6366f1"
              />
              <MetricCard
                label="Total Volume"
                value={fmtVol(stocks.reduce((a, s) => a + (s.volume ?? 0), 0))}
                sub="today"
                color="#a78bfa"
              />
            </>}
          </div>

          {/* ── Full Data Table ─────────────────────────────────── */}
          {stocks.length > 0 && (
            <div className="glass-card" style={{ overflow: 'hidden', marginBottom: 28 }}>
              <div style={{ padding: '16px 16px 0', marginBottom: 4 }}>
                <div className="section-header">Selected Stocks — Full Metrics</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Symbol</th>
                      <th>Price</th>
                      <th>Change %</th>
                      <th>30d Δ</th>
                      <th>Volume</th>
                      <th>Market Cap</th>
                      <th>Max Gain</th>
                      <th>Max Loss</th>
                      <th>Ann. Vol</th>
                      <th>Risk</th>
                      <th>Day Range</th>
                      <th>52W Range</th>
                      <th>Trend</th>
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
                        <td style={{ fontFamily: 'JetBrains Mono,monospace', color: '#e2e8f0', fontWeight: 600 }}>
                          ${Number(s.price ?? 0).toFixed(2)}
                        </td>
                        <td>{pct(s.change_percent)}</td>
                        <td>{pct(s.period_change)}</td>
                        <td style={{ fontFamily: 'JetBrains Mono,monospace', color: '#94a3b8', fontSize: 12 }}>
                          {fmtVol(s.volume)}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono,monospace', color: '#94a3b8', fontSize: 12 }}>
                          {fmtCap(s.market_cap)}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono,monospace', color: '#00d4aa', fontSize: 12 }}>
                          +{Number(s.max_gain ?? 0).toFixed(2)}%
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono,monospace', color: '#ff4d6d', fontSize: 12 }}>
                          {Number(s.max_loss ?? 0).toFixed(2)}%
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono,monospace', color: '#64748b', fontSize: 12 }}>
                          {Number(s.annual_volatility ?? 0).toFixed(1)}%
                        </td>
                        <td><RiskBadge level={s.risk_level} /></td>
                        <td style={{ fontFamily: 'JetBrains Mono,monospace', color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {s.day_range || '—'}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono,monospace', color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {s.week52_range || '—'}
                        </td>
                        <td><TrendBadge trend={s.trend} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Charts ─────────────────────────────────────────── */}
          {stocks.length > 0 && (
            <>
              <SectionLabel>Visual Analysis</SectionLabel>

              {/* Row 1: Change % + Volume */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 20, marginBottom: 20 }}>
                {/* Change % grouped bar */}
                <div className="glass-card" style={{ padding: '20px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>
                    📈 Daily Change % vs 30-Day Δ
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barChangeData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={v => `${v}%`} width={46} />
                      <Tooltip content={<ChartTip fmt={v => `${v > 0 ? '+' : ''}${v}%`} />} />
                      <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                      <Bar dataKey="Change %" radius={[4, 4, 0, 0]} fill="#00d4aa" fillOpacity={0.85} />
                      <Bar dataKey="30d Δ"   radius={[4, 4, 0, 0]} fill="#6366f1" fillOpacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Volume bar */}
                <div className="glass-card" style={{ padding: '20px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>
                    📦 Daily Volume Comparison
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barVolumeData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={v => fmtVol(v)} width={52} />
                      <Tooltip content={<ChartTip fmt={v => fmtVol(v)} />} />
                      <Bar dataKey="Volume" radius={[4, 4, 0, 0]}>
                        {barVolumeData.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Row 2: Risk/Gain/Loss bar + Market Cap pie */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 20, marginBottom: 20 }}>
                {/* Risk / Max Gain / Max Loss grouped bar */}
                <div className="glass-card" style={{ padding: '20px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>
                    ⚡ Risk — Ann. Vol, Max Gain &amp; Max Loss
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barRiskData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={v => `${v}%`} width={46} />
                      <Tooltip content={<ChartTip fmt={v => `${v}%`} />} />
                      <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                      <Bar dataKey="Ann. Vol %" radius={[4, 4, 0, 0]} fill="#6366f1" fillOpacity={0.85} />
                      <Bar dataKey="Max Gain %" radius={[4, 4, 0, 0]} fill="#00d4aa" fillOpacity={0.85} />
                      <Bar dataKey="Max Loss %" radius={[4, 4, 0, 0]} fill="#ff4d6d" fillOpacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Market Cap Donut Pie */}
                {pieCapData.length > 0 && (
                  <div className="glass-card" style={{ padding: '20px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>
                      🥧 Market Cap Distribution
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          activeIndex={activePie}
                          activeShape={ActivePieShape}
                          data={pieCapData}
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={82}
                          dataKey="value"
                          onMouseEnter={(_, idx) => setActivePie(idx)}
                        >
                          {pieCapData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0].payload
                            return (
                              <div style={{
                                background: 'rgba(10,12,28,0.97)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e2e8f0',
                              }}>
                                <div style={{ fontWeight: 700, color: d.color }}>{d.name}</div>
                                <div style={{ fontFamily: 'JetBrains Mono,monospace', marginTop: 4 }}>{fmtCap(d.value)}</div>
                              </div>
                            )
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', justifyContent: 'center', marginTop: 4 }}>
                      {pieCapData.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                          <span style={{ color: '#94a3b8' }}>{d.name}</span>
                          <span style={{ color: '#64748b', fontFamily: 'JetBrains Mono,monospace' }}>{fmtCap(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: Radar chart (risk profile) */}
              {radarData.length >= 3 && (
                <div className="glass-card" style={{ padding: '20px 16px', marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>
                    🕸 Risk Profile Radar (Volatility, Max Gain, Max Loss, Ann. Vol)
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.07)" />
                      <PolarAngleAxis dataKey="symbol" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} tick={{ fill: '#334155', fontSize: 10 }} />
                      <Radar name="Volatility" dataKey="Volatility" stroke="#00d4aa" fill="#00d4aa" fillOpacity={0.15} />
                      <Radar name="Max Gain"   dataKey="Max Gain"   stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                      <Radar name="Max Loss"   dataKey="Max Loss"   stroke="#ff4d6d" fill="#ff4d6d" fillOpacity={0.15} />
                      <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                      <Tooltip content={<ChartTip fmt={v => `${v}%`} />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
