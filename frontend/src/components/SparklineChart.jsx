import {
  LineChart, Line, ResponsiveContainer, Tooltip, YAxis
} from 'recharts'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div style={{
      background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8, padding: '6px 10px', fontSize: 11,
      fontFamily: 'JetBrains Mono, monospace', color: '#e2e8f0',
    }}>
      <div style={{ color: '#64748b', marginBottom: 2 }}>{d.payload.date}</div>
      <div style={{ color: d.value > 0 ? '#00d4aa' : '#ff4d6d' }}>
        ${Number(d.value).toFixed(2)}
      </div>
    </div>
  )
}

export default function SparklineChart({ data = [], color = '#00d4aa', height = 60 }) {
  if (!data.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 11 }}>
      No data
    </div>
  )

  const min = Math.min(...data.map(d => d.close))
  const max = Math.max(...data.map(d => d.close))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
        <YAxis domain={[min * 0.995, max * 1.005]} hide />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="close"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
