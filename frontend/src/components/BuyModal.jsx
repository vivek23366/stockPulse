import { useState, useRef, useEffect, useCallback } from 'react'
import { searchTickers } from '../api/stockApi'
import LoadingSpinner from './LoadingSpinner'

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

export default function BuyModal({ onClose, onBuy, loading }) {
  const [ticker, setTicker]     = useState('')
  const [quantity, setQuantity] = useState('')
  const [suggestions, setSugg]  = useState([])
  const [showDrop, setShowDrop] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [searching, setSearching] = useState(false)
  const wrapRef  = useRef(null)
  const debounce = useRef(null)

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const fetchSugg = useCallback(q => {
    clearTimeout(debounce.current)
    if (!q.trim()) { setSugg([]); setShowDrop(false); return }
    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchTickers(q.trim())
        setSugg(res.data.results || [])
        setShowDrop(true)
        setActiveIdx(-1)
      } catch { /* silent */ } finally { setSearching(false) }
    }, 180)
  }, [])

  const pick = sym => {
    setTicker(sym); setShowDrop(false); setSugg([])
  }

  const handleChange = e => {
    const v = e.target.value.toUpperCase()
    setTicker(v); fetchSugg(v)
  }

  const handleKeyDown = e => {
    if (showDrop && suggestions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
      else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); pick(suggestions[activeIdx].symbol); return }
      else if (e.key === 'Escape') { setShowDrop(false); return }
    }
  }

  const handleSubmit = e => {
    e.preventDefault()
    if (!ticker.trim() || !quantity || Number(quantity) <= 0) return
    onBuy(ticker.trim().toUpperCase(), Number(quantity))
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass-card-elevated animate-slide-up"
        style={{ width: '100%', maxWidth: 420, padding: 28, margin: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>🛒 Buy Stock</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Ticker with autocomplete */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Ticker / Company Name
            </label>
            <div ref={wrapRef} style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <input
                  id="buy-ticker-input"
                  className="sp-input"
                  placeholder="e.g. AAPL or Apple…"
                  value={ticker}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length && setShowDrop(true)}
                  autoFocus
                  autoComplete="off"
                  style={{ fontFamily: 'JetBrains Mono,monospace', letterSpacing: '0.05em', width: '100%' }}
                />
                {searching && (
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                    <LoadingSpinner size={13} color="#00d4aa" />
                  </div>
                )}
              </div>

              {showDrop && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                  background: 'rgba(10,12,28,0.97)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, overflow: 'hidden',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.6)', zIndex: 1000,
                }}>
                  {suggestions.map((s, i) => (
                    <div
                      key={s.symbol}
                      onMouseDown={() => pick(s.symbol)}
                      onMouseEnter={() => setActiveIdx(i)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', cursor: 'pointer',
                        background: i === activeIdx ? 'rgba(0,212,170,0.08)' : 'transparent',
                        borderLeft: i === activeIdx ? '2px solid #00d4aa' : '2px solid transparent',
                      }}
                    >
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 12, color: i === activeIdx ? '#00d4aa' : '#e2e8f0', minWidth: 50 }}>
                        <Highlight text={s.symbol} query={ticker} />
                      </span>
                      <span style={{ color: '#64748b', fontSize: 12, flex: 1 }}>
                        <Highlight text={s.name} query={ticker.toLowerCase()} />
                      </span>
                      {i === activeIdx && <span style={{ color: '#00d4aa', fontSize: 10 }}>↵</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Quantity (Shares)
            </label>
            <input
              id="buy-quantity-input"
              className="sp-input"
              type="number"
              placeholder="e.g. 10"
              min="0.001"
              step="any"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </div>

          <div style={{
            background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.12)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20,
            fontSize: 12, color: '#64748b',
          }}>
            💡 Bought at the <strong style={{ color: '#00d4aa' }}>current live price</strong>.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button
              id="buy-confirm-btn"
              type="submit"
              className="btn-primary"
              disabled={loading || !ticker.trim() || !quantity || Number(quantity) <= 0}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? '…' : '✓ Buy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
