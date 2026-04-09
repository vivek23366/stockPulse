import { useState, useEffect, useCallback } from 'react'
import Navbar from './components/Navbar'
import StockSearch from './components/StockSearch'
import CompareTable from './components/CompareTable'
import MarketPulse from './components/MarketPulse'
import WatchMode from './components/WatchMode'
import PaperTrading from './components/PaperTrading'
import Toast from './components/Toast'

const TABS = [
  { id: 'search',  label: 'Search',   icon: '🔍' },
  { id: 'compare', label: 'Compare',  icon: '⚖️' },
  { id: 'pulse',   label: 'Pulse',    icon: '📡' },
  { id: 'watch',   label: 'Watch',    icon: '👁' },
  { id: 'trade',   label: 'Trade',    icon: '💼' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('search')
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#080810' }}>
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} tabs={TABS} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-fade-in" key={activeTab}>
          {activeTab === 'search'  && <StockSearch showToast={showToast} />}
          {activeTab === 'compare' && <CompareTable showToast={showToast} />}
          {activeTab === 'pulse'   && <MarketPulse showToast={showToast} />}
          {activeTab === 'watch'   && <WatchMode showToast={showToast} />}
          {activeTab === 'trade'   && <PaperTrading showToast={showToast} />}
        </div>
      </main>

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}
    </div>
  )
}
