import { useState } from 'react'
import { getMarketPulse } from '../api/stockApi'
import LoadingSpinner from './LoadingSpinner'

function SentimentCard({ sentiment }) {
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
      <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.01em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: '#64748b' }}>Based on {sentiment === 'unknown' ? '—' : '8 major indices'}</div>
    </div>
  )
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div className="glass-card" style={{ padding: '18px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || '#e2e8f0', fontFamily: 'JetBrains Mono,monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function pct(n) {
  const v = Number(n ?? 0)
  const color = v >= 0 ? '#00d4aa' : '#ff4d6d'
  return <span style={{ color, fontWeight: 600, fontFamily: 'JetBrains Mono,monospace' }}>{v >= 0 ? '+' : ''}{v.toFixed(2)}%</span>
}

export default function MarketPulse({ showToast }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchPulse = async () => {
    setLoading(true)
    try {
      const res = await getMarketPulse()
      setData(res.data)
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to fetch market pulse', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
          Market Pulse
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Aggregated sentiment from AAPL, GOOGL, MSFT, AMZN, TSLA, META, NVDA, JPM.
        </p>
      </div>

      <div style={{ marginBottom: 28 }}>
        <button
          id="pulse-btn"
          className="btn-primary"
          onClick={fetchPulse}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, padding: '12px 28px' }}
        >
          {loading ? <LoadingSpinner size={16} color="#080810" /> : <span>📡</span>}
          {loading ? 'Analyzing Market…' : 'Fetch Market Pulse'}
        </button>
      </div>

      {data && (
        <div className="animate-slide-up">
          {/* Main sentiment */}
          <div style={{ marginBottom: 20 }}>
            <SentimentCard sentiment={data.sentiment} />
          </div>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <MetricCard label="Gainers"      value={data.gainers}    sub="stocks up"   color="#00d4aa" />
            <MetricCard label="Losers"       value={data.losers}     sub="stocks down" color="#ff4d6d" />
            <MetricCard label="Unchanged"    value={data.unchanged}  sub="flat"        color="#f59e0b" />
            <MetricCard
              label="Avg Change"
              value={`${Number(data.average_change ?? 0) >= 0 ? '+' : ''}${Number(data.average_change ?? 0).toFixed(2)}%`}
              sub="across index"
              color={Number(data.average_change ?? 0) >= 0 ? '#00d4aa' : '#ff4d6d'}
            />
          </div>

          {/* Full table */}
          {data.stocks && data.stocks.length > 0 && (
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 16px 0', marginBottom: 4 }}>
                <div className="section-header">Index Stocks</div>
              </div>
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Price</th>
                    <th>Change %</th>
                    <th>Trend</th>
                    <th>Volatility</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stocks.map(s => (
                    <tr key={s.symbol}>
                      <td style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, color: '#e2e8f0' }}>
                        {s.symbol}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono,monospace' }}>
                        ${Number(s.price ?? 0).toFixed(2)}
                      </td>
                      <td>{pct(s.change_percent)}</td>
                      <td>
                        {s.trend === 'bullish' && <span className="badge-bullish">▲ Bullish</span>}
                        {s.trend === 'bearish' && <span className="badge-bearish">▼ Bearish</span>}
                        {(s.trend === 'neutral' || s.trend === 'unknown') && <span className="badge-neutral">◆ Neutral</span>}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono,monospace', color: '#64748b' }}>
                        {Number(s.volatility ?? 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
