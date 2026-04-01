import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

DB_PATH = "farm.db"


def init_db():
    """Initialize database with tables"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Farms table
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS farms (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT
        )
    """
    )

    # Devices table
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY,
            farm_id TEXT NOT NULL,
            name TEXT NOT NULL,
            device_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farm_id) REFERENCES farms(id)
        )
    """
    )

    # Sensor events table
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS sensor_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farm_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            ts INTEGER NOT NULL,
            seq INTEGER,
            air_t_c REAL,
            air_rh_pct REAL,
            air_p_hpa REAL,
            water_t_c REAL,
            water_ph REAL,
            water_ec_ms_cm REAL,
            light_lux REAL,
            level_float REAL,
            raw_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farm_id) REFERENCES farms(id),
            FOREIGN KEY (device_id) REFERENCES devices(id)
        )
    """
    )

    # Alerts table
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farm_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            ts INTEGER NOT NULL,
            severity TEXT,
            code TEXT NOT NULL,
            message TEXT,
            raw_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farm_id) REFERENCES farms(id),
            FOREIGN KEY (device_id) REFERENCES devices(id)
        )
    """
    )

    conn.commit()
    conn.close()


def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def insert_sensor_event(
    farm_id: str,
    device_id: str,
    ts: int,
    seq: int,
    data: Dict[str, Any],
) -> int:
    """Insert sensor event and return ID"""
    conn = get_db()
    c = conn.cursor()

    c.execute(
        """
        INSERT INTO sensor_events
        (farm_id, device_id, ts, seq, air_t_c, air_rh_pct, air_p_hpa,
         water_t_c, water_ph, water_ec_ms_cm, light_lux, level_float, raw_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        (
            farm_id,
            device_id,
            ts,
            seq,
            data.get("air_t_c"),
            data.get("air_rh_pct"),
            data.get("air_p_hpa"),
            data.get("water_t_c"),
            data.get("water_ph"),
            data.get("water_ec_ms_cm"),
            data.get("light_lux"),
            data.get("level_float"),
            json.dumps(data),
        ),
    )
    event_id = c.lastrowid
    conn.commit()
    conn.close()
    return event_id


def insert_alert(
    farm_id: str,
    device_id: str,
    ts: int,
    severity: str,
    code: str,
    message: str,
    raw_json: Dict[str, Any],
) -> int:
    """Insert alert and return ID"""
    conn = get_db()
    c = conn.cursor()

    c.execute(
        """
        INSERT INTO alerts
        (farm_id, device_id, ts, severity, code, message, raw_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """,
        (farm_id, device_id, ts, severity, code, message, json.dumps(raw_json)),
    )
    alert_id = c.lastrowid
    conn.commit()
    conn.close()
    return alert_id


def get_latest_event() -> Optional[Dict[str, Any]]:
    """Get latest sensor event"""
    conn = get_db()
    c = conn.cursor()
    c.execute(
        """
        SELECT * FROM sensor_events
        ORDER BY created_at DESC LIMIT 1
    """
    )
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def get_history(
    farm_id: Optional[str] = None,
    device_id: Optional[str] = None,
    limit: int = 500,
) -> List[Dict[str, Any]]:
    """Get historical sensor events"""
    conn = get_db()
    c = conn.cursor()

    query = "SELECT * FROM sensor_events WHERE 1=1"
    params: List[Any] = []

    if farm_id:
        query += " AND farm_id = ?"
        params.append(farm_id)
    if device_id:
        query += " AND device_id = ?"
        params.append(device_id)

    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    c.execute(query, params)
    rows = c.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_alerts(farm_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Get recent alerts for farm"""
    conn = get_db()
    c = conn.cursor()
    c.execute(
        """
        SELECT * FROM alerts
        WHERE farm_id = ?
        ORDER BY created_at DESC LIMIT ?
    """,
        (farm_id, limit),
    )
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_or_create_farm(farm_id: str, name: str = "Farm") -> str:
    """Get or create farm"""
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT id FROM farms WHERE id = ?", (farm_id,))
    if c.fetchone():
        conn.close()
        return farm_id

    c.execute("INSERT INTO farms (id, name) VALUES (?, ?)", (farm_id, name))
    conn.commit()
    conn.close()
    return farm_id


def get_or_create_device(
    device_id: str, farm_id: str, name: str = "Device", device_type: str = "sensor"
) -> str:
    """Get or create device"""
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT id FROM devices WHERE id = ?", (device_id,))
    if c.fetchone():
        conn.close()
        return device_id

    c.execute(
        "INSERT INTO devices (id, farm_id, name, device_type) VALUES (?, ?, ?, ?)",
        (device_id, farm_id, name, device_type),
    )
    conn.commit()
    conn.close()
    return device_id


def get_farms() -> List[Dict[str, Any]]:
    """Get all farms"""
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM farms")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_devices(farm_id: str) -> List[Dict[str, Any]]:
    """Get devices for farm"""
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM devices WHERE farm_id = ?", (farm_id,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]
