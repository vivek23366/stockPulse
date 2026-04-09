import { useState, useEffect, useCallback } from 'react'
import { getPortfolio, resetPortfolio } from '../api/stockApi'
import { buyStock, sellStock } from '../api/stockApi'
import BuyModal from './BuyModal'
import SellModal from './SellModal'
import LoadingSpinner from './LoadingSpinner'

const INITIAL = 10000

function fmt(n, d = 2) { return Number(n ?? 0).toFixed(d) }

function StatTile({ label, value, color, sub }) {
  return (
    <div className="glass-card" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 10, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || '#e2e8f0', fontFamily: 'JetBrains Mono,monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function PaperTrading({ showToast }) {
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [showBuy, setShowBuy]     = useState(false)
  const [showSell, setShowSell]   = useState(false)
  const [txLoading, setTxLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPortfolio()
      setPortfolio(res.data)
    } catch (err) {
      showToast('Failed to load portfolio', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const handleBuy = async (ticker, quantity) => {
    setTxLoading(true)
    try {
      const res = await buyStock(ticker, quantity)
      showToast(res.data.message, 'success')
      setShowBuy(false)
      await load()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Buy failed', 'error')
    } finally {
      setTxLoading(false)
    }
  }

  const handleSell = async (ticker, quantity) => {
    setTxLoading(true)
    try {
      const res = await sellStock(ticker, quantity)
      showToast(res.data.message, 'success')
      setShowSell(false)
      await load()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Sell failed', 'error')
    } finally {
      setTxLoading(false)
    }
  }

  const handleReset = async () => {
    if (!window.confirm('Reset portfolio to $10,000? This cannot be undone.')) return
    try {
      await resetPortfolio()
      showToast('Portfolio reset to $10,000', 'info')
      await load()
    } catch (err) {
      showToast('Reset failed', 'error')
    }
  }

  const pnl      = portfolio?.pnl ?? 0
  const pnlColor = pnl >= 0 ? '#00d4aa' : '#ff4d6d'
  const pnlPct   = portfolio?.pnl_pct ?? 0

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Paper Trading</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Virtual portfolio with $10,000 starting balance.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {loading && <LoadingSpinner size={16} />}
          <button id="refresh-portfolio-btn" className="btn-secondary" onClick={load} disabled={loading}>⟳ Refresh</button>
          <button id="buy-btn" className="btn-primary" onClick={() => setShowBuy(true)}>+ Buy</button>
          <button id="sell-btn" className="btn-secondary" onClick={() => setShowSell(true)}
            disabled={!portfolio?.holdings?.length}
            style={{ color: '#ff4d6d', borderColor: 'rgba(255,77,109,0.2)' }}
          >− Sell</button>
          <button id="reset-btn" className="btn-danger" onClick={handleReset}>Reset</button>
        </div>
      </div>

      {portfolio && (
        <>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
            <StatTile
              label="Cash Balance"
              value={`$${Number(portfolio.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="#e2e8f0"
              sub="Available to trade"
            />
            <StatTile
              label="Portfolio Value"
              value={`$${Number(portfolio.total_portfolio_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="#e2e8f0"
              sub="Cash + Holdings"
            />
            <StatTile
              label="Market Value"
              value={`$${Number(portfolio.market_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="#e2e8f0"
              sub="Holdings at market"
            />
            <StatTile
              label="Total P&L"
              value={`${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              color={pnlColor}
              sub={`${pnlPct >= 0 ? '+' : ''}${fmt(pnlPct)}% vs $${INITIAL.toLocaleString()}`}
            />
          </div>

          {/* Holdings table */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '18px 18px 0', marginBottom: 4 }}>
              <div className="section-header">Holdings</div>
            </div>

            {portfolio.holdings.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#334155', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>💼</div>
                No holdings yet. Click <strong style={{ color: '#00d4aa' }}>+ Buy</strong> to get started.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Shares</th>
                      <th>Avg Cost</th>
                      <th>Current Price</th>
                      <th>Market Value</th>
                      <th>P&L</th>
                      <th>P&L %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.holdings.map(h => (
                      <tr key={h.symbol}>
                        <td style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, color: '#e2e8f0' }}>
                          {h.symbol}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono,monospace' }}>
                          {Number(h.shares).toFixed(4)}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono,monospace' }}>
                          ${fmt(h.avg_cost)}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono,monospace' }}>
                          ${fmt(h.current_price)}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono,monospace' }}>
                          ${Number(h.market_value).toFixed(2)}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono,monospace', color: h.pnl >= 0 ? '#00d4aa' : '#ff4d6d', fontWeight: 600 }}>
                          {h.pnl >= 0 ? '+' : ''}${Number(h.pnl).toFixed(2)}
                        </td>
                        <td>
                          <span style={{
                            fontFamily: 'JetBrains Mono,monospace',
                            color: h.pnl_pct >= 0 ? '#00d4aa' : '#ff4d6d',
                            background: h.pnl_pct >= 0 ? 'rgba(0,212,170,0.08)' : 'rgba(255,77,109,0.08)',
                            padding: '2px 8px', borderRadius: 5, fontSize: 12, fontWeight: 600,
                          }}>
                            {h.pnl_pct >= 0 ? '+' : ''}{fmt(h.pnl_pct)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!portfolio && !loading && (
        <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginTop: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          Could not load portfolio. Make sure the backend is running.
        </div>
      )}

      {showBuy && (
        <BuyModal
          onClose={() => setShowBuy(false)}
          onBuy={handleBuy}
          loading={txLoading}
        />
      )}

      {showSell && (
        <SellModal
          holdings={portfolio?.holdings || []}
          onClose={() => setShowSell(false)}
          onSell={handleSell}
          loading={txLoading}
        />
      )}
    </div>
  )
}
