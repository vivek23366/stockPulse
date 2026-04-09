import { useState, useRef } from 'react'
import { getMarketPulse } from '../api/stockApi'
import LoadingSpinner from './LoadingSpinner'

const DEFAULT_TICKERS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM']

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
      <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.01em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: '#64748b' }}>
        Based on {count} stock{count !== 1 ? 's' : ''}
      </div>
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

function TickerTag({ ticker, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.3)',
      borderRadius: 8, padding: '4px 10px',
      fontSize: 12, fontWeight: 700, color: '#00d4aa',
      fontFamily: 'JetBrains Mono, monospace',
      transition: 'all 0.15s',
    }}>
      {ticker}
      <button
        onClick={() => onRemove(ticker)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#00d4aa', fontSize: 14, lineHeight: 1,
          padding: '0 2px', borderRadius: 4,
          display: 'flex', alignItems: 'center',
          opacity: 0.7,
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
        title={`Remove ${ticker}`}
      >×</button>
    </span>
  )
}

export default function MarketPulse({ showToast }) {
  const [tickers, setTickers] = useState([...DEFAULT_TICKERS])
  const [inputVal, setInputVal]   = useState('')
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(false)
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

  const removeTicker = (ticker) => {
    setTickers(prev => prev.filter(t => t !== ticker))
  }

  const resetToDefault = () => {
    setTickers([...DEFAULT_TICKERS])
    setData(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      addTicker()
    }
    if (e.key === 'Backspace' && inputVal === '' && tickers.length > 0) {
      setTickers(prev => prev.slice(0, -1))
    }
  }

  const fetchPulse = async () => {
    if (tickers.length === 0) {
      showToast('Add at least one ticker', 'error')
      return
    }
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

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
          Market Pulse
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Customize the tickers below, then fetch aggregated market sentiment.
        </p>
      </div>

      {/* ── Ticker builder ── */}
      <div className="glass-card" style={{ padding: '20px 22px', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            📊 Tickers to Analyze ({tickers.length})
          </div>
          <button
            onClick={resetToDefault}
            style={{
              background: 'none', border: '1px solid rgba(100,116,139,0.3)',
              borderRadius: 6, padding: '4px 12px',
              fontSize: 11, color: '#64748b', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,170,0.4)'; e.currentTarget.style.color = '#00d4aa' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(100,116,139,0.3)'; e.currentTarget.style.color = '#64748b' }}
          >
            ↺ Reset to Default
          </button>
        </div>

        {/* Tag container — clicking anywhere focuses the input */}
        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
            minHeight: 44, padding: '8px 12px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, cursor: 'text',
            transition: 'border-color 0.2s',
          }}
        >
          {tickers.map(t => (
            <TickerTag key={t} ticker={t} onRemove={removeTicker} />
          ))}
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
              fontWeight: 600, width: 140, minWidth: 80,
              padding: '2px 4px',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: '#334155', marginTop: 8 }}>
          Press <kbd style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, padding: '1px 5px', fontFamily: 'inherit' }}>Enter</kbd> or{' '}
          <kbd style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, padding: '1px 5px', fontFamily: 'inherit' }}>,</kbd>{' '}
          to add · <kbd style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, padding: '1px 5px', fontFamily: 'inherit' }}>Backspace</kbd> to remove last
        </div>
      </div>

      {/* ── Fetch button ── */}
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
          {/* Main sentiment */}
          <div style={{ marginBottom: 20 }}>
            <SentimentCard sentiment={data.sentiment} count={data.tickers_analyzed?.length ?? tickers.length} />
          </div>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <MetricCard label="Gainers"   value={data.gainers}   sub="stocks up"   color="#00d4aa" />
            <MetricCard label="Losers"    value={data.losers}    sub="stocks down"  color="#ff4d6d" />
            <MetricCard label="Unchanged" value={data.unchanged} sub="flat"         color="#f59e0b" />
            <MetricCard
              label="Avg Change"
              value={`${Number(data.average_change ?? 0) >= 0 ? '+' : ''}${Number(data.average_change ?? 0).toFixed(2)}%`}
              sub="across selection"
              color={Number(data.average_change ?? 0) >= 0 ? '#00d4aa' : '#ff4d6d'}
            />
          </div>

          {/* Full table */}
          {data.stocks && data.stocks.length > 0 && (
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 16px 0', marginBottom: 4 }}>
                <div className="section-header">Selected Stocks</div>
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
