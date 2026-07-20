const mqtt = require('mqtt');

// Dynamic Configuration via Environment Variables
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const VIN = process.env.VIN || 'WDC1648221A491726';
const DEVICE_ID = process.env.DEVICE_ID || 'ESP32_EMULATOR_HW_001';
const CAR_NAME = process.env.CAR_NAME || 'Mercedes-Benz GL 320 CDI (W164)';

// Latitude & Longitude Offsets for Multi-Car Routes
const LAT_OFFSET = parseFloat(process.env.LAT_OFFSET || '0');
const LNG_OFFSET = parseFloat(process.env.LNG_OFFSET || '0');

console.log('================================================================');
console.log('      🤖 ESP32 Dual-CAN & 4G Hardver Emulátor szerviz           ');
console.log('================================================================');
console.log(`[ESP32 HW] Eszköz ID: ${DEVICE_ID}`);
console.log(`[ESP32 HW] Autó Neve:  ${CAR_NAME}`);
console.log(`[ESP32 HW] Autó VIN:   ${VIN}`);
console.log(`[ESP32 HW] Kapcsolódás az MQTT Brokerhez (${MQTT_BROKER_URL})...`);

const client = mqtt.connect(MQTT_BROKER_URL);

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
  windowsClosed: false,
  sunroofClosed: false,
  doorsLocked: false,
  trunkClosed: true,
  batteryVoltage: 12.6,
  coolantTemp: 88,
  fuelLevelLiters: 48,
  fuelLevelPercent: 62,
  odometer: 264404
};

client.on('connect', () => {
  console.log(`[ESP32 HW ${DEVICE_ID}] ✅ Sikeres MQTTS kapcsolat létrejött!`);
  
  // Subscribe to command topic
  const commandTopic = `smartcar/${VIN}/command`;
  client.subscribe(commandTopic, (err) => {
    if (!err) {
      console.log(`[ESP32 HW ${DEVICE_ID}] 📡 Feliratkozva a parancscsatornára: ${commandTopic}`);
    }
  });

  // Start periodic telemetry loop (Every 4 seconds)
  setInterval(publishTelemetry, 4000);
});

client.on('message', (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log(`\n[ESP32 HW ${DEVICE_ID}] 📩 PARANCS ÉRKEZETT (${topic}):`, payload);

    if (payload.action === 'ROLLUP_WINDOWS') {
      console.log('  └─► [CAN-B BUSZ] CAN Frame INJEKTÁLÁS: 0x01E0 [ ROLLUP ALL ]');
      hardwareState.windowsClosed = true;
      hardwareState.sunroofClosed = true;
      publishStatus();
      console.log(`  └─► [ESP32 HW ${DEVICE_ID}] ✅ Ablakok és tolótető sikeresen ZÁRVA!`);

    } else if (payload.action === 'LOCK_DOORS') {
      console.log('  └─► [CAN-B BUSZ] CAN Frame INJEKTÁLÁS: 0x01A0 [ LOCK ALL ]');
      hardwareState.doorsLocked = true;
      publishStatus();
      console.log(`  └─► [ESP32 HW ${DEVICE_ID}] ✅ Központi zár ZÁRVA!`);

    } else if (payload.action === 'UNLOCK_DOORS') {
      console.log('  └─► [CAN-B BUSZ] CAN Frame INJEKTÁLÁS: 0x01A0 [ UNLOCK ALL ]');
      hardwareState.doorsLocked = false;
      publishStatus();
      console.log(`  └─► [ESP32 HW ${DEVICE_ID}] 🔓 Központi zár NYITVA!`);
    }

  } catch (err) {
    console.error(`[ESP32 HW ${DEVICE_ID}] Parancs feldolgozási hiba:`, err.message);
  }
});

function publishTelemetry() {
  const basePoint = baseRoutePoints[routeIndex];
  
  // Advance route index
  routeIndex = (routeIndex + 1) % baseRoutePoints.length;

  const currentLat = Number((basePoint.lat + LAT_OFFSET).toFixed(5));
  const currentLng = Number((basePoint.lng + LNG_OFFSET).toFixed(5));

  const isMoving = basePoint.speed > 0;
  hardwareState.batteryVoltage = Number((isMoving ? 14.1 + Math.random() * 0.2 : 12.5 + Math.random() * 0.2).toFixed(2));

  const telemetryPayload = {
    lat: currentLat,
    lng: currentLng,
    speed: basePoint.speed,
    rpm: basePoint.rpm,
    coolantTemp: hardwareState.coolantTemp,
    batteryVoltage: hardwareState.batteryVoltage,
    fuelLevelLiters: hardwareState.fuelLevelLiters,
    fuelLevelPercent: hardwareState.fuelLevelPercent,
    odometer: hardwareState.odometer,
    timestamp: Date.now()
  };

  const topic = `smartcar/${VIN}/telemetry`;
  client.publish(topic, JSON.stringify(telemetryPayload));
  console.log(`[ESP32 HW ${DEVICE_ID} ➔ 4G] Telemetria (${currentLat}, ${currentLng}) | Sebesség: ${basePoint.speed} km/h`);
}

function publishStatus() {
  const topic = `smartcar/${VIN}/status`;
  client.publish(topic, JSON.stringify(hardwareState));
}
