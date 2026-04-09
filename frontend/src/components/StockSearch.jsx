import { useState } from 'react'
import { getStock } from '../api/stockApi'
import SparklineChart from './SparklineChart'
import LoadingSpinner from './LoadingSpinner'

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

export default function StockSearch({ showToast }) {
  const [ticker, setTicker]   = useState('')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const search = async (e) => {
    e?.preventDefault()
    if (!ticker.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      const res = await getStock(ticker.trim().toUpperCase())
      setData(res.data)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to fetch stock data'
      setError(msg); showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const changeColor = data && data.change_percent >= 0 ? '#00d4aa' : '#ff4d6d'
  const sparkColor  = data && data.change_percent >= 0 ? '#00d4aa' : '#ff4d6d'

  return (
    <div className="animate-slide-up" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
          Stock Search
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Enter a ticker symbol to get real-time data, trend, and volatility.
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={search} style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <input
          id="stock-ticker-input"
          className="sp-input"
          type="text"
          placeholder="e.g. AAPL, TSLA, NVDA"
          value={ticker}
          onChange={e => setTicker(e.target.value.toUpperCase())}
          style={{ letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace' }}
        />
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

      {/* Stock Card */}
      {data && (
        <div className="glass-card glow-teal animate-slide-up" style={{ padding: 28 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <span
                  className="price"
                  style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0' }}
                >
                  ${fmt(data.price)}
                </span>
                <span
                  className="price"
                  style={{
                    fontSize: 15, fontWeight: 600,
                    color: changeColor,
                    background: `${changeColor}18`,
                    padding: '3px 10px', borderRadius: 8,
                  }}
                >
                  {data.change_percent >= 0 ? '+' : ''}{fmt(data.change_percent)}%
                </span>
              </div>
              <div style={{ color: '#64748b', fontSize: 13 }}>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{data.symbol}</span>
                &nbsp;·&nbsp;{data.name}
              </div>
            </div>
            <TrendBadge trend={data.trend} />
          </div>

          {/* Sparkline */}
          <div style={{ marginBottom: 20 }}>
            <div className="section-header">30-Day Price</div>
            <SparklineChart data={data.sparkline} color={sparkColor} height={72} />
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
            {[
              ['Change',       `$${fmt(data.change)}`, changeColor],
              ['Volatility',   `${fmt(data.volatility)}%`, null],
              ['Day High',     `$${fmt(data.day_high)}`, null],
              ['Day Low',      `$${fmt(data.day_low)}`, null],
              ['52W High',     `$${fmt(data.fifty_two_week_high)}`, null],
              ['52W Low',      `$${fmt(data.fifty_two_week_low)}`, null],
              ['Volume',       fmtVol(data.volume), null],
              ['Market Cap',   fmtBig(data.market_cap), null],
              ['Ann. Volatility', `${fmt(data.annual_volatility)}%`, null],
              ['Currency',     data.currency, null],
            ].map(([label, value, color]) => (
              <div key={label} className="stat-row">
                <span className="stat-label">{label}</span>
                <span className="stat-value price" style={color ? { color } : undefined}>{value}</span>
              </div>
            ))}
          </div>

          {/* Support / Resistance */}
          {(data.support || data.resistance) && (
            <div style={{
              marginTop: 16, padding: '12px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', gap: 32,
            }}>
              <div>
                <div className="stat-label" style={{ marginBottom: 2 }}>Support</div>
                <div className="price" style={{ color: '#00d4aa', fontWeight: 600, fontSize: 13 }}>${fmt(data.support)}</div>
              </div>
              <div>
                <div className="stat-label" style={{ marginBottom: 2 }}>Resistance</div>
                <div className="price" style={{ color: '#ff4d6d', fontWeight: 600, fontSize: 13 }}>${fmt(data.resistance)}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && !loading && (
        <div style={{
          color: '#ff4d6d', background: 'rgba(255,77,109,0.08)',
          border: '1px solid rgba(255,77,109,0.2)', borderRadius: 10, padding: '12px 16px',
          fontSize: 13, marginTop: 8,
        }}>
          ⚠ {error}
        </div>
      )}
    </div>
  )
}
