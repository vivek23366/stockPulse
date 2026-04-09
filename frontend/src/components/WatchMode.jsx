import { useState, useEffect, useRef } from 'react'
import { watchStock } from '../api/stockApi'
import SparklineChart from './SparklineChart'
import LoadingSpinner from './LoadingSpinner'

const INTERVAL = 30

export default function WatchMode({ showToast }) {
  const [ticker, setTicker]     = useState('')
  const [input, setInput]       = useState('')
  const [data, setData]         = useState(null)
  const [running, setRunning]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [countdown, setCountdown] = useState(INTERVAL)
  const [lastUpdate, setLastUpdate] = useState(null)

  const timerRef     = useRef(null)
  const countdownRef = useRef(null)

  const fetchData = async (sym) => {
    setLoading(true)
    try {
      const res = await watchStock(sym)
      setData(res.data)
      setLastUpdate(new Date().toLocaleTimeString())
      setCountdown(INTERVAL)
    } catch (err) {
      showToast(err.response?.data?.detail || `Could not fetch ${sym}`, 'error')
      stopWatch()
    } finally {
      setLoading(false)
    }
  }

  const startWatch = async () => {
    if (!input.trim()) return
    const sym = input.trim().toUpperCase()
    setTicker(sym)
    setRunning(true)
    setCountdown(INTERVAL)
    await fetchData(sym)
    timerRef.current = setInterval(() => fetchData(sym), INTERVAL * 1000)
    countdownRef.current = setInterval(() => setCountdown(c => (c <= 1 ? INTERVAL : c - 1)), 1000)
  }

  const stopWatch = () => {
    setRunning(false)
    clearInterval(timerRef.current)
    clearInterval(countdownRef.current)
    timerRef.current = null
    countdownRef.current = null
  }

  useEffect(() => () => { clearInterval(timerRef.current); clearInterval(countdownRef.current) }, [])

  const fmt = (n, d = 2) => Number(n ?? 0).toFixed(d)
  const changeColor = data && data.change_percent >= 0 ? '#00d4aa' : '#ff4d6d'

  return (
    <div className="animate-slide-up" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
          Live Watch Mode
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Auto-refresh every 30 seconds. Price and trend update live.
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <input
          id="watch-ticker-input"
          className="sp-input"
          placeholder="e.g. TSLA"
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          disabled={running}
          style={{ fontFamily: 'JetBrains Mono,monospace', letterSpacing: '0.05em' }}
        />
        {!running ? (
          <button
            id="watch-start-btn"
            className="btn-primary"
            onClick={startWatch}
            disabled={!input.trim() || loading}
            style={{ minWidth: 100, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            ▶ Start
          </button>
        ) : (
          <button
            id="watch-stop-btn"
            className="btn-danger"
            onClick={stopWatch}
            style={{ minWidth: 100, whiteSpace: 'nowrap' }}
          >
            ■ Stop
          </button>
        )}
      </div>

      {/* Live badge + countdown */}
      {running && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div className="live-badge">
            <div className="live-dot" />
            Live Updating…
          </div>
          <div style={{
            fontSize: 12, color: '#64748b', fontFamily: 'JetBrains Mono,monospace',
            background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '2px 10px',
          }}>
            ⟳ Next in {countdown}s
          </div>
          {lastUpdate && (
            <div style={{ fontSize: 12, color: '#334155' }}>
              Updated {lastUpdate}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#64748b', fontSize: 14 }}>
          <LoadingSpinner size={18} /> Fetching {ticker}…
        </div>
      )}

      {/* Stock card */}
      {data && (
        <div className="glass-card animate-fade-in" style={{ padding: 28 }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span className="price" style={{ fontSize: 32, fontWeight: 800, color: '#e2e8f0' }}>
                  ${fmt(data.price)}
                </span>
                <span className="price" style={{
                  fontSize: 15, fontWeight: 700, color: changeColor,
                  background: `${changeColor}18`, padding: '3px 10px', borderRadius: 8,
                }}>
                  {data.change_percent >= 0 ? '+' : ''}{fmt(data.change_percent)}%
                </span>
                {loading && <LoadingSpinner size={14} />}
              </div>
              <div style={{ color: '#64748b', fontSize: 13 }}>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{data.symbol}</span>
                &nbsp;·&nbsp;{data.name}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              {data.trend === 'bullish' && <span className="badge-bullish">▲ Bullish</span>}
              {data.trend === 'bearish' && <span className="badge-bearish">▼ Bearish</span>}
              {(data.trend === 'neutral' || data.trend === 'unknown') && <span className="badge-neutral">◆ Neutral</span>}
            </div>
          </div>

          {/* Sparkline */}
          <div style={{ marginBottom: 20 }}>
            <div className="section-header">30-Day Chart</div>
            <SparklineChart data={data.sparkline} color={changeColor} height={80} />
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
            {[
              ['Day High',    `$${fmt(data.day_high)}`],
              ['Day Low',     `$${fmt(data.day_low)}`],
              ['Volatility',  `${fmt(data.volatility)}%`],
              ['Ann. Vol.',   `${fmt(data.annual_volatility)}%`],
              ['Prev Close',  `$${fmt(data.previous_close)}`],
              ['Change',      `$${fmt(data.change)}`, changeColor],
            ].map(([label, value, color]) => (
              <div key={label} className="stat-row">
                <span className="stat-label">{label}</span>
                <span className="stat-value price" style={color ? { color } : undefined}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
