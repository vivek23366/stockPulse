import { useState } from 'react'

export default function BuyModal({ onClose, onBuy, loading }) {
  const [ticker, setTicker]     = useState('')
  const [quantity, setQuantity] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!ticker.trim() || !quantity || Number(quantity) <= 0) return
    onBuy(ticker.trim().toUpperCase(), Number(quantity))
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        className="glass-card-elevated animate-slide-up"
        style={{ width: '100%', maxWidth: 400, padding: 28, margin: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Buy Stock</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#64748b',
              fontSize: 20, cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
            }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Ticker Symbol
            </label>
            <input
              id="buy-ticker-input"
              className="sp-input"
              placeholder="e.g. AAPL"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              autoFocus
              style={{ fontFamily: 'JetBrains Mono,monospace', letterSpacing: '0.05em' }}
            />
          </div>

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
            💡 Stock will be bought at the <strong style={{ color: '#00d4aa' }}>current live price</strong>.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
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
