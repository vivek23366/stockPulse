export default function Toast({ message, type = 'success' }) {
  const bg   = type === 'success' ? 'rgba(0,212,170,0.12)' : type === 'error' ? 'rgba(255,77,109,0.12)' : 'rgba(245,158,11,0.12)'
  const bdr  = type === 'success' ? 'rgba(0,212,170,0.25)' : type === 'error' ? 'rgba(255,77,109,0.25)' : 'rgba(245,158,11,0.25)'
  const clr  = type === 'success' ? '#00d4aa'               : type === 'error' ? '#ff4d6d'               : '#f59e0b'
  const icon = type === 'success' ? '✓'                     : type === 'error' ? '✕'                     : 'ℹ'

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 100,
      background: bg, border: `1px solid ${bdr}`,
      color: clr, borderRadius: 12, padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 10,
      backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      fontSize: 13, fontWeight: 500,
      animation: 'slideUp 0.3s ease',
      maxWidth: 340,
    }}>
      <span style={{ fontSize: 15, fontWeight: 700 }}>{icon}</span>
      {message}
    </div>
  )
}
