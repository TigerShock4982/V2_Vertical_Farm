from fastapi import FastAPI, WebSocket, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
from datetime import datetime
from typing import Optional, Set
from pydantic import BaseModel

import database
import alerts_engine
from config import settings

# Initialize database
database.init_db()

app = FastAPI(title="Vertical Farm Automation", version="1.0.0")

# CORS middleware for stadium WiFi
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connections
active_connections: Set[WebSocket] = set()


# Models
class SensorData(BaseModel):
    farm_id: str
    device: str
    ts: int
    seq: int
    air: dict
    water: dict
    light: dict
    level: float


@app.on_event("startup")
async def startup():
    """Start mock sensor if enabled"""
    if settings.mock_sensor_enabled:
        asyncio.create_task(start_mock_sensor())


async def start_mock_sensor():
    """Start mock sensor in background"""
    await asyncio.sleep(2)  # Wait for server to fully start
    try:
        import subprocess

        subprocess.Popen(
            ["python", "mock_sensor.py"],
            cwd=".",
        )
        print("Mock sensor started")
    except Exception as e:
        print(f"Failed to start mock sensor: {e}")


@app.post("/ingest")
async def ingest_sensor_data(data: SensorData):
    """Receive and store sensor data"""
    farm_id = data.farm_id
    device_id = data.device

    # Ensure farm and device exist
    database.get_or_create_farm(farm_id, f"Farm-{farm_id}")
    database.get_or_create_device(device_id, farm_id, f"Device-{device_id}", "sensor")

    # Parse nested sensor data
    sensor_dict = {
        "air_t_c": data.air.get("t_c"),
        "air_rh_pct": data.air.get("rh_pct"),
        "air_p_hpa": data.air.get("p_hpa"),
        "water_t_c": data.water.get("t_c"),
        "water_ph": data.water.get("ph"),
        "water_ec_ms_cm": data.water.get("ec_ms_cm"),
        "light_lux": data.light.get("lux"),
        "level_float": data.level,
    }

    # Insert sensor event
    database.insert_sensor_event(farm_id, device_id, data.ts, data.seq, sensor_dict)

    # Evaluate alerts
    alerts = alerts_engine.evaluate_alerts(farm_id, device_id, data.ts, sensor_dict)

    # Broadcast via WebSocket
    broadcast_data = {
        "type": "sensor",
        "farm_id": farm_id,
        "device_id": device_id,
        "ts": data.ts,
        "seq": data.seq,
        "data": sensor_dict,
        "alerts": alerts,
    }
    await broadcast(json.dumps(broadcast_data))

    return {"status": "ok", "event_id": data.seq, "alerts": len(alerts)}


@app.get("/latest")
async def get_latest():
    """Get latest sensor event"""
    event = database.get_latest_event()
    if not event:
        raise HTTPException(status_code=404, detail="No sensor data found")
    return event


@app.get("/api/history")
async def get_history(
    farm_id: Optional[str] = Query(None),
    device_id: Optional[str] = Query(None),
    limit: int = Query(500, ge=1, le=1000),
):
    """Get historical sensor data for charting"""
    history = database.get_history(farm_id, device_id, limit)
    return {"count": len(history), "data": history}


@app.get("/alerts")
async def get_alerts(farm_id: str = Query(...), limit: int = Query(10, ge=1, le=100)):
    """Get recent alerts for farm"""
    alerts = database.get_alerts(farm_id, limit)
    return {"farm_id": farm_id, "count": len(alerts), "alerts": alerts}


@app.get("/api/farms")
async def get_farms():
    """List all farms"""
    farms = database.get_farms()
    return {"farms": farms}


@app.get("/api/devices")
async def get_devices(farm_id: str = Query(...)):
    """List devices for a farm"""
    devices = database.get_devices(farm_id)
    return {"farm_id": farm_id, "devices": devices}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time data"""
    await websocket.accept()
    active_connections.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo or process as needed
    except Exception:
        pass
    finally:
        active_connections.discard(websocket)


async def broadcast(message: str):
    """Broadcast message to all WebSocket connections"""
    disconnected = set()
    for connection in active_connections:
        try:
            await connection.send_text(message)
        except Exception:
            disconnected.add(connection)

    for connection in disconnected:
        active_connections.discard(connection)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
