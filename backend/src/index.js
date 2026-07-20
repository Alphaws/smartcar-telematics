const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
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

// Live Vehicle In-Memory Cache (Synced with Postgres)
let vehiclesCache = {};

// Sync Vehicles & Telemetry from Postgres
async function refreshVehiclesCache() {
  try {
    const res = await db.query(`
      SELECT v.*, cp.name as can_profile_name, u.email as owner_email
      FROM vehicles v
      LEFT JOIN can_profiles cp ON v.can_profile_id = cp.id
      LEFT JOIN users u ON v.owner_id = u.id
    `);

    for (const row of res.rows) {
      // Get latest telemetry
      const telRes = await db.query(
        'SELECT * FROM telemetry_history WHERE vin = $1 ORDER BY recorded_at DESC LIMIT 1',
        [row.vin]
      );
      const latestTel = telRes.rows[0] || {
        lat: 47.5623, lng: 19.0812, speed: 0, rpm: 0, coolant_temp: 88,
        battery_voltage: 12.6, fuel_liters: 48, fuel_percent: 62, odometer: 264404
      };

      // Get DTC logs
      const dtcRes = await db.query(
        'SELECT code, module, description as desc, severity FROM dtc_logs WHERE vin = $1 ORDER BY recorded_at DESC',
        [row.vin]
      );

      vehiclesCache[row.vin] = {
        id: row.vin,
        name: row.name,
        plate: row.plate,
        ownerId: row.owner_id,
        canProfileId: row.can_profile_id,
        deviceId: row.device_id,
        status: row.status,
        lastUpdate: row.last_update ? new Date(row.last_update).toISOString() : new Date().toISOString(),
        telemetry: {
          lat: parseFloat(latestTel.lat),
          lng: parseFloat(latestTel.lng),
          speed: parseInt(latestTel.speed, 10),
          rpm: parseInt(latestTel.rpm, 10),
          coolantTemp: parseInt(latestTel.coolant_temp, 10),
          batteryVoltage: parseFloat(latestTel.battery_voltage),
          fuelLevelLiters: parseInt(latestTel.fuel_liters, 10),
          fuelLevelPercent: parseInt(latestTel.fuel_percent, 10),
          odometer: parseInt(latestTel.odometer, 10)
        },
        controls: {
          windowsClosed: row.windows_closed,
          sunroofClosed: row.sunroof_closed,
          doorsLocked: row.doors_locked,
          trunkClosed: row.trunk_closed,
          engineRunning: false
        },
        dtcList: dtcRes.rows
      };
    }
    console.log(`[DB] Refreshed vehicles cache (${Object.keys(vehiclesCache).length} vehicles)`);
  } catch (err) {
    console.error('[DB] Failed to refresh vehicles cache:', err.message);
  }
}

// MQTT Client Setup
let mqttClient;
try {
  mqttClient = mqtt.connect(MQTT_BROKER_URL, { reconnectPeriod: 3000 });
  mqttClient.on('connect', () => {
    console.log(`[MQTT] Connected to broker at ${MQTT_BROKER_URL}`);
    mqttClient.subscribe('smartcar/+/telemetry');
    mqttClient.subscribe('smartcar/+/status');
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      const parts = topic.split('/');
      const vin = parts[1];

      if (vehiclesCache[vin]) {
        if (topic.endsWith('/telemetry')) {
          vehiclesCache[vin].telemetry = { ...vehiclesCache[vin].telemetry, ...payload };
          vehiclesCache[vin].lastUpdate = new Date().toISOString();

          // Async persist to Postgres
          db.query(
            `INSERT INTO telemetry_history (vin, lat, lng, speed, rpm, coolant_temp, battery_voltage, fuel_liters, fuel_percent, odometer)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              vin, payload.lat, payload.lng, payload.speed || 0, payload.rpm || 0,
              payload.coolantTemp || 85, payload.batteryVoltage || 12.6,
              payload.fuelLevelLiters || 50, payload.fuelLevelPercent || 65,
              payload.odometer || 264404
            ]
          ).catch(e => console.error('[DB] Telemetry insert error:', e.message));

        } else if (topic.endsWith('/status')) {
          vehiclesCache[vin].controls = { ...vehiclesCache[vin].controls, ...payload };
        }
        io.emit('vehicle_update', vehiclesCache[vin]);
      }
    } catch (err) {
      console.error('[MQTT] Parse error:', err.message);
    }
  });
} catch (e) {
  console.error('[MQTT] Failed:', e.message);
}

// Middlewares
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

// Auth Routes (Postgres Backed)
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Név, email és jelszó megadása kötelező' });
  }

  try {
    const existing = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Ezzel az email címmel már regisztráltak' });
    }

    const userId = `usr_${Date.now()}`;
    const hash = bcrypt.hashSync(password, 10);

    const newUser = await db.query(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
      [userId, name, email.toLowerCase(), hash, 'user']
    );

    const user = newUser.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, user, token });
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    res.status(500).json({ error: 'Adatbázis hiba a regisztráció során' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    const user = userRes.rows[0];

    if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
      return res.status(401).json({ error: 'Hibás email cím vagy jelszó' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'Adatbázis hiba a bejelentkezés során' });
  }
});

app.get('/api/auth/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Vehicle Routes
app.get('/api/vehicles', (req, res) => {
  res.json(Object.values(vehiclesCache));
});

app.post('/api/vehicles/:vin/command', async (req, res) => {
  const { vin } = req.params;
  const { action } = req.body;
  const vehicle = vehiclesCache[vin];

  if (!vehicle) return res.status(404).json({ error: 'Jármű nem található' });

  if (action === 'ROLLUP_WINDOWS') {
    vehicle.controls.windowsClosed = true;
    vehicle.controls.sunroofClosed = true;
    db.query('UPDATE vehicles SET windows_closed = true, sunroof_closed = true WHERE vin = $1', [vin]).catch(console.error);
  } else if (action === 'LOCK_DOORS') {
    vehicle.controls.doorsLocked = true;
    db.query('UPDATE vehicles SET doors_locked = true WHERE vin = $1', [vin]).catch(console.error);
  } else if (action === 'UNLOCK_DOORS') {
    vehicle.controls.doorsLocked = false;
    db.query('UPDATE vehicles SET doors_locked = false WHERE vin = $1', [vin]).catch(console.error);
  }

  vehicle.lastUpdate = new Date().toISOString();

  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(`smartcar/${vin}/command`, JSON.stringify({ action, timestamp: Date.now() }));
  }

  io.emit('vehicle_update', vehicle);

  res.json({ success: true, message: `Parancs '${action}' sikeresen elküldve!`, vehicleState: vehicle.controls });
});

// Admin Routes (Postgres Backed)
app.get('/api/admin/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const uRes = await db.query('SELECT COUNT(*) FROM users');
    const vRes = await db.query('SELECT COUNT(*) FROM vehicles');
    const pRes = await db.query('SELECT COUNT(*) FROM can_profiles');

    res.json({
      totalUsers: parseInt(uRes.rows[0].count, 10),
      totalVehicles: parseInt(vRes.rows[0].count, 10),
      onlineDevices: Object.values(vehiclesCache).filter(v => v.status === 'online').length,
      canProfilesCount: parseInt(pRes.rows[0].count, 10),
      mqttStatus: mqttClient && mqttClient.connected ? 'connected' : 'disconnected'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const uRes = await db.query('SELECT id, name, email, role, created_at as "createdAt" FROM users ORDER BY created_at DESC');
    res.json(uRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/can-profiles', verifyToken, async (req, res) => {
  try {
    const pRes = await db.query('SELECT id, name, can_b_speed as "canB_speed", can_c_speed as "canC_speed", status FROM can_profiles');
    res.json(pRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/devices', verifyToken, verifyAdmin, async (req, res) => {
  const { name, vin, plate, ownerEmail, canProfileId, deviceId } = req.body;

  if (!vin || !name || !deviceId) {
    return res.status(400).json({ error: 'VIN, Név és Eszköz ID megadása kötelező' });
  }

  try {
    const ownerRes = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [ownerEmail]);
    const ownerId = ownerRes.rows[0]?.id || 'usr_imre_2';

    await db.query(
      `INSERT INTO vehicles (vin, name, plate, owner_id, can_profile_id, device_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'online')
       ON CONFLICT (vin) DO UPDATE SET name = EXCLUDED.name, plate = EXCLUDED.plate, device_id = EXCLUDED.device_id`,
      [vin, name, plate || 'NEW-001', ownerId, canProfileId || 'mb_w164', deviceId]
    );

    await refreshVehiclesCache();
    io.emit('vehicle_update', vehiclesCache[vin]);

    res.json({ success: true, message: 'Új eszköz sikeresen regisztrálva az adatbázisban!', vehicle: vehiclesCache[vin] });
  } catch (err) {
    console.error('[ADMIN] Add device error:', err);
    res.status(500).json({ error: 'Adatbázis hiba az eszköz regisztrációja során' });
  }
});

// Periodic Telemetry Simulation
setInterval(() => {
  const gl = vehiclesCache['WDC1648221A491726'];
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
  socket.emit('vehicles_init', Object.values(vehiclesCache));
});

// Init DB and Start Server
refreshVehiclesCache().then(() => {
  server.listen(PORT, () => {
    console.log(`[SERVER] SmartCar Production Telematics API connected to Postgres on port ${PORT}`);
  });
});
