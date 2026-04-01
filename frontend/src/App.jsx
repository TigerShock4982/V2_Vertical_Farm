import { useState, useEffect } from 'react'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'
import TraysPage from './pages/TraysPage'
import ConfigPage from './pages/ConfigPage'
import './App.css'

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [isHealthy, setIsHealthy] = useState(false)
  const [serverUrl, setServerUrl] = useState(() => {
    const saved = localStorage.getItem('serverUrl')
    return saved || import.meta.env.VITE_API_URL || 'http://localhost:8000'
  })

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${serverUrl}/health`)
        setIsHealthy(response.ok)
      } catch {
        setIsHealthy(false)
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 5000)
    return () => clearInterval(interval)
  }, [serverUrl])

  useEffect(() => {
    localStorage.setItem('serverUrl', serverUrl)
  }, [serverUrl])

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage serverUrl={serverUrl} />
      case 'history':
        return <HistoryPage serverUrl={serverUrl} />
      case 'trays':
        return <TraysPage />
      case 'config':
        return <ConfigPage serverUrl={serverUrl} setServerUrl={setServerUrl} />
      default:
        return <DashboardPage serverUrl={serverUrl} />
    }
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <h1>🌱 Vertical Farm</h1>
        </div>
        <div className="nav-center">
          <button
            className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-btn ${currentPage === 'history' ? 'active' : ''}`}
            onClick={() => setCurrentPage('history')}
          >
            History
          </button>
          <button
            className={`nav-btn ${currentPage === 'trays' ? 'active' : ''}`}
            onClick={() => setCurrentPage('trays')}
          >
            Trays
          </button>
          <button
            className={`nav-btn ${currentPage === 'config' ? 'active' : ''}`}
            onClick={() => setCurrentPage('config')}
          >
            Config
          </button>
        </div>
        <div className="nav-status">
          <div className={`status-indicator ${isHealthy ? 'healthy' : 'offline'}`}>
            <span className="status-dot"></span>
            {isHealthy ? 'Online' : 'Offline'}
          </div>
        </div>
      </nav>
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}
