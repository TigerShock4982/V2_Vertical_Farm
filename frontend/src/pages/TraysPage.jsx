import { useState, useEffect } from 'react'
import './TraysPage.css'

export default function TraysPage() {
  const [positions, setPositions] = useState([])
  const FRAME_CYCLE = 3000 // Total frames in one cycle
  const TRACK_HEIGHT = 80
  const TRAY_WIDTH = 120
  const TRAY_HEIGHT = 60

  // Initialize trays
  useEffect(() => {
    const trays = [
      { id: 'FARM-TRAY-00001', track: 1, status: 'Growing' },
      { id: 'FARM-TRAY-00002', track: 1, status: 'Growing' },
      { id: 'FARM-TRAY-00003', track: 2, status: 'Growing' },
      { id: 'FARM-TRAY-00004', track: 2, status: 'Growing' },
      { id: 'FARM-TRAY-00005', track: 3, status: 'Growing' },
      { id: 'FARM-TRAY-00006', track: 3, status: 'Growing' },
      { id: 'FARM-TRAY-00007', track: 1, status: 'Harvesting' },
      { id: 'FARM-TRAY-00008', track: 2, status: 'Harvesting' },
    ]
    setPositions(trays.map((t) => ({ ...t, progress: Math.random() * FRAME_CYCLE })))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setPositions((prev) =>
        prev.map((t) => ({
          ...t,
          progress: (t.progress + 1) % FRAME_CYCLE,
        }))
      )
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [])

  const calculatePosition = (tray, progress) => {
    const containerWidth = window.innerWidth - 100
    const third = FRAME_CYCLE / 3

    // Snake pattern: left→right, right→left, left→right
    if (tray.track === 1) {
      // Track 1: left → right
      if (progress < third) {
        return (progress / third) * containerWidth
      } else if (progress < 2 * third) {
        return containerWidth
      } else {
        return containerWidth - ((progress - 2 * third) / third) * containerWidth
      }
    } else if (tray.track === 2) {
      // Track 2: right → left
      if (progress < third) {
        return containerWidth - (progress / third) * containerWidth
      } else if (progress < 2 * third) {
        return 0
      } else {
        return ((progress - 2 * third) / third) * containerWidth
      }
    } else {
      // Track 3: left → right (same as 1)
      if (progress < third) {
        return (progress / third) * containerWidth
      } else if (progress < 2 * third) {
        return containerWidth
      } else {
        return containerWidth - ((progress - 2 * third) / third) * containerWidth
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Growing':
        return '#22c55e'
      case 'Harvesting':
        return '#f59e0b'
      case 'Empty':
        return '#64748b'
      default:
        return '#06b6d4'
    }
  }

  return (
    <div className="trays-container">
      <div className="trays-header">
        <h2>Tray Management System</h2>
        <p>8 Trays in 3-track snake pattern conveyor system</p>
      </div>

      <div className="legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ backgroundColor: '#22c55e' }}></div>
          <span>Growing</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></div>
          <span>Harvesting</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ backgroundColor: '#64748b' }}></div>
          <span>Empty</span>
        </div>
      </div>

      <div className="conveyor-system">
        {[1, 2, 3].map((trackNum) => (
          <div key={trackNum} className="track">
            <div className="track-label">Track {trackNum}</div>
            <div className="track-content">
              {positions
                .filter((t) => t.track === trackNum)
                .map((tray) => {
                  const left = calculatePosition(tray, tray.progress)
                  return (
                    <div
                      key={tray.id}
                      className="tray animated-tray"
                      style={{
                        left: `${left}px`,
                        borderColor: getStatusColor(tray.status),
                      }}
                    >
                      <div className="tray-barcode">{tray.id}</div>
                      <div className="tray-status">{tray.status}</div>
                      <div
                        className="tray-indicator"
                        style={{
                          backgroundColor: getStatusColor(tray.status),
                        }}
                      ></div>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
      </div>

      <div className="tray-stats">
        <h3>Tray Status Table</h3>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Barcode</th>
              <th>Track</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((tray) => (
              <tr key={tray.id}>
                <td className="barcode-cell">{tray.id}</td>
                <td>{tray.track}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{
                      color: getStatusColor(tray.status),
                      borderColor: getStatusColor(tray.status),
                    }}
                  >
                    {tray.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
