import { useState, useEffect, useRef } from 'react'
import './DashboardPage.css'

export default function DashboardPage({ serverUrl }) {
  const [currentSensor, setCurrentSensor] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [farmId, setFarmId] = useState(() => localStorage.getItem('farmId') || 'farm_001')
  const wsRef = useRef(null)
  const alertTimeoutRef = useRef({})

  useEffect(() => {
    localStorage.setItem('farmId', farmId)
  }, [farmId])

  // Fetch latest sensor data
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const response = await fetch(`${serverUrl}/latest`)
        if (response.ok) {
          const data = await response.json()
          setCurrentSensor(data)
        }
      } catch (error) {
        console.error('Failed to fetch latest sensor:', error)
      }
    }

    fetchLatest()
    const interval = setInterval(fetchLatest, 2000)
    return () => clearInterval(interval)
  }, [serverUrl])

  // WebSocket connection for real-time updates
  useEffect(() => {
    const wsUrl = serverUrl.replace('http', 'ws') + '/ws'

    const connectWs = () => {
      try {
        wsRef.current = new WebSocket(wsUrl)
        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            if (message.type === 'sensor') {
              setCurrentSensor({
                farm_id: message.farm_id,
                device_id: message.device_id,
                ts: message.ts,
                seq: message.seq,
                air_t_c: message.data.air_t_c,
                air_rh_pct: message.data.air_rh_pct,
                air_p_hpa: message.data.air_p_hpa,
                water_t_c: message.data.water_t_c,
                water_ph: message.data.water_ph,
                water_ec_ms_cm: message.data.water_ec_ms_cm,
                light_lux: message.data.light_lux,
                level_float: message.data.level_float,
              })

              // Add alerts with timeout for automatic removal
              if (message.alerts && message.alerts.length > 0) {
                message.alerts.forEach(alert => {
                  const alertKey = `${alert.device_id}-${alert.code}`

                  // Clear existing timeout for this alert
                  if (alertTimeoutRef.current[alertKey]) {
                    clearTimeout(alertTimeoutRef.current[alertKey])
                  }

                  // Add alert
                  setAlerts(prev => {
                    const exists = prev.some(a => a.code === alert.code && a.device_id === alert.device_id)
                    if (!exists) {
                      return [alert, ...prev].slice(0, 10)
                    }
                    return prev
                  })

                  // Auto-remove after 8 seconds
                  alertTimeoutRef.current[alertKey] = setTimeout(() => {
                    setAlerts(prev => prev.filter(a => !(a.device_id === alert.device_id && a.code === alert.code)))
                    delete alertTimeoutRef.current[alertKey]
                  }, 8000)
                })
              }
            }
          } catch (e) {
            console.error('WebSocket message parse error:', e)
          }
        }
        wsRef.current.onerror = () => {
          setTimeout(connectWs, 3000)
        }
      } catch (error) {
        console.error('WebSocket connection error:', error)
        setTimeout(connectWs, 3000)
      }
    }

    connectWs()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [serverUrl])

  // Fetch alerts on load
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch(`${serverUrl}/alerts?farm_id=${farmId}&limit=10`)
        if (response.ok) {
          const data = await response.json()
          setAlerts(data.alerts || [])
        }
      } catch (error) {
        console.error('Failed to fetch alerts:', error)
      }
    }

    fetchAlerts()
  }, [serverUrl, farmId])

  const formatTime = (ts) => {
    if (!ts) return 'N/A'
    const date = new Date(ts)
    return date.toLocaleTimeString()
  }

  const getSensorStatus = () => {
    if (!currentSensor) return 'No Data'
    const age = Date.now() - (currentSensor.ts || Date.now())
    if (age > 10000) return 'Stale'
    return 'Live'
  }

  const getSensorStatusClass = () => {
    const status = getSensorStatus()
    if (status === 'Live') return 'live'
    if (status === 'Stale') return 'stale'
    return 'offline'
  }

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return '#ef4444'
      case 'WARNING':
        return '#f59e0b'
      case 'INFO':
        return '#3b82f6'
      default:
        return '#e2e8f0'
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Real-Time Sensor Dashboard</h2>
        <div className="farm-selector">
          <label>Farm:</label>
          <input
            type="text"
            value={farmId}
            onChange={(e) => setFarmId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && window.location.reload()}
          />
        </div>
      </div>

      <div className="sensor-status-card">
        <div className="status-content">
          <div className={`status-badge ${getSensorStatusClass()}`}>
            {getSensorStatus()}
          </div>
          <div className="status-info">
            {currentSensor ? (
              <>
                <div className="device-info">Device: {currentSensor.device_id}</div>
                <div className="timestamp">Last Update: {formatTime(currentSensor.ts)}</div>
                <div className="seq">Sequence: {currentSensor.seq}</div>
              </>
            ) : (
              <div>Waiting for sensor data...</div>
            )}
          </div>
        </div>
      </div>

      {currentSensor && (
        <div className="sensor-grid">
          <div className="sensor-card air">
            <div className="card-icon">🌡️</div>
            <div className="card-title">Air</div>
            <div className="card-values">
              <div className="value">
                <span className="label">Temperature</span>
                <span className="number">{currentSensor.air_t_c?.toFixed(1) || 'N/A'}°C</span>
              </div>
              <div className="value">
                <span className="label">Humidity</span>
                <span className="number">{currentSensor.air_rh_pct?.toFixed(1) || 'N/A'}%</span>
              </div>
              <div className="value">
                <span className="label">Pressure</span>
                <span className="number">{currentSensor.air_p_hpa?.toFixed(1) || 'N/A'} hPa</span>
              </div>
            </div>
          </div>

          <div className="sensor-card water">
            <div className="card-icon">💧</div>
            <div className="card-title">Water</div>
            <div className="card-values">
              <div className="value">
                <span className="label">Temperature</span>
                <span className="number">{currentSensor.water_t_c?.toFixed(1) || 'N/A'}°C</span>
              </div>
              <div className="value">
                <span className="label">pH</span>
                <span className="number">{currentSensor.water_ph?.toFixed(2) || 'N/A'}</span>
              </div>
              <div className="value">
                <span className="label">EC</span>
                <span className="number">{currentSensor.water_ec_ms_cm?.toFixed(2) || 'N/A'} mS/cm</span>
              </div>
            </div>
          </div>

          <div className="sensor-card light">
            <div className="card-icon">💡</div>
            <div className="card-title">Light</div>
            <div className="card-values">
              <div className="value">
                <span className="label">Illuminance</span>
                <span className="number">{currentSensor.light_lux?.toFixed(0) || 'N/A'} lux</span>
              </div>
            </div>
          </div>

          <div className="sensor-card level">
            <div className="card-icon">📊</div>
            <div className="card-title">Level</div>
            <div className="card-values">
              <div className="value">
                <span className="label">Water Level</span>
                <span className={`number ${currentSensor.level_float === 0 ? 'critical' : ''}`}>
                  {currentSensor.level_float?.toFixed(2) || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="alerts-section">
        <h3>Recent Alerts</h3>
        {alerts.length === 0 ? (
          <div className="no-alerts">No alerts</div>
        ) : (
          <div className="alerts-list">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className="alert-item"
                style={{ borderLeftColor: getAlertColor(alert.severity) }}
              >
                <div className="alert-header">
                  <span className={`alert-severity ${alert.severity.toLowerCase()}`}>
                    {alert.severity}
                  </span>
                  <span className="alert-code">{alert.code}</span>
                </div>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-device">Device: {alert.device_id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
