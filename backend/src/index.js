const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://mosquitto:1883';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_smartcar_jwt_key_2026';

// In-Memory Database (Pre-seeded with Demo Admin and User)
const users = [
  {
    id: 'usr_admin_1',
    name: 'Admin Rendszergazda',
    email: 'admin@smartcar.hu',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_imre_2',
    name: 'Imre (Mercedes GL Tulajdonos)',
    email: 'imre@smartcar.hu',
    passwordHash: bcrypt.hashSync('user123', 10),
    role: 'user',
    createdAt: new Date().toISOString()
  }
];

// CAN Profiles Library (For Hardware Provisioning)
const canProfiles = [
  { id: 'mb_w164', name: 'Mercedes-Benz GL / ML (W164 / X164)', canB_speed: '83.3kbps', canC_speed: '500kbps', status: 'verified' },
  { id: 'bmw_e60', name: 'BMW 5 Series / 3 Series (E60 / E90 K-CAN)', canB_speed: '100kbps', canC_speed: '500kbps', status: 'verified' },
  { id: 'vw_mqb', name: 'Volkswagen / Audi / Skoda (MQB Platform)', canB_speed: '500kbps', canC_speed: '500kbps', status: 'verified' },
  { id: 'ford_focus3', name: 'Ford Focus MK3 / Mondeo MK4 (MS-CAN)', canB_speed: '125kbps', canC_speed: '500kbps', status: 'testing' }
];

// Vehicles Database
const vehicles = {
  'WDC1648221A491726': {
    id: 'WDC1648221A491726',
    name: 'Mercedes-Benz GL 320 CDI (W164)',
    plate: 'ABC-123',
    ownerId: 'usr_imre_2',
    canProfileId: 'mb_w164',
    deviceId: 'ESP32_W164_001',
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

// MQTT Setup
let mqttClient;
try {
  mqttClient = mqtt.connect(MQTT_BROKER_URL, { reconnectPeriod: 3000 });
  mqttClient.on('connect', () => {
    console.log(`[MQTT] Connected to broker at ${MQTT_BROKER_URL}`);
    mqttClient.subscribe('smartcar/+/telemetry');
    mqttClient.subscribe('smartcar/+/status');
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
      console.error('[MQTT] Parse error:', err.message);
    }
  });
} catch (e) {
  console.error('[MQTT] Failed:', e.message);
}

// Authentication Middlewares
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Nincs megadva hitelesítő token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Érvénytelen vagy lejárt token' });
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Adminisztrátori jogosultság szükséges' });
  }
  next();
};

// Auth Routes
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Név, email és jelszó megadása kötelező' });
  }

  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Ezzel az email címmel már regisztráltak' });
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'user',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    success: true,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    token
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email.toLowerCase() === email?.toLowerCase());

  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Hibás email cím vagy jelszó' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token
  });
});

app.get('/api/auth/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Vehicle Routes
app.get('/api/vehicles', (req, res) => {
  res.json(Object.values(vehicles));
});

app.post('/api/vehicles/:vin/command', (req, res) => {
  const { vin } = req.params;
  const { action } = req.body;
  const vehicle = vehicles[vin];

  if (!vehicle) return res.status(404).json({ error: 'Jármű nem található' });

  if (action === 'ROLLUP_WINDOWS') {
    vehicle.controls.windowsClosed = true;
    vehicle.controls.sunroofClosed = true;
  } else if (action === 'LOCK_DOORS') {
    vehicle.controls.doorsLocked = true;
  } else if (action === 'UNLOCK_DOORS') {
    vehicle.controls.doorsLocked = false;
  }

  vehicle.lastUpdate = new Date().toISOString();

  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(`smartcar/${vin}/command`, JSON.stringify({ action, timestamp: Date.now() }));
  }

  io.emit('vehicle_update', vehicle);

  res.json({ success: true, message: `Parancs '${action}' sikeresen elküldve!`, vehicleState: vehicle.controls });
});

// Admin Routes (Device Provisioning & Users)
app.get('/api/admin/stats', verifyToken, verifyAdmin, (req, res) => {
  res.json({
    totalUsers: users.length,
    totalVehicles: Object.keys(vehicles).length,
    onlineDevices: Object.values(vehicles).filter(v => v.status === 'online').length,
    canProfilesCount: canProfiles.length,
    mqttStatus: mqttClient && mqttClient.connected ? 'connected' : 'disconnected'
  });
});

app.get('/api/admin/users', verifyToken, verifyAdmin, (req, res) => {
  res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt })));
});

app.get('/api/admin/can-profiles', verifyToken, (req, res) => {
  res.json(canProfiles);
});

app.post('/api/admin/devices', verifyToken, verifyAdmin, (req, res) => {
  const { name, vin, plate, ownerEmail, canProfileId, deviceId } = req.body;

  if (!vin || !name || !deviceId) {
    return res.status(400).json({ error: 'VIN, Név és Eszköz ID megadása kötelező' });
  }

  const owner = users.find(u => u.email.toLowerCase() === ownerEmail?.toLowerCase()) || users[1];

  const newVehicle = {
    id: vin,
    name,
    plate: plate || 'NEW-001',
    ownerId: owner.id,
    canProfileId: canProfileId || 'mb_w164',
    deviceId,
    status: 'online',
    lastUpdate: new Date().toISOString(),
    telemetry: {
      lat: 47.4979,
      lng: 19.0402,
      speed: 0,
      rpm: 0,
      coolantTemp: 85,
      batteryVoltage: 12.8,
      fuelLevelLiters: 55,
      fuelLevelPercent: 70,
      odometer: 125000
    },
    controls: { windowsClosed: true, sunroofClosed: true, doorsLocked: true, trunkClosed: true, engineRunning: false },
    dtcList: []
  };

  vehicles[vin] = newVehicle;
  io.emit('vehicle_update', newVehicle);

  res.json({ success: true, message: 'Új eszköz sikeresen párosítva!', vehicle: newVehicle });
});

// Periodic Telemetry Simulation
setInterval(() => {
  const gl = vehicles['WDC1648221A491726'];
  if (gl) {
    gl.telemetry.lat = Number((gl.telemetry.lat + (Math.random() - 0.5) * 0.0001).toFixed(6));
    gl.telemetry.lng = Number((gl.telemetry.lng + (Math.random() - 0.5) * 0.0001).toFixed(6));
    gl.telemetry.batteryVoltage = Number((12.5 + Math.random() * 0.3).toFixed(2));
    gl.lastUpdate = new Date().toISOString();
    io.emit('vehicle_update', gl);
  }
}, 5000);

// Socket.IO
io.on('connection', (socket) => {
  socket.emit('vehicles_init', Object.values(vehicles));
});

server.listen(PORT, () => {
  console.log(`[SERVER] SmartCar Telematics API + Auth running on port ${PORT}`);
});
