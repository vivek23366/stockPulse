import { useState } from 'react'

export default function SellModal({ holdings = [], onClose, onSell, loading }) {
  const [ticker, setTicker]     = useState(holdings[0]?.symbol || '')
  const [quantity, setQuantity] = useState('')

  const selected = holdings.find(h => h.symbol === ticker)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!ticker || !quantity || Number(quantity) <= 0) return
    onSell(ticker, Number(quantity))
  }

  if (!holdings.length) return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass-card-elevated animate-slide-up" style={{ width: '100%', maxWidth: 400, padding: 28, margin: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>💼</div>
        <div style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>No holdings to sell.</div>
        <button className="btn-secondary" onClick={onClose} style={{ width: '100%' }}>Close</button>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass-card-elevated animate-slide-up" style={{ width: '100%', maxWidth: 420, padding: 28, margin: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Sell Stock</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Select Holding
            </label>
            <select
              id="sell-ticker-select"
              value={ticker}
              onChange={e => { setTicker(e.target.value); setQuantity('') }}
              className="sp-input"
              style={{ fontFamily: 'JetBrains Mono,monospace' }}
            >
              {holdings.map(h => (
                <option key={h.symbol} value={h.symbol} style={{ background: '#1a1a2e' }}>
                  {h.symbol} — {h.shares} shares
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            }}>
              <InfoRow label="Avg Cost" value={`$${Number(selected.avg_cost).toFixed(2)}`} />
              <InfoRow label="Current" value={`$${Number(selected.current_price).toFixed(2)}`} />
              <InfoRow label="Shares" value={selected.shares} />
              <InfoRow label="P&L" value={`$${Number(selected.pnl).toFixed(2)}`} color={selected.pnl >= 0 ? '#00d4aa' : '#ff4d6d'} />
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Quantity to Sell
              {selected && <span style={{ color: '#334155', marginLeft: 8 }}>(max {Number(selected.shares).toFixed(4)})</span>}
            </label>
            <input
              id="sell-quantity-input"
              className="sp-input"
              type="number"
              placeholder="e.g. 5"
              min="0.001"
              step="any"
              max={selected?.shares}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button
              id="sell-confirm-btn"
              type="submit"
              className="btn-danger"
              disabled={loading || !ticker || !quantity || Number(quantity) <= 0 || (selected && Number(quantity) > selected.shares)}
              style={{ flex: 1 }}
            >
              {loading ? '…' : '✓ Sell'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InfoRow({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: color || '#e2e8f0', fontFamily: 'JetBrains Mono,monospace' }}>{value}</div>
    </div>
  )
}
