import time
from datetime import datetime
from typing import Optional, List, Dict, Any
from config import settings
import database


class AlertCooldown:
    """Track alert cooldown per device and alert code"""

    def __init__(self, cooldown_seconds: int = 10):
        self.cooldown_seconds = cooldown_seconds
        self.last_alert_time: Dict[str, float] = {}

    def can_alert(self, device_id: str, code: str) -> bool:
        """Check if alert can be triggered (not in cooldown)"""
        key = f"{device_id}:{code}"
        now = time.time()
        last_time = self.last_alert_time.get(key, 0)

        if now - last_time >= self.cooldown_seconds:
            self.last_alert_time[key] = now
            return True
        return False


cooldown = AlertCooldown(settings.alert_cooldown_seconds)


def evaluate_alerts(
    farm_id: str, device_id: str, ts: int, data: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Evaluate sensor data for alert conditions and create alerts"""
    alerts: List[Dict[str, Any]] = []

    # Water level check
    level = data.get("level_float")
    if level is not None and level == 0 and cooldown.can_alert(device_id, "WATER_LOW"):
        alert = {
            "farm_id": farm_id,
            "device_id": device_id,
            "ts": ts,
            "severity": "CRITICAL",
            "code": "WATER_LOW",
            "message": "Water reservoir empty (level=0)",
        }
        database.insert_alert(
            farm_id,
            device_id,
            ts,
            alert["severity"],
            alert["code"],
            alert["message"],
            data,
        )
        alerts.append(alert)

    # pH checks
    ph = data.get("water_ph")
    if ph is not None:
        if ph < 5.5 and cooldown.can_alert(device_id, "PH_LOW"):
            alert = {
                "farm_id": farm_id,
                "device_id": device_id,
                "ts": ts,
                "severity": "WARNING",
                "code": "PH_LOW",
                "message": f"pH too low: {ph:.2f}",
            }
            database.insert_alert(
                farm_id,
                device_id,
                ts,
                alert["severity"],
                alert["code"],
                alert["message"],
                data,
            )
            alerts.append(alert)
        elif ph > 6.8 and cooldown.can_alert(device_id, "PH_HIGH"):
            alert = {
                "farm_id": farm_id,
                "device_id": device_id,
                "ts": ts,
                "severity": "WARNING",
                "code": "PH_HIGH",
                "message": f"pH too high: {ph:.2f}",
            }
            database.insert_alert(
                farm_id,
                device_id,
                ts,
                alert["severity"],
                alert["code"],
                alert["message"],
                data,
            )
            alerts.append(alert)

    # EC checks
    ec = data.get("water_ec_ms_cm")
    if ec is not None:
        if ec < 0.8 and cooldown.can_alert(device_id, "EC_LOW"):
            alert = {
                "farm_id": farm_id,
                "device_id": device_id,
                "ts": ts,
                "severity": "WARNING",
                "code": "EC_LOW",
                "message": f"EC too low: {ec:.2f}",
            }
            database.insert_alert(
                farm_id,
                device_id,
                ts,
                alert["severity"],
                alert["code"],
                alert["message"],
                data,
            )
            alerts.append(alert)
        elif ec > 2.2 and cooldown.can_alert(device_id, "EC_HIGH"):
            alert = {
                "farm_id": farm_id,
                "device_id": device_id,
                "ts": ts,
                "severity": "WARNING",
                "code": "EC_HIGH",
                "message": f"EC too high: {ec:.2f}",
            }
            database.insert_alert(
                farm_id,
                device_id,
                ts,
                alert["severity"],
                alert["code"],
                alert["message"],
                data,
            )
            alerts.append(alert)

    # Water temperature check
    water_temp = data.get("water_t_c")
    if water_temp is not None and water_temp > 26 and cooldown.can_alert(
        device_id, "WATER_TEMP_HIGH"
    ):
        alert = {
            "farm_id": farm_id,
            "device_id": device_id,
            "ts": ts,
            "severity": "WARNING",
            "code": "WATER_TEMP_HIGH",
            "message": f"Water temperature too high: {water_temp:.1f}°C",
        }
        database.insert_alert(
            farm_id,
            device_id,
            ts,
            alert["severity"],
            alert["code"],
            alert["message"],
            data,
        )
        alerts.append(alert)

    return alerts
