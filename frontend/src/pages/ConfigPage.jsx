import { useState, useEffect } from 'react'
import './ConfigPage.css'

export default function ConfigPage({ serverUrl, setServerUrl }) {
  const [localhost, setLocalhost] = useState(false)
  const [customIp, setCustomIp] = useState(() => {
    const url = localStorage.getItem('serverUrl') || serverUrl
    if (url.includes('localhost')) {
      return ''
    }
    return url.replace('http://', '').replace(':8000', '')
  })
  const [farmId, setFarmId] = useState(() => localStorage.getItem('farmId') || 'farm_001')
  const [deviceId, setDeviceId] = useState(() => localStorage.getItem('deviceId') || 'sensor_01')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setLocalhost(serverUrl.includes('localhost'))
  }, [serverUrl])

  const handleSaveConfig = () => {
    let url = 'http://localhost:8000'
    if (!localhost && customIp) {
      url = `http://${customIp}:8000`
    }

    setServerUrl(url)
    localStorage.setItem('farmId', farmId)
    localStorage.setItem('deviceId', deviceId)
    localStorage.setItem('serverUrl', url)

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleLocalChange = () => {
    const newLocal = !localhost
    setLocalhost(newLocal)
    if (newLocal) {
      setServerUrl('http://localhost:8000')
    }
  }

  return (
    <div className="config-container">
      <div className="config-header">
        <h2>Configuration</h2>
        <p>Setup your connection and preferences</p>
      </div>

      <div className="config-sections">
        <div className="config-section">
          <div className="section-header">
            <h3>Server Connection</h3>
          </div>

          <div className="config-form">
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={localhost}
                  onChange={handleLocalChange}
                />
                <span>Use Localhost (127.0.0.1:8000)</span>
              </label>
            </div>

            {!localhost && (
              <div className="form-group">
                <label htmlFor="customIp">Server IP Address</label>
                <div className="input-wrapper">
                  <span className="prefix">http://</span>
                  <input
                    id="customIp"
                    type="text"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    placeholder="192.168.1.100"
                  />
                  <span className="suffix">:8000</span>
                </div>
                <p className="help-text">
                  Example: 192.168.1.100 (find your server IP using: hostname -I or look in your
                  router's connection list)
                </p>
              </div>
            )}

            <div className="current-url">
              <label>Current URL:</label>
              <div className="url-display">{serverUrl}</div>
            </div>
          </div>
        </div>

        <div className="config-section">
          <div className="section-header">
            <h3>Farm & Device Settings</h3>
          </div>

          <div className="config-form">
            <div className="form-group">
              <label htmlFor="farmId">Farm ID</label>
              <input
                id="farmId"
                type="text"
                value={farmId}
                onChange={(e) => setFarmId(e.target.value)}
                placeholder="farm_001"
              />
              <p className="help-text">Unique identifier for your farm (used across all pages)</p>
            </div>

            <div className="form-group">
              <label htmlFor="deviceId">Default Device ID</label>
              <input
                id="deviceId"
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="sensor_01"
              />
              <p className="help-text">Default sensor device to filter (can be changed per page)</p>
            </div>
          </div>
        </div>

        <div className="config-section">
          <div className="section-header">
            <h3>Information</h3>
          </div>

          <div className="info-box">
            <h4>🌐 Finding Your Server IP</h4>
            <p>If running the backend on a different machine:</p>
            <ul>
              <li>
                <strong>Linux/Mac:</strong> Run <code>hostname -I</code> in terminal
              </li>
              <li>
                <strong>Windows:</strong> Run <code>ipconfig</code> in command prompt, look for IPv4
              </li>
              <li>
                <strong>Router WiFi:</strong> Check your router's connection list
              </li>
              <li>
                <strong>Local Network:</strong> Use the IP on your local network (usually
                192.168.x.x)
              </li>
            </ul>
          </div>

          <div className="info-box">
            <h4>🚀 Running the Backend</h4>
            <div className="code-block">
              <code>cd backend</code>
              <code>pip install -r requirements.txt</code>
              <code>python main.py</code>
            </div>
            <p>Server will start at http://0.0.0.0:8000 and be accessible on your network.</p>
          </div>

          <div className="info-box">
            <h4>⚙️ Running the Frontend</h4>
            <div className="code-block">
              <code>cd frontend</code>
              <code>npm install</code>
              <code>npm run dev</code>
            </div>
            <p>Frontend will start at http://localhost:5173 with dev server proxy.</p>
          </div>

          <div className="info-box">
            <h4>📊 Starting Mock Sensors</h4>
            <p>
              Mock sensors automatically start when the backend runs. To disable, set
              mock_sensor_enabled=false in .env
            </p>
          </div>

          <div className="info-box">
            <h4>🔌 WebSocket Connection</h4>
            <p>
              Real-time data updates via WebSocket at <code>/ws</code> endpoint. Frontend
              automatically connects if server is available.
            </p>
          </div>
        </div>
      </div>

      <div className="config-actions">
        <button className="save-btn" onClick={handleSaveConfig}>
          💾 Save Configuration
        </button>
        {saved && <div className="save-message">✓ Configuration saved!</div>}
      </div>
    </div>
  )
}
