const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://mosquitto:1883';

// In-Memory Database for Vehicles State & Telemetry
const vehicles = {
  'WDC1648221A491726': {
    id: 'WDC1648221A491726',
    name: 'Mercedes-Benz GL 320 CDI (W164)',
    plate: 'ABC-123',
    owner: 'Imre',
    status: 'online',
    lastUpdate: new Date().toISOString(),
    telemetry: {
      lat: 47.5623,
      lng: 19.0812,
      speed: 0,
      rpm: 0,
      coolantTemp: 88,
      batteryVoltage: 12.6,
      fuelLevelLiters: 48,
      fuelLevelPercent: 62,
      odometer: 264404
    },
    controls: {
      windowsClosed: true,
      sunroofClosed: true,
      doorsLocked: true,
      trunkClosed: true,
      engineRunning: false
    },
    dtcList: [
      { code: 'P0299', module: 'ECM', desc: 'Turbocharger Underboost Condition (Aktuátor szorulás kód)', severity: 'warning' },
      { code: 'C1000', module: 'ESP', desc: 'CAN Communication Temporary Interruption', severity: 'info' }
    ]
  }
};

// MQTT Client Setup
let mqttClient;
try {
  mqttClient = mqtt.connect(MQTT_BROKER_URL, { reconnectPeriod: 3000 });

  mqttClient.on('connect', () => {
    console.log(`[MQTT] Connected to broker at ${MQTT_BROKER_URL}`);
    mqttClient.subscribe('smartcar/+/telemetry');
    mqttClient.subscribe('smartcar/+/status');
    mqttClient.subscribe('smartcar/+/dtc');
  });

  mqttClient.on('message', (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      const parts = topic.split('/');
      const vin = parts[1];

      if (vehicles[vin]) {
        if (topic.endsWith('/telemetry')) {
          vehicles[vin].telemetry = { ...vehicles[vin].telemetry, ...payload };
          vehicles[vin].lastUpdate = new Date().toISOString();
        } else if (topic.endsWith('/status')) {
          vehicles[vin].controls = { ...vehicles[vin].controls, ...payload };
        }
        io.emit('vehicle_update', vehicles[vin]);
      }
    } catch (err) {
      console.error('[MQTT] Message parsing error:', err.message);
    }
  });

  mqttClient.on('error', (err) => {
    console.error('[MQTT] Connection error:', err.message);
  });
} catch (e) {
  console.error('[MQTT] Initialization failed:', e.message);
}

// REST API Endpoints

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SmartCar Telematics API', timestamp: new Date().toISOString() });
});

// Get List of Vehicles
app.get('/api/vehicles', (req, res) => {
  res.json(Object.values(vehicles));
});

// Get Single Vehicle Details
app.get('/api/vehicles/:vin', (req, res) => {
  const vehicle = vehicles[req.params.vin];
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(vehicle);
});

// Trigger Vehicle Command (Roll up windows, lock/unlock doors, trunk)
app.post('/api/vehicles/:vin/command', (req, res) => {
  const { vin } = req.params;
  const { action, target } = req.body; // e.g. action: 'ROLLUP_WINDOWS', 'LOCK_DOORS', 'UNLOCK_DOORS'

  const vehicle = vehicles[vin];
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  console.log(`[COMMAND] Executing ${action} on vehicle ${vin}`);

  // Update State in-memory
  if (action === 'ROLLUP_WINDOWS') {
    vehicle.controls.windowsClosed = true;
    vehicle.controls.sunroofClosed = true;
  } else if (action === 'LOCK_DOORS') {
    vehicle.controls.doorsLocked = true;
  } else if (action === 'UNLOCK_DOORS') {
    vehicle.controls.doorsLocked = false;
  } else if (action === 'TOGGLE_TRUNK') {
    vehicle.controls.trunkClosed = !vehicle.controls.trunkClosed;
  }

  vehicle.lastUpdate = new Date().toISOString();

  // Publish CAN Command via MQTT if broker connected
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(`smartcar/${vin}/command`, JSON.stringify({ action, timestamp: Date.now() }));
  }

  // Notify Web Clients via WebSocket
  io.emit('vehicle_update', vehicle);

  res.json({
    success: true,
    action,
    message: `Command '${action}' dispatched successfully to CAN-B bus!`,
    vehicleState: vehicle.controls
  });
});

// Periodic Telemetry Simulation (Simulates driving / sensor updates for demo)
setInterval(() => {
  const gl = vehicles['WDC1648221A491726'];
  if (gl) {
    // Slight jitter in GPS and Battery Voltage to demonstrate real-time updates
    const latOffset = (Math.random() - 0.5) * 0.0001;
    const lngOffset = (Math.random() - 0.5) * 0.0001;
    gl.telemetry.lat = Number((gl.telemetry.lat + latOffset).toFixed(6));
    gl.telemetry.lng = Number((gl.telemetry.lng + lngOffset).toFixed(6));
    gl.telemetry.batteryVoltage = Number((12.5 + Math.random() * 0.3).toFixed(2));
    gl.lastUpdate = new Date().toISOString();

    io.emit('vehicle_update', gl);
  }
}, 5000);

// Socket.IO Connections
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Web client connected: ${socket.id}`);
  socket.emit('vehicles_init', Object.values(vehicles));

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Web client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`[SERVER] SmartCar Telematics API running on port ${PORT}`);
});
