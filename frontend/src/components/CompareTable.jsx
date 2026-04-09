import { useState } from 'react'
import { compareStocks } from '../api/stockApi'
import LoadingSpinner from './LoadingSpinner'

function TrendBadge({ trend }) {
  if (!trend || trend === 'unknown') return <span className="badge-neutral">—</span>
  if (trend === 'bullish') return <span className="badge-bullish">▲ Bullish</span>
  if (trend === 'bearish') return <span className="badge-bearish">▼ Bearish</span>
  return <span className="badge-neutral">◆ Neutral</span>
}

function pct(n) {
  const v = Number(n ?? 0)
  const color = v >= 0 ? '#00d4aa' : '#ff4d6d'
  return <span style={{ color, fontFamily: 'JetBrains Mono,monospace', fontWeight: 600 }}>{v >= 0 ? '+' : ''}{v.toFixed(2)}%</span>
}

export default function CompareTable({ showToast }) {
  const [input, setInput]     = useState('AAPL, TSLA, MSFT')
  const [stocks, setStocks]   = useState([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const run = async (e) => {
    e?.preventDefault()
    const tickers = input.split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
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

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
          Multi-Stock Comparison
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Compare up to 8 stocks side by side.
        </p>
      </div>

      <form onSubmit={run} style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <input
          id="compare-tickers-input"
          className="sp-input"
          placeholder="e.g. AAPL, TSLA, MSFT, NVDA"
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}
        />
        <button
          id="compare-btn"
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ minWidth: 110, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
        >
          {loading && <LoadingSpinner size={14} color="#080810" />}
          {loading ? 'Fetching…' : 'Compare'}
        </button>
      </form>

      {fetched && stocks.length > 0 && (
        <div className="glass-card animate-slide-up" style={{ overflow: 'hidden' }}>
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
                        color: '#e2e8f0', fontSize: 13,
                      }}>{s.symbol}</span>
                    </td>
                    <td style={{ color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', color: '#e2e8f0', fontWeight: 600 }}>
                        ${Number(s.price ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td>{pct(s.change_percent)}</td>
                    <td>{pct(s.period_change)}</td>
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
          </div>
        </div>
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
