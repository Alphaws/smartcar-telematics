const http = require('http');
const https = require('https');

// Dynamic Configuration via Environment Variables
const TARGET_API_HOST = process.env.TARGET_API_HOST || 'api-smartcar.prstart.hu';
const VIN = process.env.VIN || 'WDC1648221A491726';
const DEVICE_ID = process.env.DEVICE_ID || 'ESP32_EMULATOR_HW_001';
const CAR_NAME = process.env.CAR_NAME || 'Mercedes-Benz GL 320 CDI (W164)';

// Latitude & Longitude Offsets for Multi-Car Routes
const LAT_OFFSET = parseFloat(process.env.LAT_OFFSET || '0');
const LNG_OFFSET = parseFloat(process.env.LNG_OFFSET || '0');

console.log('================================================================');
console.log('      🤖 ESP32 Dual-CAN & 4G Hardver Emulátor Szolgáltatás       ');
console.log('================================================================');
console.log(`[ESP32 HW] Eszköz ID:   ${DEVICE_ID}`);
console.log(`[ESP32 HW] Autó Neve:    ${CAR_NAME}`);
console.log(`[ESP32 HW] Autó VIN:     ${VIN}`);
console.log(`[ESP32 HW] Éles Cél API: https://${TARGET_API_HOST}/api/telemetry/ingest`);

// Base Driving Route (Budapest -> Dunakeszi route points)
const baseRoutePoints = [
  { lat: 47.5623, lng: 19.0812, speed: 0, rpm: 0 },
  { lat: 47.5680, lng: 19.0850, speed: 35, rpm: 1500 },
  { lat: 47.5750, lng: 19.0910, speed: 52, rpm: 1850 },
  { lat: 47.5890, lng: 19.1020, speed: 70, rpm: 2100 },
  { lat: 47.6010, lng: 19.1150, speed: 90, rpm: 2400 }, // M2 autópálya szakasz
  { lat: 47.6150, lng: 19.1300, speed: 50, rpm: 1700 }, // Dunakeszi bevezető
  { lat: 47.6250, lng: 19.1410, speed: 0, rpm: 0 }     // Turbó szerviz Dunakeszi
];

let routeIndex = Math.floor(Math.random() * baseRoutePoints.length);

// Hardware State
const hardwareState = {
  windowsClosed: true,
  sunroofClosed: true,
  doorsLocked: true,
  trunkClosed: true,
  batteryVoltage: 12.6,
  coolantTemp: 88,
  fuelLevelLiters: 48,
  fuelLevelPercent: 62,
  odometer: 264404
};

// Start periodic 4G telemetry transmission loop (Every 4 seconds)
setInterval(publishTelemetry, 4000);
publishTelemetry();

function publishTelemetry() {
  const basePoint = baseRoutePoints[routeIndex];
  
  // Advance route index
  routeIndex = (routeIndex + 1) % baseRoutePoints.length;

  const currentLat = Number((basePoint.lat + LAT_OFFSET).toFixed(5));
  const currentLng = Number((basePoint.lng + LNG_OFFSET).toFixed(5));

  const isMoving = basePoint.speed > 0;
  hardwareState.batteryVoltage = Number((isMoving ? 14.1 + Math.random() * 0.2 : 12.5 + Math.random() * 0.2).toFixed(2));

  const payload = JSON.stringify({
    vin: VIN,
    deviceId: DEVICE_ID,
    telemetry: {
      lat: currentLat,
      lng: currentLng,
      speed: basePoint.speed,
      rpm: basePoint.rpm,
      coolantTemp: hardwareState.coolantTemp,
      batteryVoltage: hardwareState.batteryVoltage,
      fuelLevelLiters: hardwareState.fuelLevelLiters,
      fuelLevelPercent: hardwareState.fuelLevelPercent,
      odometer: hardwareState.odometer
    }
  });

  const reqOptions = {
    hostname: TARGET_API_HOST,
    port: 443,
    path: '/api/telemetry/ingest',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    rejectUnauthorized: false
  };

  const req = https.request(reqOptions, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`[ESP32 HW ${DEVICE_ID} ➔ 4G HTTPS] Telemetria (${currentLat}, ${currentLng}) | Sebesség: ${basePoint.speed} km/h | Status: ${res.statusCode}`);
    });
  });

  req.on('error', (err) => {
    console.error(`[ESP32 HW ${DEVICE_ID}] ⚠️ 4G Küldési hiba:`, err.message);
  });

  req.write(payload);
  req.end();
}
