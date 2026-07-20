import React, { useState, useEffect } from 'react';
import { 
  Shield, Cpu, Users, Radio, PlusCircle, BookOpen, Wrench, FileCode, Zap, 
  CheckCircle, AlertTriangle, RefreshCw, Copy, Check, Link, Server, RadioTower, HelpCircle
} from 'lucide-react';

export default function AdminPortal({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('docs'); // Default to 'docs' for detailed view
  const [stats, setStats] = useState(null);
  const [canProfiles, setCanProfiles] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  // Device Pairing Form State
  const [selectedVin, setSelectedVin] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [selectedCanProfile, setSelectedCanProfile] = useState('');
  const [formMsg, setFormMsg] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [resStats, resProfiles, resUsers, resVehicles] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/can-profiles', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/vehicles', { headers })
      ]);

      const statsData = await resStats.json();
      const profilesData = await resProfiles.json();
      const usersData = await resUsers.json();
      const vehiclesData = await resVehicles.json();

      setStats(statsData);
      setCanProfiles(profilesData);
      setUsersList(usersData);
      setVehiclesList(vehiclesData);

      if (profilesData.length > 0) setSelectedCanProfile(profilesData[0].id);
      if (vehiclesData.length > 0) setSelectedVin(vehiclesData[0].vin);
    } catch (err) {
      console.error('Admin data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePairDevice = async (e) => {
    e.preventDefault();
    setFormMsg(null);

    try {
      const res = await fetch('/api/admin/devices/pair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          vin: selectedVin,
          deviceId,
          canProfileId: selectedCanProfile
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Sikertelen eszköz párosítás');

      setFormMsg({ type: 'success', text: data.message });
      setDeviceId('');
      fetchAdminData();
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message });
    }
  };

  const esphomeCodeExample = `esphome:
  name: smartcar-esp32-telematics
  platformio_options:
    board_build.f_cpu: 240000000L

esp32:
  board: esp32-s3-devkitc-1
  framework:
    type: arduino

# 1. 4G LTE Modem UART Kommunikáció (A7670E / SIM7600)
uart:
  - id: modem_uart
    tx_pin: GPIO17
    rx_pin: GPIO16
    baud_rate: 115200

# 2. GPS NMEA Vevő
gps:
  id: gps_tracker
  uart_id: modem_uart
  latitude:
    name: "GPS Szélességi Kör"
  longitude:
    name: "GPS Hosszúsági Kör"
  speed:
    name: "GPS Sebesség"

# 3. CAN-C (Motor & Diagnosztika 500 kbps) — ESP32 Beépített TWAI Vezérlővel
canbus:
  - platform: esp32_can
    id: can_c_powertrain
    tx_pin: GPIO5
    rx_pin: GPIO4
    bit_rate: 500kbps

  # 4. CAN-B (Komfort Hálózat 83.3 kbps) — MCP2515 SPI Modullal
  - platform: mcp2515
    id: can_b_comfort
    cs_pin: GPIO15
    bit_rate: 83.3kbps
    clock: 8MHz
    on_frame:
      - can_id: 0x0008 # Mercedes W164 Zárási Állapot Frame
        then:
          - lambda: |-
              ESP_LOGD("CAN_B", "Mercedes W164 Zárak állapota megváltozott");

# MQTT Beküldés a SmartCar Szerver felé (TLS 1.3 MQTTS)
mqtt:
  broker: api.smartcar.localhost
  port: 8883
  username: esp32_device
  password: super_secure_device_token
  topic_prefix: smartcar/WDC1648221A491726

# Távvezérlő Akciók (Ablak felhúzása parancs injektálása)
button:
  - platform: template
    name: "Ablakok Felhúzása Parancs"
    on_press:
      - canbus.send:
          canbus_id: can_b_comfort
          can_id: 0x01E0 # Mercedes Door Control Module (DCM) komfort parancs
          use_extended_id: false
          data: [ 0x02, 0x30, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00 ]`;

  const cppCodeExample = `#include <Arduino.h>
#include <ESP32CAN.h>
#include <CAN_config.h>
#include <SPI.h>
#include <mcp2515.h>

// CAN-C (TWAI) Pins
#define CAN_C_RX_PIN GPIO_NUM_4
#define CAN_C_TX_PIN GPIO_NUM_5

// CAN-B (MCP2515 SPI) Pins
#define MCP2515_CS_PIN 15
MCP2515 mcp2515(MCP2515_CS_PIN);

CAN_device_t CAN_cfg;

void setup() {
  Serial.begin(115200);
  Serial.println("[SMARTCAR HW] Rendszer indítása...");

  // 1. CAN-C Init (500 kbps)
  CAN_cfg.speed = CAN_SPEED_500KBPS;
  CAN_cfg.tx_pin_id = CAN_C_TX_PIN;
  CAN_cfg.rx_pin_id = CAN_C_RX_PIN;
  CAN_cfg.rx_queue = xQueueCreate(10, sizeof(CAN_message_t));
  ESP32CAN_Init();
  Serial.println("[CAN-C] Diagnosztikai busz (500k) elindítva");

  // 2. CAN-B Init (83.3 kbps)
  mcp2515.reset();
  mcp2515.setBitrate(CAN_83KBPS, MCP_8MHZ);
  mcp2515.setNormalMode();
  Serial.println("[CAN-B] Komfort busz (83.3k) elindítva");
}

void loop() {
  CAN_message_t msg;
  if (xQueueReceive(CAN_cfg.rx_queue, &msg, 0) == pdTRUE) {
    if (msg.MsgID == 0x0208) {
      Serial.printf("[CAN-C] Motor RPM: %d, Sebesség: %d km/h\\n", msg.data[0] * 32, msg.data[2]);
    }
  }
  delay(10);
}`;

  const handleCopy = (code, key) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (loading) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <RefreshCw className="animate-spin" size={40} style={{ color: '#00f2fe' }} />
        <h2>Adminisztrációs Adatok Betöltése...</h2>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Admin Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon" style={{ background: 'linear-gradient(135deg, #7f53ac, #64748b)' }}>
            <Shield size={26} />
          </div>
          <div className="brand-title">
            <h1>SmartCar Telematics Master Handbook</h1>
            <div className="brand-subtitle">Teljes Rendszer, Hardver, Bekötési & Kódolási Dokumentáció</div>
          </div>
        </div>
        <button className="btn-secondary" onClick={onLogout}>Kijelentkezés</button>
      </header>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button 
          className={`btn-secondary ${activeTab === 'docs' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('docs')}
          style={{ background: activeTab === 'docs' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'docs' ? '#00f2fe' : undefined }}
        >
          <BookOpen size={18} /> Részletes Műszaki Kézikönyv
        </button>
        <button 
          className={`btn-secondary ${activeTab === 'pairing' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('pairing')}
          style={{ background: activeTab === 'pairing' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'pairing' ? '#00f2fe' : undefined }}
        >
          <Link size={18} /> Hardver Párosítás & Aktiválás
        </button>
      </div>

      {/* Overview Stats Cards */}
      <div className="telemetry-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="telemetry-item">
          <div className="telemetry-label"><Users size={16} /> Összes Ügyfél</div>
          <div className="telemetry-value">{stats?.totalUsers || 0} fő</div>
        </div>
        <div className="telemetry-item">
          <div className="telemetry-label"><Cpu size={16} /> Regisztrált Járművek</div>
          <div className="telemetry-value">{stats?.totalVehicles || 0} db</div>
        </div>
        <div className="telemetry-item">
          <div className="telemetry-label"><Radio size={16} style={{ color: '#10b981' }} /> Aktivált / Online Eszközök</div>
          <div className="telemetry-value" style={{ color: '#10b981' }}>{stats?.onlineDevices || 0} online</div>
        </div>
        <div className="telemetry-item">
          <div className="telemetry-label"><Shield size={16} style={{ color: '#00f2fe' }} /> CAN Profilok</div>
          <div className="telemetry-value">{stats?.canProfilesCount || 0} modell</div>
        </div>
      </div>

      {/* TAB 1: DETAILED TECHNICAL DOCUMENTATION */}
      {activeTab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* SECTION 1: ARCHITECTURE */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Zap size={22} style={{ color: '#00f2fe' }} /> 1. Rendszerarchitektúra & Kommunikáció</div>
            </div>
            
            <p style={{ color: '#94a3b8', lineHeight: '1.6' }}>
              A SmartCar Telematics egy <strong>kétcsatornás (Dual-CAN) IoT hardveres rendszer</strong>. A járműben elhelyezett ESP32 modul egyszerre két független CAN busz hálózaton kommunikál, miközben a 4G LTE modemen keresztül MQTTS (MQTT over TLS 1.3) protokollal továbbítja az élő adatokat a szerver felé.
            </p>

            <div style={{ padding: '16px', background: '#060a12', border: '1px solid var(--border-color)', borderRadius: '12px', fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: '#00f2fe', lineHeight: '1.5', overflowX: 'auto' }}>
{`┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SMARTCAR TELEMATICS ARCHITEKTÚRA                                       │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  [ Autó Motor & Diag CAN-C ] ──(500k)──> [ SN65HVD230 Transceiver ] ──(TWAI/GPIO4,5)──┐
                                                                                     │
  [ Autó Komfort SAM CAN-B ]  ──(83.3k)─> [ MCP2515 SPI Modul ]     ──(SPI/GPIO15,18)─┼─> [ ESP32-S3 MCU ]
                                                                                     │       │
  [ 4G LTE & GPS Antennák ]   ──────────> [ A7670E / SIM7600 Modem ] ──(UART/GPIO16,17)┘       │ (TLS 1.3 4G)
                                                                                             ▼
                                                                                   [ Mosquitto Broker ]
                                                                                             │
                                                                                   [ Node.js API / Socket.IO ]
                                                                                             │
                                                                                   [ React PWA WebApp ]`}
            </div>
          </div>

          {/* SECTION 2: BOM COMPONENT LIST */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Cpu size={22} style={{ color: '#10b981' }} /> 2. Teljes Alkatrészjegyzék (BOM Lista & LCSC Cikkszámok)</div>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#94a3b8', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: '#fff' }}>
                  <th style={{ padding: '10px' }}>Alkatrész Megnevezése</th>
                  <th style={{ padding: '10px' }}>Típus / Modell</th>
                  <th style={{ padding: '10px' }}>LCSC Cikkszám</th>
                  <th style={{ padding: '10px' }}>Tokozás</th>
                  <th style={{ padding: '10px' }}>Szerep / Funkció</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px', color: '#fff', fontWeight: '600' }}>Fővezérlő MCU</td>
                  <td style={{ padding: '10px' }}>ESP32-S3-WROOM-1 (16MB Flash)</td>
                  <td style={{ padding: '10px', color: '#00f2fe', fontFamily: 'JetBrains Mono' }}>C2913202</td>
                  <td style={{ padding: '10px' }}>SMD-38</td>
                  <td style={{ padding: '10px' }}>Dual-Core 240MHz főegység, TWAI + SPI + UART</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px', color: '#fff', fontWeight: '600' }}>4G LTE + GPS Modem</td>
                  <td style={{ padding: '10px' }}>SIMCom A7670E-LASE / SIM7600</td>
                  <td style={{ padding: '10px', color: '#00f2fe', fontFamily: 'JetBrains Mono' }}>C2892911</td>
                  <td style={{ padding: '10px' }}>LCC+LGA-122</td>
                  <td style={{ padding: '10px' }}>Európai 4G Cat-1 mobilnet & GNSS GPS modem</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px', color: '#fff', fontWeight: '600' }}>1. CAN Transceiver</td>
                  <td style={{ padding: '10px' }}>SN65HVD230DR (TI)</td>
                  <td style={{ padding: '10px', color: '#00f2fe', fontFamily: 'JetBrains Mono' }}>C12096</td>
                  <td style={{ padding: '10px' }}>SOIC-8</td>
                  <td style={{ padding: '10px' }}>CAN-C Motor/Diagnosztika (500k) 3.3V illesztés</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px', color: '#fff', fontWeight: '600' }}>2. CAN Controller</td>
                  <td style={{ padding: '10px' }}>MCP2515-I/SO (Microchip)</td>
                  <td style={{ padding: '10px', color: '#00f2fe', fontFamily: 'JetBrains Mono' }}>C12480</td>
                  <td style={{ padding: '10px' }}>SOIC-18</td>
                  <td style={{ padding: '10px' }}>CAN-B Komfort (83.3k) SPI busz vezérlő IC</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px', color: '#fff', fontWeight: '600' }}>Autós DC-DC Táp IC</td>
                  <td style={{ padding: '10px' }}>MP2307DN-LF-Z (MPS)</td>
                  <td style={{ padding: '10px', color: '#00f2fe', fontFamily: 'JetBrains Mono' }}>C14258</td>
                  <td style={{ padding: '10px' }}>SOIC-8-EP</td>
                  <td style={{ padding: '10px' }}>12V ➔ 5V 3A nagyhatásfokú táp konverter IC</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', color: '#fff', fontWeight: '600' }}>Védelem & Csatt.</td>
                  <td style={{ padding: '10px' }}>SMAJ15A TVS + Fuse Tap Mini</td>
                  <td style={{ padding: '10px', color: '#00f2fe', fontFamily: 'JetBrains Mono' }}>C81561</td>
                  <td style={{ padding: '10px' }}>DO-214AC</td>
                  <td style={{ padding: '10px' }}>15V autós túlfeszültség védelem + biztosíték leágazó</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 3: WIRING AND PINOUT */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Wrench size={22} style={{ color: '#f59e0b' }} /> 3. Pontos Bekötési Rajzok & Autós SAM Csatlakozás</div>
            </div>

            <div className="dashboard-grid">
              {/* Pinout Table */}
              <div>
                <h4 style={{ color: '#00f2fe', marginBottom: '10px' }}>ESP32-S3 Mikrokontroller Pinout Kiosztás</h4>
                <div style={{ background: '#060a12', padding: '14px', borderRadius: '10px', fontSize: '0.82rem', fontFamily: 'JetBrains Mono', color: '#94a3b8', border: '1px solid var(--border-color)' }}>
                  ESP32 5V (VIN) ──> DC-DC Buck 5V kimenet<br />
                  ESP32 GND      ──> Karosszéria test / OBD PIN 4,5<br />
                  <br />
                  <span style={{ color: '#10b981' }}>// CAN-C Diagnosztika (TWAI 500k)</span><br />
                  ESP32 GPIO 5   ──> SN65HVD230 TX<br />
                  ESP32 GPIO 4   ──> SN65HVD230 RX<br />
                  SN65HVD230 CANH ─> OBD-II PIN 6 (Zöld/Fehér)<br />
                  SN65HVD230 CANL ─> OBD-II PIN 14 (Zöld)<br />
                  <br />
                  <span style={{ color: '#7f53ac' }}>// CAN-B Komfort Hálózat (MCP2515 SPI 83.3k)</span><br />
                  ESP32 GPIO 15  ──> MCP2515 CS (Chip Select)<br />
                  ESP32 GPIO 18  ──> MCP2515 SCK (Órajel)<br />
                  ESP32 GPIO 23  ──> MCP2515 SI (MOSI)<br />
                  ESP32 GPIO 19  ──> MCP2515 SO (MISO)<br />
                  MCP2515 CANH   ──> SAM Barna/Piros sodort érpár<br />
                  MCP2515 CANL   ──> SAM Barna sodort érpár
                </div>
              </div>

              {/* Car Specific SAM Wiring Guide */}
              <div>
                <h4 style={{ color: '#10b981', marginBottom: '10px' }}>Járműspecifikus Csatlakozási Pontok</h4>
                
                <div style={{ marginBottom: '14px' }}>
                  <strong style={{ color: '#fff' }}>1. Mercedes-Benz GL / ML / R (W164 / X164):</strong>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0' }}>
                    A csomagtartó jobb oldalán lévő <strong>REAR SAM kényelmi vezérlőegységnél</strong> a barna csatlakozóban található <strong>Barna (CAN-L)</strong> és <strong>Barna/Piros (CAN-H)</strong> sodort érpárról lehet lekötni az ablakok és zárak vezérlését.
                  </p>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <strong style={{ color: '#fff' }}>2. BMW 5 / 3 Series (E60 / E90 K-CAN):</strong>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0' }}>
                    K-CAN komfort busz csatlakozás a kesztyűtartó mögötti JBE (Junction Box Electronics) csatlakozón: <strong>Sárga/Piros (CAN-H)</strong> és <strong>Sárga/Barna (CAN-L)</strong> (100 kbps).
                  </p>
                </div>

                <div>
                  <strong style={{ color: '#fff' }}>3. VW / Audi / Skoda (MQB Platform):</strong>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0' }}>
                    Komfort CAN busz a Gateway modul 20-pólusú csatlakozóján: <strong>Narancs/Zöld (CAN-H)</strong> és <strong>Narancs/Barna (CAN-L)</strong> (500 kbps).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: STEP-BY-STEP ASSEMBLY */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><CheckCircle size={22} style={{ color: '#10b981' }} /> 4. Lépésről-Lépésre Összeszerelési & Beüzemelési Útmutató</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ background: '#060a12', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ color: '#00f2fe', marginBottom: '8px' }}>1. Hardver Forrasztás & Teszt</h4>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5' }}>
                  Forraszd fel az ESP32-t és a két CAN modult a NYÁK lapra. Csatlakoztass 12V-ot a táp bemenetre, és ellenőrizd multiméterrel, hogy a Buck konverter kimenetén pontosan <strong>5.0V és 3.3V</strong> feszültség mérhető-e.
                </p>
              </div>

              <div style={{ background: '#060a12', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ color: '#10b981', marginBottom: '8px' }}>2. SIM Kártya & APN Beállítás</h4>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5' }}>
                  Helyezd be az aktív IoT M2M Nano-SIM kártyát (PIN kód védelem kikapcsolva!). Állítsd be az APN nevet a firmware-ben:
                  <br />• Telekom: <code style={{ color: '#00f2fe' }}>net</code>
                  <br />• Yettel: <code style={{ color: '#00f2fe' }}>net</code>
                  <br />• Vodafone: <code style={{ color: '#00f2fe' }}>vitamax.internet.vodafone.net</code>
                </p>
              </div>

              <div style={{ background: '#060a12', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>3. Autós Beszerelés & Párosítás</h4>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5' }}>
                  A biztosítéktáblán a Fuse Tap adapterrel kösd be a permanent +12V tápot (BAT+), rögzítsd a testkábelt a karosszériára. Végezd el az Admin Portálon a **Hardver Párosítást** az IMEI szám megadásával.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 5: SOURCE CODES */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><FileCode size={22} style={{ color: '#7f53ac' }} /> 5. Letölthető Firmware Forráskódok</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* ESPHome Code Block */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ color: '#00f2fe' }}>A. ESPHome YAML Konfiguráció (No-Code megközelítés)</h4>
                  <button className="btn-secondary" onClick={() => handleCopy(esphomeCodeExample, 'esphome')}>
                    {copiedCode === 'esphome' ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
                    {copiedCode === 'esphome' ? 'Másolva!' : 'ESPHome Kód Másolása'}
                  </button>
                </div>

                <pre style={{
                  background: '#060a12',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  color: '#00f2fe',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '0.82rem',
                  overflowX: 'auto',
                  maxHeight: '300px'
                }}>
                  {esphomeCodeExample}
                </pre>
              </div>

              {/* C++ PlatformIO Code Block */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ color: '#10b981' }}>B. C++ / PlatformIO Arduino Native Kód (Fejlett egyedi kódolás)</h4>
                  <button className="btn-secondary" onClick={() => handleCopy(cppCodeExample, 'cpp')}>
                    {copiedCode === 'cpp' ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
                    {copiedCode === 'cpp' ? 'Másolva!' : 'C++ Kód Másolása'}
                  </button>
                </div>

                <pre style={{
                  background: '#060a12',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  color: '#10b981',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '0.82rem',
                  overflowX: 'auto',
                  maxHeight: '300px'
                }}>
                  {cppCodeExample}
                </pre>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: DEVICE PAIRING & VEHICLES */}
      {activeTab === 'pairing' && (
        <div className="dashboard-grid">
          
          {/* Device Pairing Form */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Link size={22} /> Hardver Párosítása Járműhöz
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Az ügyfél regisztrációja után a szervizben az Adminisztrátor itt tudja hozzárendelni a fizikai ESP32 modul egyedi azonosítóját (IMEI/MAC) a regisztrált autóhoz.
            </p>

            {formMsg && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: formMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${formMsg.type === 'success' ? '#10b981' : '#ef4444'}`,
                color: '#fff',
                fontSize: '0.9rem'
              }}>
                {formMsg.text}
              </div>
            )}

            <form onSubmit={handlePairDevice} className="auth-form">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Válaszd ki az Ügyfél Járművét:</label>
                <select 
                  value={selectedVin} 
                  onChange={e => setSelectedVin(e.target.value)}
                  style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '0.95rem'
                  }}
                >
                  {vehiclesList.map(v => (
                    <option key={v.vin} value={v.vin} style={{ background: '#0a0e17' }}>
                      {v.name} ({v.plate}) — Tulaj: {v.ownerEmail || 'Ismeretlen'} [{v.status === 'online' ? 'AKTÍV ✅' : 'VÁRAKOZIK ⏳'}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Fizikai ESP32 Eszköz ID / IMEI (pl. 864920051234567)" 
                  value={deviceId} 
                  onChange={e => setDeviceId(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>CAN Busz Modell Profil:</label>
                <select 
                  value={selectedCanProfile} 
                  onChange={e => setSelectedCanProfile(e.target.value)}
                  style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '0.95rem'
                  }}
                >
                  {canProfiles.map(p => (
                    <option key={p.id} value={p.id} style={{ background: '#0a0e17' }}>
                      {p.name} ({p.canB_speed})
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn-primary full-width">
                Hardver Aktiválása & Párosítása
              </button>
            </form>
          </div>

          {/* Registered Vehicles & Devices List */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Cpu size={22} /> Járművek & Párosított Eszközök
              </div>
            </div>

            <div className="dtc-list">
              {vehiclesList.map((v) => (
                <div className="dtc-item" key={v.vin}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#fff' }}>{v.name} ({v.plate})</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>VIN: {v.vin}</div>
                    <div style={{ fontSize: '0.75rem', color: '#00f2fe', marginTop: '2px' }}>
                      Eszköz ID: {v.deviceId} | Tulaj: {v.ownerEmail}
                    </div>
                  </div>
                  <span 
                    className="status-badge" 
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '4px 10px',
                      background: v.status === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: v.status === 'online' ? '#10b981' : '#f59e0b',
                      borderColor: v.status === 'online' ? '#10b981' : '#f59e0b'
                    }}
                  >
                    {v.status === 'online' ? '✅ Aktív / Online' : '⏳ Beszerelésre vár'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
