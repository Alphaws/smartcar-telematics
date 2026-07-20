const mqtt = require('mqtt');

// Configuration
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const VIN = 'WDC1648221A491726';
const DEVICE_ID = 'ESP32_EMULATOR_HW_001';

console.log('================================================================');
console.log('      🤖 ESP32 Dual-CAN & 4G Hardver Emulátor szerviz           ');
console.log('================================================================');
console.log(`[ESP32 HW] Eszköz ID: ${DEVICE_ID}`);
console.log(`[ESP32 HW] Autó VIN:   ${VIN} (Mercedes-Benz GL 320 CDI W164)`);
console.log(`[ESP32 HW] Kapcsolódás az MQTT Brokerhez (${MQTT_BROKER_URL})...`);

const client = mqtt.connect(MQTT_BROKER_URL);

// Simulated Driving Route (Budapest -> Dunakeszi route points)
const routePoints = [
  { lat: 47.5623, lng: 19.0812, speed: 0, rpm: 0 },
  { lat: 47.5680, lng: 19.0850, speed: 35, rpm: 1500 },
  { lat: 47.5750, lng: 19.0910, speed: 52, rpm: 1850 },
  { lat: 47.5890, lng: 19.1020, speed: 70, rpm: 2100 },
  { lat: 47.6010, lng: 19.1150, speed: 90, rpm: 2400 }, // M2 autópálya szakasz
  { lat: 47.6150, lng: 19.1300, speed: 50, rpm: 1700 }, // Dunakeszi bevezető
  { lat: 47.6250, lng: 19.1410, speed: 0, rpm: 0 }     // AH Turbó szerviz Dunakeszi
];

let routeIndex = 0;

// Hardware State
const hardwareState = {
  windowsClosed: false, // Megkezdéskor legyenek nyitva az ablakok a teszteléshez!
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
  console.log('[ESP32 HW] ✅ Sikeres MQTTS kapcsolat létrejött!');
  
  // Subscribe to command topic
  const commandTopic = `smartcar/${VIN}/command`;
  client.subscribe(commandTopic, (err) => {
    if (!err) {
      console.log(`[ESP32 HW] 📡 Feliratkozva a parancscsatornára: ${commandTopic}`);
    }
  });

  // Start periodic telemetry loop (Every 4 seconds)
  setInterval(publishTelemetry, 4000);
});

client.on('message', (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log(`\n[ESP32 HW] 📩 PARANCS ÉRKEZETT a szervertől (${topic}):`, payload);

    if (payload.action === 'ROLLUP_WINDOWS') {
      console.log('  └─► [CAN-B BUSZ] CAN Frame INJEKTÁLÁS: 0x01E0 [ 02 30 FF 00 00 00 00 00 ]');
      console.log('  └─► [AKTUÁTOR] Az ajtómodulok felhúzzák az ablakokat és a tolótetőt...');
      
      hardwareState.windowsClosed = true;
      hardwareState.sunroofClosed = true;

      // Publish updated status back to broker
      publishStatus();
      console.log('  └─► [ESP32 HW] ✅ Ablakok és tolótető sikeresen ZÁRVA!');

    } else if (payload.action === 'LOCK_DOORS') {
      console.log('  └─► [CAN-B BUSZ] CAN Frame INJEKTÁLÁS: 0x01A0 [ LOCK ALL ]');
      hardwareState.doorsLocked = true;
      publishStatus();
      console.log('  └─► [ESP32 HW] ✅ Központi zár ZÁRVA!');

    } else if (payload.action === 'UNLOCK_DOORS') {
      console.log('  └─► [CAN-B BUSZ] CAN Frame INJEKTÁLÁS: 0x01A0 [ UNLOCK ALL ]');
      hardwareState.doorsLocked = false;
      publishStatus();
      console.log('  └─► [ESP32 HW] 🔓 Központi zár NYITVA!');
    }

  } catch (err) {
    console.error('[ESP32 HW] Parancs feldolgozási hiba:', err.message);
  }
});

function publishTelemetry() {
  const currentPoint = routePoints[routeIndex];
  
  // Advance route index
  routeIndex = (routeIndex + 1) % routePoints.length;

  // Simulate slight battery voltage fluctuations (12.4V - 14.2V when running)
  const isMoving = currentPoint.speed > 0;
  hardwareState.batteryVoltage = Number((isMoving ? 14.1 + Math.random() * 0.2 : 12.5 + Math.random() * 0.2).toFixed(2));

  const telemetryPayload = {
    lat: currentPoint.lat,
    lng: currentPoint.lng,
    speed: currentPoint.speed,
    rpm: currentPoint.rpm,
    coolantTemp: hardwareState.coolantTemp,
    batteryVoltage: hardwareState.batteryVoltage,
    fuelLevelLiters: hardwareState.fuelLevelLiters,
    fuelLevelPercent: hardwareState.fuelLevelPercent,
    odometer: hardwareState.odometer,
    timestamp: Date.now()
  };

  const topic = `smartcar/${VIN}/telemetry`;
  client.publish(topic, JSON.stringify(telemetryPayload));
  console.log(`[ESP32 HW ➔ 4G] Telemetria elküldve (${currentPoint.lat}, ${currentPoint.lng}) | Sebesség: ${currentPoint.speed} km/h | Akku: ${hardwareState.batteryVoltage}V`);
}

function publishStatus() {
  const topic = `smartcar/${VIN}/status`;
  client.publish(topic, JSON.stringify(hardwareState));
}
