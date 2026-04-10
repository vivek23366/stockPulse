import { useState, useEffect, useCallback } from 'react'
import { getPortfolio, resetPortfolio, buyStock, sellStock, getStock } from '../api/stockApi'
import BuyModal from './BuyModal'
import SellModal from './SellModal'
import LoadingSpinner from './LoadingSpinner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
  LineChart, Line,
} from 'recharts'

const INITIAL  = 10000
const PALETTE  = ['#00d4aa', '#6366f1', '#f59e0b', '#ff4d6d', '#3b82f6', '#a78bfa', '#34d399', '#fb923c']
const fmt      = (n, d = 2) => Number(n ?? 0).toFixed(d)

/* ─── AI Engine ────────────────────────────────────────────── */
function explainDecision(data, holding) {
  if (!data) return null
  const cp  = Number(data.change_percent ?? 0)
  const ann = Number(data.annual_volatility ?? 0)
  const trend = data.trend
  const price = Number(data.price ?? 0)
  const sup   = Number(data.support ?? 0)
  const res   = Number(data.resistance ?? 0)
  const mg    = Number(data.max_gain ?? 0)
  const ml    = Math.abs(Number(data.max_loss ?? 0))
  const rl    = data.risk_level || 'Medium'

  const factors  = []
  const biases   = []
  let signal = 'HOLD', confidence = 50, signalColor = '#94a3b8'

  /* Signal logic */
  if (trend === 'bullish' && cp > 1) {
    signal = 'BUY'; confidence = Math.min(92, 60 + cp * 5); signalColor = '#00d4aa'
    factors.push({ label: 'Bullish Trend', impact: '+', detail: `${fmt(cp)}% daily gain confirms upward momentum` })
  } else if (trend === 'bearish' && cp < -1) {
    signal = 'SELL'; confidence = Math.min(92, 60 + Math.abs(cp) * 5); signalColor = '#ff4d6d'
    factors.push({ label: 'Bearish Trend', impact: '−', detail: `${fmt(cp)}% daily loss signals downward pressure` })
  } else if (sup > 0 && Math.abs(price - sup) / price < 0.02) {
    signal = 'BUY'; confidence = 70; signalColor = '#00d4aa'
    factors.push({ label: 'Support Bounce', impact: '+', detail: `Price within 2% of support $${fmt(sup)}` })
  } else if (res > 0 && Math.abs(price - res) / price < 0.02) {
    signal = 'SELL'; confidence = 68; signalColor = '#ff4d6d'
    factors.push({ label: 'Resistance Hit', impact: '−', detail: `Price within 2% of resistance $${fmt(res)}` })
  }

  /* Risk adjustment */
  if (ann > 40) {
    factors.push({ label: 'High Volatility', impact: '⚠', detail: `${fmt(ann)}% annual volatility — elevated risk` })
    confidence = Math.max(30, confidence - 15)
  } else if (ann < 15) {
    factors.push({ label: 'Low Volatility', impact: '+', detail: `${fmt(ann)}% annual vol — stable stock` })
    confidence = Math.min(95, confidence + 5)
  }

  /* Gain/Loss asymmetry */
  if (mg > ml * 1.5) {
    factors.push({ label: 'Positive Asymmetry', impact: '+', detail: `Max gain (${fmt(mg)}%) > max loss (${fmt(ml)}%)` })
  } else if (ml > mg * 1.5) {
    factors.push({ label: 'Negative Asymmetry', impact: '−', detail: `Max loss (${fmt(ml)}%) > max gain (${fmt(mg)}%)` })
  }

  /* Default factor */
  if (!factors.length)
    factors.push({ label: 'Neutral Market', impact: '~', detail: `No strong signal detected (${trend} trend, ${fmt(cp)}% change)` })

  /* Behavioral biases */
  if (holding && Number(holding.pnl_pct) < -10)
    biases.push({ name: 'Loss Aversion', icon: '🧠', desc: 'You may be holding losers too long hoping to break even.' })
  if (cp > 4)
    biases.push({ name: 'FOMO Risk', icon: '🚨', desc: `${fmt(cp)}% spike may trigger emotional overbuying. Stay rational.` })
  if (cp < -4)
    biases.push({ name: 'Panic Risk', icon: '😰', desc: 'Steep drop may trigger panic selling. Verify fundamentals first.' })
  if (holding && Number(holding.pnl_pct) > 20)
    biases.push({ name: 'Disposition Effect', icon: '💰', desc: 'You may sell winners too early. Let profits run if trend holds.' })
  if (!biases.length)
    biases.push({ name: 'No Bias Detected', icon: '✅', desc: 'No major behavioral traps detected for this position.' })

  /* Market regime */
  let regime = 'Sideways', regimeColor = '#f59e0b', regimeIcon = '〰️'
  if (trend === 'bullish' && ann < 25)    { regime = 'Bull Run';  regimeColor = '#00d4aa'; regimeIcon = '🐂' }
  else if (trend === 'bullish' && ann > 35){ regime = 'Volatile Bull'; regimeColor = '#34d399'; regimeIcon = '⚡' }
  else if (trend === 'bearish' && ann < 25){ regime = 'Bear Market'; regimeColor = '#ff4d6d'; regimeIcon = '🐻' }
  else if (trend === 'bearish' && ann > 35){ regime = 'Crash Risk'; regimeColor = '#a78bfa'; regimeIcon = '💥' }

  return { signal, confidence, signalColor, factors, biases, regime, regimeColor, regimeIcon, rl }
}

/* ─── Sub-components ───────────────────────────────────────── */
function StatTile({ label, value, color, sub }) {
  return (
    <div className="glass-card" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 10, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || '#e2e8f0', fontFamily: 'JetBrains Mono,monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      margin: '24px 0 16px', display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      {children}
      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
}

/* ─── AI Analyser panel ────────────────────────────────────── */
function AIPanel({ portfolio, showToast }) {
  const [selectedSym, setSelectedSym] = useState('')
  const [aiData, setAiData]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [replay, setReplay]   = useState([])      // decision history

  const analyse = async (sym) => {
    if (!sym) return
    setLoading(true)
    try {
      const res = await getStock(sym)
      const d   = res.data
      const holding = portfolio?.holdings?.find(h => h.symbol === sym)
      const decision = explainDecision(d, holding)
      setAiData({ ...d, ...decision, holding, timestamp: new Date().toLocaleTimeString() })
      // Append to replay log
      setReplay(prev => [{
        time: new Date().toLocaleTimeString(),
        sym, signal: decision.signal, confidence: decision.confidence,
        signalColor: decision.signalColor, price: Number(d.price).toFixed(2),
        reason: decision.factors[0]?.label || '—',
      }, ...prev.slice(0, 19)])
    } catch (err) {
      showToast(err.response?.data?.detail || `Could not analyse ${sym}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const holdings = portfolio?.holdings || []

  return (
    <div>
      {/* Stock picker */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {holdings.length === 0 ? (
          <div style={{ color: '#334155', fontSize: 13 }}>Buy stocks first to enable AI analysis.</div>
        ) : (
          holdings.map((h, i) => (
            <button
              key={h.symbol}
              onClick={() => { setSelectedSym(h.symbol); analyse(h.symbol) }}
              style={{
                background: selectedSym === h.symbol ? `${PALETTE[i % PALETTE.length]}25` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedSym === h.symbol ? PALETTE[i % PALETTE.length] : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 8, padding: '6px 16px', cursor: 'pointer',
                color: selectedSym === h.symbol ? PALETTE[i % PALETTE.length] : '#94a3b8',
                fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 13,
                transition: 'all 0.15s',
              }}
            >
              {h.symbol}
              <span style={{ marginLeft: 6, fontSize: 11, color: h.pnl_pct >= 0 ? '#00d4aa' : '#ff4d6d' }}>
                {h.pnl_pct >= 0 ? '+' : ''}{fmt(h.pnl_pct)}%
              </span>
            </button>
          ))
        )}
        {loading && <LoadingSpinner size={16} />}
      </div>

      {aiData && (
        <div className="animate-slide-up">

          {/* ── Signal box ── */}
          <div style={{
            background: `${aiData.signalColor}10`,
            border: `1px solid ${aiData.signalColor}30`,
            borderRadius: 14, padding: '20px 24px', marginBottom: 20,
            display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>AI Signal</div>
              <div style={{
                fontSize: 28, fontWeight: 900, color: aiData.signalColor,
                fontFamily: 'JetBrains Mono,monospace', letterSpacing: 2,
              }}>{aiData.signal}</div>
            </div>

            {/* Confidence gauge */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 5 }}>
                <span>Confidence</span><span style={{ color: aiData.signalColor, fontWeight: 700 }}>{aiData.confidence}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${aiData.confidence}%`,
                  background: `linear-gradient(90deg, ${aiData.signalColor}80, ${aiData.signalColor})`,
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>

            {/* Regime */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Market Regime</div>
              <div style={{ fontSize: 22 }}>{aiData.regimeIcon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: aiData.regimeColor }}>{aiData.regime}</div>
            </div>

            {/* Risk */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Risk Level</div>
              <div style={{
                fontSize: 14, fontWeight: 800,
                color: { Low: '#00d4aa', Medium: '#f59e0b', High: '#ff4d6d', Extreme: '#a78bfa' }[aiData.rl] || '#94a3b8',
              }}>{aiData.rl}</div>
            </div>

            <div style={{ fontSize: 11, color: '#334155', marginLeft: 'auto' }}>Updated {aiData.timestamp}</div>
          </div>

          {/* ── Explainable AI Factors ── */}
          <SectionLabel>🧩 Explainable AI — Decision Factors</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {aiData.factors.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10, padding: '12px 16px',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: f.impact === '+' ? 'rgba(0,212,170,0.15)' : f.impact === '−' ? 'rgba(255,77,109,0.15)' : 'rgba(245,158,11,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 900,
                  color: f.impact === '+' ? '#00d4aa' : f.impact === '−' ? '#ff4d6d' : '#f59e0b',
                }}>{f.impact}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{f.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Behavioral Bias Detection ── */}
          <SectionLabel>🧠 Behavioral Bias Detection</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, marginBottom: 20 }}>
            {aiData.biases.map((b, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10, padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{b.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{b.name}</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{b.desc}</div>
              </div>
            ))}
          </div>

          {/* ── Adaptive Trader Metrics bar chart ── */}
          <SectionLabel>⚙️ Adaptive Metrics — {aiData.symbol}</SectionLabel>
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={[
                  { name: 'Daily Vol', value: +fmt(aiData.volatility), fill: '#6366f1' },
                  { name: 'Ann Vol',   value: +fmt(aiData.annual_volatility, 1), fill: '#f59e0b' },
                  { name: 'Max Gain', value: +fmt(aiData.max_gain), fill: '#00d4aa' },
                  { name: 'Max Loss', value: Math.abs(+fmt(aiData.max_loss)), fill: '#ff4d6d' },
                  { name: 'Confidence', value: aiData.confidence, fill: aiData.signalColor },
                ]}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div style={{ background: 'rgba(10,12,28,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                        <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
                        <div style={{ color: payload[0].payload.fill, fontFamily: 'JetBrains Mono,monospace' }}>{payload[0].value}%</div>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[...Array(5)].map((_, i) => (
                    <Cell key={i} fill={['#6366f1', '#f59e0b', '#00d4aa', '#ff4d6d', aiData.signalColor][i]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Decision Replay System ── */}
      {replay.length > 0 && (
        <>
          <SectionLabel>🎬 Decision Replay Log</SectionLabel>
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Symbol</th>
                    <th>Signal</th>
                    <th>Confidence</th>
                    <th>Price</th>
                    <th>Key Factor</th>
                  </tr>
                </thead>
                <tbody>
                  {replay.map((r, i) => (
                    <tr key={i}>
                      <td style={{ color: '#334155', fontFamily: 'JetBrains Mono,monospace', fontSize: 11 }}>{r.time}</td>
                      <td style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, color: PALETTE[i % PALETTE.length] }}>{r.sym}</td>
                      <td>
                        <span style={{
                          background: `${r.signalColor}15`, border: `1px solid ${r.signalColor}40`,
                          color: r.signalColor, borderRadius: 6, padding: '2px 10px',
                          fontWeight: 800, fontSize: 12, fontFamily: 'JetBrains Mono,monospace',
                        }}>{r.signal}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ height: 6, width: 60, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }}>
                            <div style={{ height: '100%', borderRadius: 3, width: `${r.confidence}%`, background: r.signalColor }} />
                          </div>
                          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: r.signalColor }}>{r.confidence}%</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono,monospace', color: '#e2e8f0' }}>${r.price}</td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
export default function PaperTrading({ showToast }) {
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [showBuy, setShowBuy]     = useState(false)
  const [showSell, setShowSell]   = useState(false)
  const [txLoading, setTxLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('portfolio')  // 'portfolio' | 'ai'

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await getPortfolio(); setPortfolio(res.data) }
    catch { showToast('Failed to load portfolio', 'error') }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const handleBuy = async (ticker, quantity) => {
    setTxLoading(true)
    try {
      const res = await buyStock(ticker, quantity)
      showToast(res.data.message, 'success')
      setShowBuy(false); await load()
    } catch (err) { showToast(err.response?.data?.detail || 'Buy failed', 'error') }
    finally { setTxLoading(false) }
  }

  const handleSell = async (ticker, quantity) => {
    setTxLoading(true)
    try {
      const res = await sellStock(ticker, quantity)
      showToast(res.data.message, 'success')
      setShowSell(false); await load()
    } catch (err) { showToast(err.response?.data?.detail || 'Sell failed', 'error') }
    finally { setTxLoading(false) }
  }

  const handleReset = async () => {
    if (!window.confirm('Reset portfolio to $10,000? This cannot be undone.')) return
    try { await resetPortfolio(); showToast('Portfolio reset to $10,000', 'info'); await load() }
    catch { showToast('Reset failed', 'error') }
  }

  const pnl      = portfolio?.pnl ?? 0
  const pnlColor = pnl >= 0 ? '#00d4aa' : '#ff4d6d'
  const pnlPct   = portfolio?.pnl_pct ?? 0

  /* Chart data */
  const holdingsPieData = (portfolio?.holdings || []).map((h, i) => ({
    name: h.symbol, value: Number(h.market_value), color: PALETTE[i % PALETTE.length],
  }))
  const pnlBarData = (portfolio?.holdings || []).map((h, i) => ({
    name: h.symbol, 'P&L %': +fmt(h.pnl_pct),
    fill: Number(h.pnl_pct) >= 0 ? '#00d4aa' : '#ff4d6d',
  }))

  const TABS = [
    { key: 'portfolio', label: '💼 Portfolio' },
    { key: 'ai',        label: '🤖 AI Advisor' },
  ]

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Paper Trading</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Virtual portfolio · AI signals · Explainable decisions · Bias detection</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {loading && <LoadingSpinner size={16} />}
          <button id="refresh-portfolio-btn" className="btn-secondary" onClick={load} disabled={loading}>⟳ Refresh</button>
          <button id="buy-btn" className="btn-primary" onClick={() => setShowBuy(true)}>+ Buy</button>
          <button
            id="sell-btn" className="btn-secondary" onClick={() => setShowSell(true)}
            disabled={!portfolio?.holdings?.length}
            style={{ color: '#ff4d6d', borderColor: 'rgba(255,77,109,0.2)' }}
          >− Sell</button>
          <button id="reset-btn" className="btn-danger" onClick={handleReset}>Reset</button>
        </div>
      </div>

      {portfolio && (
        <>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 24 }}>
            <StatTile label="Cash Balance"
              value={`$${Number(portfolio.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              color="#e2e8f0" sub="Available to trade" />
            <StatTile label="Portfolio Value"
              value={`$${Number(portfolio.total_portfolio_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              color="#e2e8f0" sub="Cash + Holdings" />
            <StatTile label="Market Value"
              value={`$${Number(portfolio.market_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              color="#e2e8f0" sub="Holdings at market" />
            <StatTile label="Total P&L"
              value={`${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              color={pnlColor} sub={`${pnlPct >= 0 ? '+' : ''}${fmt(pnlPct)}% vs $${INITIAL.toLocaleString()}`} />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 20px', fontSize: 13, fontWeight: 700,
                color: activeTab === t.key ? '#00d4aa' : '#64748b',
                borderBottom: activeTab === t.key ? '2px solid #00d4aa' : '2px solid transparent',
                transition: 'all 0.15s',
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── Portfolio tab ── */}
          {activeTab === 'portfolio' && (
            <>
              {/* Holdings table */}
              <div className="glass-card" style={{ overflow: 'hidden', marginBottom: 24 }}>
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
                          <th>Symbol</th><th>Shares</th><th>Avg Cost</th>
                          <th>Current Price</th><th>Market Value</th>
                          <th>P&L</th><th>P&L %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.holdings.map((h, i) => (
                          <tr key={h.symbol}>
                            <td style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, color: PALETTE[i % PALETTE.length] }}>{h.symbol}</td>
                            <td style={{ fontFamily: 'JetBrains Mono,monospace' }}>{Number(h.shares).toFixed(4)}</td>
                            <td style={{ fontFamily: 'JetBrains Mono,monospace' }}>${fmt(h.avg_cost)}</td>
                            <td style={{ fontFamily: 'JetBrains Mono,monospace' }}>${fmt(h.current_price)}</td>
                            <td style={{ fontFamily: 'JetBrains Mono,monospace' }}>${Number(h.market_value).toFixed(2)}</td>
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

              {/* Portfolio charts */}
              {portfolio.holdings.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>
                  {/* Holdings allocation pie */}
                  <div className="glass-card" style={{ padding: '20px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 16 }}>🥧 Holdings Allocation</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={holdingsPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                          {holdingsPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) =>
                            active && payload?.length ? (
                              <div style={{ background: 'rgba(10,12,28,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                                <div style={{ color: payload[0].payload.color, fontWeight: 700 }}>{payload[0].payload.name}</div>
                                <div style={{ fontFamily: 'JetBrains Mono,monospace' }}>${Number(payload[0].value).toFixed(2)}</div>
                              </div>
                            ) : null
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', justifyContent: 'center' }}>
                      {holdingsPieData.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                          <span style={{ color: '#94a3b8' }}>{d.name}</span>
                          <span style={{ color: '#64748b', fontFamily: 'JetBrains Mono,monospace' }}>${Number(d.value).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* P&L % bar chart */}
                  <div className="glass-card" style={{ padding: '20px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 16 }}>📊 P&L % per Holding</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={pnlBarData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                          tickFormatter={v => `${v}%`} width={42} />
                        <Tooltip
                          content={({ active, payload, label }) =>
                            active && payload?.length ? (
                              <div style={{ background: 'rgba(10,12,28,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                                <div style={{ color: '#94a3b8' }}>{label}</div>
                                <div style={{ color: payload[0].payload.fill, fontFamily: 'JetBrains Mono,monospace' }}>
                                  {payload[0].value > 0 ? '+' : ''}{payload[0].value}%
                                </div>
                              </div>
                            ) : null
                          }
                        />
                        <Bar dataKey="P&L %" radius={[4, 4, 0, 0]}>
                          {pnlBarData.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.85} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── AI Advisor tab ── */}
          {activeTab === 'ai' && (
            <AIPanel portfolio={portfolio} showToast={showToast} />
          )}
        </>
      )}

      {!portfolio && !loading && (
        <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginTop: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          Could not load portfolio. Make sure the backend is running.
        </div>
      )}

      {showBuy && <BuyModal onClose={() => setShowBuy(false)} onBuy={handleBuy} loading={txLoading} />}
      {showSell && <SellModal holdings={portfolio?.holdings || []} onClose={() => setShowSell(false)} onSell={handleSell} loading={txLoading} />}
    </div>
  )
}
