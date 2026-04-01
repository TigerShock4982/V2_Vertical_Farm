import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import './HistoryPage.css'

export default function HistoryPage({ serverUrl }) {
  const [historyData, setHistoryData] = useState([])
  const [farmId, setFarmId] = useState(() => localStorage.getItem('farmId') || 'farm_001')
  const [deviceId, setDeviceId] = useState(() => localStorage.getItem('deviceId') || '')
  const [limit, setLimit] = useState(500)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    localStorage.setItem('farmId', farmId)
  }, [farmId])

  useEffect(() => {
    localStorage.setItem('deviceId', deviceId)
  }, [deviceId])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      let url = `${serverUrl}/api/history?limit=${limit}`
      if (farmId) url += `&farm_id=${farmId}`
      if (deviceId) url += `&device_id=${deviceId}`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const transformedData = data.data
          .reverse()
          .map((item) => ({
            timestamp: new Date(item.created_at).toLocaleTimeString(),
            air_t_c: item.air_t_c,
            air_rh_pct: item.air_rh_pct,
            water_t_c: item.water_t_c,
            water_ph: item.water_ph,
            water_ec_ms_cm: item.water_ec_ms_cm,
            light_lux: item.light_lux,
            level_float: item.level_float,
          }))
        setHistoryData(transformedData)
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [serverUrl, farmId, deviceId, limit])

  const stats = historyData.length > 0 && {
    avgAirTemp: (
      historyData.reduce((sum, d) => sum + (d.air_t_c || 0), 0) / historyData.length
    ).toFixed(1),
    maxAirTemp: Math.max(...historyData.map((d) => d.air_t_c || 0)).toFixed(1),
    avgWaterPh: (
      historyData.reduce((sum, d) => sum + (d.water_ph || 0), 0) / historyData.length
    ).toFixed(2),
    avgEC: (
      historyData.reduce((sum, d) => sum + (d.water_ec_ms_cm || 0), 0) / historyData.length
    ).toFixed(2),
    avgLight: (
      historyData.reduce((sum, d) => sum + (d.light_lux || 0), 0) / historyData.length
    ).toFixed(0),
    dataPoints: historyData.length,
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h2>Historical Data Analysis</h2>
        <div className="filter-controls">
          <div className="filter-group">
            <label>Farm:</label>
            <input
              type="text"
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
              placeholder="farm_001"
            />
          </div>
          <div className="filter-group">
            <label>Device (optional):</label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="sensor_01"
            />
          </div>
          <div className="filter-group">
            <label>Data Points:</label>
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
          <button className="refresh-btn" onClick={fetchHistory} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Avg Air Temp</div>
            <div className="stat-value">{stats.avgAirTemp}°C</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Max Air Temp</div>
            <div className="stat-value">{stats.maxAirTemp}°C</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Water pH</div>
            <div className="stat-value">{stats.avgWaterPh}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg EC</div>
            <div className="stat-value">{stats.avgEC} mS/cm</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Light</div>
            <div className="stat-value">{stats.avgLight} lux</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Data Points</div>
            <div className="stat-value">{stats.dataPoints}</div>
          </div>
        </div>
      )}

      <div className="charts-section">
        <div className="chart-container">
          <h3>Air & Water Temperature</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="timestamp" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '0.5rem',
                  color: '#e2e8f0',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="air_t_c"
                stroke="#f59e0b"
                dot={false}
                name="Air Temp (°C)"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="water_t_c"
                stroke="#06b6d4"
                dot={false}
                name="Water Temp (°C)"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Water pH & EC</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="timestamp" stroke="#94a3b8" />
              <YAxis yAxisId="left" stroke="#94a3b8" />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '0.5rem',
                  color: '#e2e8f0',
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="water_ph"
                stroke="#8b5cf6"
                dot={false}
                name="pH"
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="water_ec_ms_cm"
                stroke="#22c55e"
                dot={false}
                name="EC (mS/cm)"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Light & Water Level</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="timestamp" stroke="#94a3b8" />
              <YAxis yAxisId="left" stroke="#94a3b8" />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '0.5rem',
                  color: '#e2e8f0',
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="light_lux"
                stroke="#fbbf24"
                dot={false}
                name="Light (lux)"
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="level_float"
                stroke="#ec4899"
                dot={false}
                name="Level"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
