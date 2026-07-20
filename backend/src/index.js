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

let vehiclesCache = {};

// Sync Vehicles Cache from Postgres
async function refreshVehiclesCache() {
  try {
    const res = await db.query(`
      SELECT v.*, cp.name as can_profile_name, u.email as owner_email, u.name as owner_name
      FROM vehicles v
      LEFT JOIN can_profiles cp ON v.can_profile_id = cp.id
      LEFT JOIN users u ON v.owner_id = u.id
    `);

    vehiclesCache = {};
    for (const row of res.rows) {
      const telRes = await db.query(
        'SELECT * FROM telemetry_history WHERE vin = $1 ORDER BY recorded_at DESC LIMIT 1',
        [row.vin]
      );
      const latestTel = telRes.rows[0] || {
        lat: 47.5623, lng: 19.0812, speed: 0, rpm: 0, coolant_temp: 88,
        battery_voltage: 12.6, fuel_liters: 48, fuel_percent: 62, odometer: 264404
      };

      const dtcRes = await db.query(
        'SELECT code, module, description as desc, severity FROM dtc_logs WHERE vin = $1 ORDER BY recorded_at DESC',
        [row.vin]
      );

      vehiclesCache[row.vin] = {
        id: row.vin,
        vin: row.vin,
        name: row.name,
        plate: row.plate,
        ownerId: row.owner_id,
        ownerEmail: row.owner_email,
        ownerName: row.owner_name,
        canProfileId: row.can_profile_id,
        canProfileName: row.can_profile_name,
        deviceId: row.device_id,
        status: row.status, // 'pending_activation' | 'online' | 'offline'
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

      if (vehiclesCache[vin] && vehiclesCache[vin].status === 'online') {
        if (topic.endsWith('/telemetry')) {
          vehiclesCache[vin].telemetry = { ...vehiclesCache[vin].telemetry, ...payload };
          vehiclesCache[vin].lastUpdate = new Date().toISOString();

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

// Auth Middlewares
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
app.get('/api/vehicles', verifyToken, (req, res) => {
  const allVehicles = Object.values(vehiclesCache);
  if (req.user.role === 'admin') {
    return res.json(allVehicles);
  }
  const userVehicles = allVehicles.filter(v => v.ownerId === req.user.id);
  res.json(userVehicles);
});

// Customer adds a new vehicle (Pending Activation)
app.post('/api/vehicles/register', verifyToken, async (req, res) => {
  const { name, vin, plate } = req.body;
  if (!name || !vin || !plate) {
    return res.status(400).json({ error: 'Név, Alvázszám (VIN) és Rendszám megadása kötelező' });
  }

  try {
    const existing = await db.query('SELECT * FROM vehicles WHERE vin = $1', [vin]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Ezzel az alvázszámmal már regisztráltak járművet' });
    }

    const tempDeviceId = `PENDING_${vin}`;

    await db.query(
      `INSERT INTO vehicles (vin, name, plate, owner_id, device_id, status)
       VALUES ($1, $2, $3, $4, $5, 'pending_activation')`,
      [vin, name, plate, req.user.id, tempDeviceId]
    );

    await refreshVehiclesCache();
    io.emit('vehicle_update', vehiclesCache[vin]);

    res.json({
      success: true,
      message: 'Jármű adatai rögzítve! A beszereléskor az Adminisztrátor párosítja a fizikai ESP32 eszközt.',
      vehicle: vehiclesCache[vin]
    });
  } catch (err) {
    console.error('[VEHICLE] Customer register error:', err);
    res.status(500).json({ error: 'Adatbázis hiba a jármű felvétele során' });
  }
});

// Telemetry History Endpoint (Retrieves telemetry logs up to 1 year back)
app.get('/api/vehicles/:vin/history', verifyToken, async (req, res) => {
  const { vin } = req.params;
  const { range } = req.query; // '24h', '7d', '30d', '1y'

  let timeFilter = "NOW() - INTERVAL '24 hours'";
  if (range === '7d') timeFilter = "NOW() - INTERVAL '7 days'";
  if (range === '30d') timeFilter = "NOW() - INTERVAL '30 days'";
  if (range === '1y') timeFilter = "NOW() - INTERVAL '1 year'";

  try {
    const result = await db.query(
      `SELECT recorded_at, lat, lng, speed, rpm, coolant_temp as "coolantTemp",
              battery_voltage as "batteryVoltage", fuel_liters as "fuelLevelLiters",
              fuel_percent as "fuelLevelPercent", odometer
       FROM telemetry_history
       WHERE vin = $1 AND recorded_at >= ${timeFilter}
       ORDER BY recorded_at ASC
       LIMIT 2000`,
      [vin]
    );

    res.json({ success: true, count: result.rows.length, history: result.rows });
  } catch (err) {
    console.error('[DB] History query error:', err);
    res.status(500).json({ error: 'Adatbázis hiba az előzmények lekérdezésekor' });
  }
});

// Universal 4G Telemetry Ingest Endpoint (Protected with Hardware Secret)
app.post('/api/telemetry/ingest', async (req, res) => {
  const { vin, deviceId, secret, telemetry } = req.body;
  const headerSecret = req.headers['x-device-secret'];
  const expectedSecret = process.env.HARDWARE_SECRET || 'smartcar_esp32_hw_secret_key_2026';

  // Security Check: Verify Hardware Secret Token
  if (secret !== expectedSecret && headerSecret !== expectedSecret) {
    console.warn(`[SECURITY WARN] Érvénytelen hardver kulccsal próbáltak telemetriát küldeni az eszközről: ${deviceId || vin}`);
    return res.status(401).json({ error: 'Érvénytelen hardver hitelesítő kulcs (Unauthorized Device Secret)' });
  }

  if (!vin || !telemetry) {
    return res.status(400).json({ error: 'VIN és telemetria adatok megadása kötelező' });
  }

  if (vehiclesCache[vin] && vehiclesCache[vin].status === 'online') {
    vehiclesCache[vin].telemetry = { ...vehiclesCache[vin].telemetry, ...telemetry };
    vehiclesCache[vin].lastUpdate = new Date().toISOString();

    db.query(
      `INSERT INTO telemetry_history (vin, lat, lng, speed, rpm, coolant_temp, battery_voltage, fuel_liters, fuel_percent, odometer)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        vin, telemetry.lat, telemetry.lng, telemetry.speed || 0, telemetry.rpm || 0,
        telemetry.coolantTemp || 85, telemetry.batteryVoltage || 12.6,
        telemetry.fuelLevelLiters || 50, telemetry.fuelLevelPercent || 65,
        telemetry.odometer || 264404
      ]
    ).catch(e => console.error('[DB] Telemetry insert error:', e.message));

    io.emit('vehicle_update', vehiclesCache[vin]);
    return res.json({ success: true, message: 'Telemetria hitelesítve és rögzítve!' });
  }

  res.status(404).json({ error: 'Jármű nem található vagy nincs aktiválva' });
});

app.post('/api/vehicles/:vin/command', verifyToken, async (req, res) => {
  const { vin } = req.params;
  const { action } = req.body;
  const vehicle = vehiclesCache[vin];

  if (!vehicle) return res.status(404).json({ error: 'Jármű nem található' });
  if (vehicle.status !== 'online') {
    return res.status(400).json({ error: 'Ez a jármű még nincs aktiválva vagy nincs rákötve hardver!' });
  }

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

// ADMIN MANAGEMENT ENDPOINTS (Full CRUD + Search + Filter + Pagination)
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

// Admin Users CRUD
app.get('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const qRes = await db.query(`
      SELECT u.id, u.name, u.email, u.role, u.created_at as "createdAt",
             COUNT(v.vin) as "vehicleCount"
      FROM users u
      LEFT JOIN vehicles v ON v.owner_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json(qRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;
  try {
    await db.query(
      'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), role = COALESCE($3, role) WHERE id = $4',
      [name, email, role, id]
    );
    res.json({ success: true, message: 'Ügyfél adatai sikeresen módosítva!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true, message: 'Ügyfél törölve!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Vehicles CRUD
app.get('/api/admin/vehicles', verifyToken, verifyAdmin, async (req, res) => {
  res.json(Object.values(vehiclesCache));
});

app.patch('/api/admin/vehicles/:vin', verifyToken, verifyAdmin, async (req, res) => {
  const { vin } = req.params;
  const { name, plate, status, deviceId, canProfileId, ownerId } = req.body;
  try {
    await db.query(
      `UPDATE vehicles 
       SET name = COALESCE($1, name), plate = COALESCE($2, plate), status = COALESCE($3, status),
           device_id = COALESCE($4, device_id), can_profile_id = COALESCE($5, can_profile_id),
           owner_id = COALESCE($6, owner_id), last_update = NOW()
       WHERE vin = $7`,
      [name, plate, status, deviceId, canProfileId, ownerId, vin]
    );
    await refreshVehiclesCache();
    if (vehiclesCache[vin]) io.emit('vehicle_update', vehiclesCache[vin]);
    res.json({ success: true, message: 'Jármű adatai frissítve!', vehicle: vehiclesCache[vin] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/vehicles/:vin', verifyToken, verifyAdmin, async (req, res) => {
  const { vin } = req.params;
  try {
    await db.query('DELETE FROM vehicles WHERE vin = $1', [vin]);
    delete vehiclesCache[vin];
    res.json({ success: true, message: 'Jármű törölve a rendszerből!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Devices List
app.get('/api/admin/devices', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const resVehicles = Object.values(vehiclesCache);
    const devicesList = resVehicles.map(v => ({
      deviceId: v.deviceId,
      vin: v.vin,
      vehicleName: v.name,
      plate: v.plate,
      ownerEmail: v.ownerEmail,
      status: v.status,
      canProfileName: v.canProfileName,
      lastPing: v.lastUpdate
    }));
    res.json(devicesList);
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

// Admin Pairs Physical ESP32 Device (IMEI/MAC) & CAN Profile to Customer's Vehicle
app.post('/api/admin/devices/pair', verifyToken, verifyAdmin, async (req, res) => {
  const { vin, deviceId, canProfileId } = req.body;

  if (!vin || !deviceId || !canProfileId) {
    return res.status(400).json({ error: 'VIN, Fizikai ESP32 Eszköz ID és CAN Profil megadása kötelező' });
  }

  try {
    await db.query(
      `UPDATE vehicles 
       SET device_id = $1, can_profile_id = $2, status = 'online', last_update = NOW()
       WHERE vin = $3`,
      [deviceId, canProfileId, vin]
    );

    await refreshVehiclesCache();
    io.emit('vehicle_update', vehiclesCache[vin]);

    res.json({
      success: true,
      message: `ESP32 Eszköz (${deviceId}) sikeresen párosítva és aktiválva a(z) ${vin} alvázszámú járműhöz!`,
      vehicle: vehiclesCache[vin]
    });
  } catch (err) {
    console.error('[ADMIN] Pair device error:', err);
    res.status(500).json({ error: 'Adatbázis hiba az eszköz párosítása során' });
  }
});

// Periodic Telemetry Simulation
setInterval(() => {
  const gl = vehiclesCache['WDC1648221A491726'];
  if (gl && gl.status === 'online') {
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
