# 🌱 Vertical Farm Automation System

A complete IoT automation system for vertical farms with real-time sensor monitoring, alert management, and tray tracking.

## Features

✨ **Real-time Monitoring**
- Live sensor data streaming via WebSocket
- Air temperature, humidity, pressure
- Water temperature, pH, EC levels
- Light intensity and water level tracking

🚨 **Smart Alert System**
- Threshold-based alerts (Critical, Warning, Info)
- Cooldown mechanism to prevent spam
- Real-time alert broadcast
- Alert history tracking

📊 **Data Analytics**
- 3 Recharts visualizations (Air, Water, Light)
- Historical data with 100/500/1000 point limits
- Statistical summaries (averages, maximums)
- Device-specific filtering

🚚 **Tray Management**
- 8-tray conveyor system simulation
- 3-track snake pattern animation
- Real-time tray status display
- Barcode tracking (FARM-TRAY-XXXXX format)

⚙️ **Configuration**
- Multi-farm support
- Manual IP configuration for offline scenarios
- LocalStorage persistence
- Health status indicator

## Architecture

### Backend (Python FastAPI)
- **main.py**: FastAPI application with REST and WebSocket endpoints
- **config.py**: Environment configuration management
- **database.py**: SQLite multi-farm schema
- **alerts_engine.py**: Threshold evaluation with cooldown
- **mock_sensor.py**: Realistic sensor data simulation

### Frontend (React + Vite)
- **Dashboard**: Real-time sensor display + alerts
- **History**: Data visualization with Recharts
- **Trays**: Conveyor system animation
- **Config**: Connection and preferences setup

### Database Schema
```
farms (id, name, created_at, user_id)
devices (id, farm_id, name, device_type, created_at)
sensor_events (farm_id, device_id, ts, seq, air_t_c, air_rh_pct, air_p_hpa, water_t_c, water_ph, water_ec_ms_cm, light_lux, level_float, raw_json, created_at)
alerts (farm_id, device_id, ts, severity, code, message, raw_json, created_at)
```

## Alert Rules

| Alert Code | Severity | Condition | Cooldown |
|-----------|----------|-----------|----------|
| WATER_LOW | CRITICAL | Water level = 0 | 10s |
| PH_LOW | WARNING | pH < 5.5 | 10s |
| PH_HIGH | WARNING | pH > 6.8 | 10s |
| EC_LOW | WARNING | EC < 0.8 | 10s |
| EC_HIGH | WARNING | EC > 2.2 | 10s |
| WATER_TEMP_HIGH | WARNING | Temp > 26°C | 10s |

## Quick Start

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Copy example env
cp ../.env.example .env

# Run the server
python main.py
```

Server starts at `http://0.0.0.0:8000`
- REST API: http://localhost:8000
- WebSocket: ws://localhost:8000/ws
- Docs: http://localhost:8000/docs (auto-generated)

Mock sensors automatically start and POST data to `/ingest` every 2 seconds.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at `http://localhost:5173`

Direct your browser to the development server and configure:
1. **On Config page**: Set backend URL (default: http://localhost:8000, or enter your Render URL)
2. **Farm ID**: Enter your farm identifier
3. **Device ID**: Enter sensor device ID

## API Endpoints

### Ingest Sensor Data
```
POST /ingest
Content-Type: application/json

{
  "farm_id": "farm_001",
  "device": "sensor_01",
  "ts": 1704067200000,
  "seq": 1,
  "air": {
    "t_c": 22.5,
    "rh_pct": 65.3,
    "p_hpa": 1013.25
  },
  "water": {
    "t_c": 20.1,
    "ph": 6.2,
    "ec_ms_cm": 1.5
  },
  "light": {
    "lux": 850.0
  },
  "level": 1.0
}
```

### Get Latest Sensor
```
GET /latest
Response: { sensor_event object }
```

### Get Historical Data
```
GET /api/history?farm_id=farm_001&device_id=sensor_01&limit=500
Response: { count: int, data: [sensor_events] }
```

### Get Alerts
```
GET /alerts?farm_id=farm_001&limit=10
Response: { farm_id: str, count: int, alerts: [alert_objects] }
```

### Get Farms
```
GET /api/farms
Response: { farms: [farm_objects] }
```

### Get Devices
```
GET /api/devices?farm_id=farm_001
Response: { farm_id: str, devices: [device_objects] }
```

### WebSocket Real-time
```
WS /ws
Messages: { type: "sensor", farm_id, device_id, ts, seq, data, alerts }
```

### Health Check
```
GET /health
Response: { status: "healthy", timestamp, version }
```

## Configuration

### Environment Variables (.env)
```
DATABASE_URL=sqlite:///farm.db
DEBUG=True
CORS_ORIGINS=["*"]
ALERT_COOLDOWN_SECONDS=10
MOCK_SENSOR_ENABLED=True
MOCK_SENSOR_INTERVAL=2.0
```

### Frontend LocalStorage
- `serverUrl`: API backend URL (http://IP:8000)
- `farmId`: Selected farm identifier
- `deviceId`: Selected device filter

## Deployment

### Deploy to Render (Recommended - Free Tier)

**Easy Option: Using render.yaml**

1. Push code to GitHub
2. Go to https://dashboard.render.com
3. Click "New" → "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml` and deploy both services
6. After backend deploys, copy its URL and update the frontend's `VITE_API_URL` environment variable

**Manual Option:**

#### Backend
1. Push code to GitHub
2. Create new "Web Service" on Render
3. Connect GitHub repository
4. Set configuration:
   - Runtime: Python 3.11
   - Build command: `pip install -r backend/requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Root directory: `backend`
5. Add environment variables:
   - `DEBUG`: `False`
   - `MOCK_SENSOR_ENABLED`: `True`
   - `MOCK_SENSOR_INTERVAL`: `2.0`
   - `CORS_ORIGINS`: `["*"]`
6. Deploy

Note the backend URL (e.g., `https://v2-vertical-farm-backend.onrender.com`)

#### Frontend
1. Create new "Static Site" on Render
2. Connect GitHub repository
3. Set configuration:
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/dist`
   - Root directory: `frontend`
4. Add environment variables:
   - `VITE_API_URL`: Paste the backend URL from above
5. Deploy

**After Deployment:**
- Frontend will be available at your Render URL
- Open Config page and verify it connects to your backend
- Mock sensors will automatically start posting data

### Docker Deployment

**Dockerfile (Backend)**
\`\`\`dockerfile
FROM python:3.11
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["python", "main.py"]
\`\`\`

**docker-compose.yml**
\`\`\`yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: sqlite:///farm.db
      DEBUG: "False"
      CORS_ORIGINS: '["*"]'
\`\`\`

## Finding Your Server IP

When accessing the dashboard from another machine on your network:

**Linux/Mac:**
\`\`\`bash
hostname -I
# or
ifconfig | grep "inet " | grep -v 127.0.0.1
\`\`\`

**Windows:**
\`\`\`cmd
ipconfig
# Look for IPv4 Address (usually 192.168.x.x)
\`\`\`

**Router:**
Check your WiFi router's connected devices list to find the IP address.

**Usage:**
1. Go to Config page
2. Uncheck "Use Localhost"
3. Enter found IP (e.g., 192.168.1.100)
4. Click Save Configuration

## Troubleshooting

### Backend won't start
- Check Python 3.10+ installed: `python --version`
- Check port 8000 not in use: `lsof -i :8000`
- Install dependencies: `pip install -r requirements.txt`

### No sensor data in frontend
- Check backend is running: `curl http://localhost:8000/health`
- Verify mock sensors started: Check backend console
- Check CORS enabled: Should see `/ingest` 200 responses
- Browser console for WebSocket errors (F12)

### Frontend can't connect to backend
- Verify backend URL in Config page
- Check firewall allows port 8000
- Test connection: `curl http://BACKEND_IP:8000/health`
- For remote connections, get server IP (see above)

### WebSocket connection fails
- WebSocket only works on same origin (http → ws, https → wss)
- Check if backend `/health` responsive
- Frontend will retry automatically
- Check browser console for detailed error

### Database locked error
- SQLite is being accessed by multiple processes
- Ensure only one backend instance running
- For production, upgrade to PostgreSQL

### Alerts not triggering
- Check alert thresholds in alerts_engine.py
- Verify sensor data within threshold ranges
- Check Alert cooldown (defaults to 10s per device/code)
- View alerts table in database

### Mock sensors not posting data
- Verify `/ingest` endpoint accessible
- Mock sensor needs network access to API
- Check mock_sensor.py logs in backend terminal
- Set `MOCK_SENSOR_ENABLED=False` to disable

## Development

### Running Tests
\`\`\`bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
\`\`\`

### Code Structure
\`\`\`
V2_Vertical_Farm/
├── backend/
│   ├── main.py                 # FastAPI app
│   ├── config.py               # Config management
│   ├── database.py             # SQLite operations
│   ├── alerts_engine.py        # Alert logic
│   ├── mock_sensor.py          # Sensor simulation
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── index.html              # Entry point
│   ├── vite.config.js          # Vite config
│   ├── package.json            # Node dependencies
│   └── src/
│       ├── main.jsx            # React entry
│       ├── App.jsx             # Main component
│       ├── App.css             # Navbar styles
│       ├── index.css           # Global styles
│       └── pages/
│           ├── DashboardPage.jsx
│           ├── HistoryPage.jsx
│           ├── TraysPage.jsx
│           └── ConfigPage.jsx
└── README.md                   # This file
\`\`\`

## License

MIT
