import asyncio
import os
import random
import time
import httpx
from datetime import datetime

# Configuration
API_URL = os.getenv(
    "MOCK_SENSOR_API_URL",
    f"http://127.0.0.1:{os.getenv('PORT', '8000')}/ingest"
)
FARM_ID = "farm_001"
DEVICES = [
    {"id": "sensor_01", "name": "Tray 1"},
    {"id": "sensor_02", "name": "Tray 2"},
    {"id": "sensor_03", "name": "Tray 3"},
]
INTERVAL = float(os.getenv("MOCK_SENSOR_INTERVAL", "2.0"))


class SensorSimulator:
    """Simulates realistic sensor data"""

    def __init__(self, device_id: str):
        self.device_id = device_id
        self.seq = 0
        # Starting values with some variance
        self.air_t_c = 22 + random.uniform(-2, 2)
        self.air_rh_pct = 65 + random.uniform(-10, 10)
        self.air_p_hpa = 1013 + random.uniform(-5, 5)
        self.water_t_c = 20 + random.uniform(-1, 1)
        self.water_ph = 6.2 + random.uniform(-0.2, 0.2)
        self.water_ec_ms_cm = 1.5 + random.uniform(-0.3, 0.3)
        self.light_lux = 800 + random.uniform(-100, 100)
        self.level_float = 1.0

    def generate(self) -> dict:
        """Generate realistic sensor data with drift"""
        self.seq += 1
        now = int(time.time() * 1000)  # milliseconds

        # Realistic drift with occasional spikes
        self.air_t_c += random.uniform(-0.5, 0.5)
        self.air_rh_pct += random.uniform(-2, 2)
        self.air_rh_pct = max(30, min(95, self.air_rh_pct))
        self.water_t_c += random.uniform(-0.2, 0.2)
        self.water_ph += random.uniform(-0.05, 0.05)
        self.water_ph = max(4.5, min(8.0, self.water_ph))
        self.water_ec_ms_cm += random.uniform(-0.05, 0.05)
        self.water_ec_ms_cm = max(0.5, self.water_ec_ms_cm)
        self.light_lux += random.uniform(-50, 50)
        self.light_lux = max(0, self.light_lux)

        # 5% chance of water level alert
        if random.random() < 0.05:
            self.level_float = 0

        # 2% chance of pH drift
        if random.random() < 0.02:
            self.water_ph += random.uniform(-1.5, 1.5)

        return {
            "farm_id": FARM_ID,
            "device": self.device_id,
            "ts": now,
            "seq": self.seq,
            "air": {
                "t_c": round(self.air_t_c, 2),
                "rh_pct": round(self.air_rh_pct, 1),
                "p_hpa": round(self.air_p_hpa, 1),
            },
            "water": {
                "t_c": round(self.water_t_c, 2),
                "ph": round(self.water_ph, 2),
                "ec_ms_cm": round(self.water_ec_ms_cm, 2),
            },
            "light": {"lux": round(self.light_lux, 1)},
            "level": round(self.level_float, 2),
        }


async def post_sensor_data(session: httpx.AsyncClient, data: dict):
    """POST sensor data to API"""
    try:
        response = await session.post(API_URL, json=data, timeout=5.0)
        if response.status_code != 200:
            print(f"Error posting to {API_URL}: {response.status_code}")
    except Exception as e:
        print(f"Failed to post sensor data: {e}")


async def run_sensor(device_config: dict, session: httpx.AsyncClient):
    """Run sensor simulation loop"""
    simulator = SensorSimulator(device_config["id"])

    while True:
        try:
            data = simulator.generate()
            print(
                f"[{device_config['name']}] T:{data['air']['t_c']}°C "
                f"RH:{data['air']['rh_pct']}% pH:{data['water']['ph']} "
                f"Level:{data['level']}"
            )
            await post_sensor_data(session, data)
            await asyncio.sleep(INTERVAL)
        except Exception as e:
            print(f"Sensor error: {e}")
            await asyncio.sleep(1)


async def main():
    """Run all sensors"""
    print(f"Starting mock sensors for {FARM_ID}...")
    print(f"API endpoint: {API_URL}")

    async with httpx.AsyncClient() as session:
        tasks = [run_sensor(device, session) for device in DEVICES]
        await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())
