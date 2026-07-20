import React, { useState, useEffect } from 'react';
import { 
  Shield, Cpu, Users, Radio, PlusCircle, BookOpen, Wrench, FileCode, Zap, 
  CheckCircle, AlertTriangle, RefreshCw, Copy, Check 
} from 'lucide-react';

export default function AdminPortal({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('provisioning'); // 'provisioning' | 'docs' | 'users'
  const [stats, setStats] = useState(null);
  const [canProfiles, setCanProfiles] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // New Device Form State
  const [name, setName] = useState('');
  const [vin, setVin] = useState('');
  const [plate, setPlate] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [selectedCanProfile, setSelectedCanProfile] = useState('');
  const [formMsg, setFormMsg] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [resStats, resProfiles, resUsers] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/can-profiles', { headers }),
        fetch('/api/admin/users', { headers })
      ]);

      const statsData = await resStats.json();
      const profilesData = await resProfiles.json();
      const usersData = await resUsers.json();

      setStats(statsData);
      setCanProfiles(profilesData);
      setUsersList(usersData);
      if (profilesData.length > 0) setSelectedCanProfile(profilesData[0].id);
    } catch (err) {
      console.error('Admin data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    setFormMsg(null);

    try {
      const res = await fetch('/api/admin/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name, vin, plate, deviceId, ownerEmail, canProfileId: selectedCanProfile
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Sikertelen eszköz regisztráció');

      setFormMsg({ type: 'success', text: data.message });
      setName(''); setVin(''); setPlate(''); setDeviceId('');
      fetchAdminData();
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message });
    }
  };

  const esphomeCodeExample = `esphome:
  name: gl-merci-can-gps-gateway

esp32:
  board: esp32-s3-devkitc-1
  framework:
    type: arduino

# UART a GPS / 4G LTE Modulhoz (SIM7600G-H / A7670E)
uart:
  id: gps_uart
  rx_pin: GPIO16
  tx_pin: GPIO17
  baud_rate: 9600

# GPS NMEA Vevő
gps:
  id: my_gps
  uart_id: gps_uart
  latitude:
    name: "GPS Szélességi Kör"
  longitude:
    name: "GPS Hosszúsági Kör"
  speed:
    name: "GPS Sebesség"

# 1. CAN-C (Diagnosztika 500kbps) — ESP32 Beépített TWAI Vezérlővel
canbus:
  - platform: esp32_can
    id: can_c_diag
    tx_pin: GPIO5
    rx_pin: GPIO4
    bit_rate: 500kbps

  # 2. CAN-B (Komfort 83.3kbps) — MCP2515 SPI Modullal
  - platform: mcp2515
    id: can_b_comfort
    cs_pin: GPIO15
    bit_rate: 83.3kbps
    clock: 8MHz
    on_frame:
      - can_id: 0x0008 # Mercedes W164 Nyitás/Zárás status ID
        then:
          - lambda: |-
              ESP_LOGD("CAN_B", "Mercedes Status Frame Received");

# Szerviz gomb: Ablakok felhúzása parancs injektálása a CAN-B buszra
button:
  - platform: template
    name: "Ablakok Felhúzása"
    on_press:
      - canbus.send:
          canbus_id: can_b_comfort
          can_id: 0x01E0 # Mercedes DCM ablak felhúzás komfort parancs frame
          use_extended_id: false
          data: [ 0x02, 0x30, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00 ]`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(esphomeCodeExample);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
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
            <h1>SmartCar Admin Portál</h1>
            <div className="brand-subtitle">Hardver Párosítás, Dokumentáció & Ügyfelek</div>
          </div>
        </div>
        <button className="btn-secondary" onClick={onLogout}>Kijelentkezés</button>
      </header>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button 
          className={`btn-secondary ${activeTab === 'provisioning' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('provisioning')}
          style={{ background: activeTab === 'provisioning' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'provisioning' ? '#00f2fe' : undefined }}
        >
          <PlusCircle size={18} /> Hardver Regisztráció & Ügyfelek
        </button>
        <button 
          className={`btn-secondary ${activeTab === 'docs' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('docs')}
          style={{ background: activeTab === 'docs' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'docs' ? '#00f2fe' : undefined }}
        >
          <BookOpen size={18} /> Teljes Műszaki Dokumentáció
        </button>
      </div>

      {/* Overview Stats Cards */}
      <div className="telemetry-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="telemetry-item">
          <div className="telemetry-label"><Users size={16} /> Összes Ügyfél</div>
          <div className="telemetry-value">{stats?.totalUsers || 0} fő</div>
        </div>
        <div className="telemetry-item">
          <div className="telemetry-label"><Cpu size={16} /> Aktív Autók / Eszközök</div>
          <div className="telemetry-value">{stats?.totalVehicles || 0} db</div>
        </div>
        <div className="telemetry-item">
          <div className="telemetry-label"><Radio size={16} style={{ color: '#10b981' }} /> Online Eszközök</div>
          <div className="telemetry-value" style={{ color: '#10b981' }}>{stats?.onlineDevices || 0} online</div>
        </div>
        <div className="telemetry-item">
          <div className="telemetry-label"><Shield size={16} style={{ color: '#00f2fe' }} /> CAN Profilok</div>
          <div className="telemetry-value">{stats?.canProfilesCount || 0} modell</div>
        </div>
      </div>

      {/* TAB 1: PROVISIONING & USERS */}
      {activeTab === 'provisioning' && (
        <div className="dashboard-grid">
          {/* Device Provisioning Form */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <PlusCircle size={22} /> Új ESP32 Hardver Regisztrálása
              </div>
            </div>

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

            <form onSubmit={handleAddDevice} className="auth-form">
              <div className="input-group">
                <input type="text" placeholder="Jármű Megnevezése (pl. Mercedes GL 320)" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="text" placeholder="Alvázszám (VIN - pl. WDC164822...)" value={vin} onChange={e => setVin(e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="text" placeholder="Rendszám (pl. ABC-123)" value={plate} onChange={e => setPlate(e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="text" placeholder="ESP32 Eszköz ID / IMEI (pl. ESP32_W164_002)" value={deviceId} onChange={e => setDeviceId(e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="email" placeholder="Tulajdonos Email Címe (pl. imre@smartcar.hu)" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>CAN Busz Modell Profil Választása:</label>
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
                Hardver Regisztráció & Párosítás
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Users size={22} /> Regisztrált Ügyfelek Listája
              </div>
            </div>

            <div className="dtc-list">
              {usersList.map((u) => (
                <div className="dtc-item" key={u.id}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#fff' }}>{u.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{u.email}</div>
                  </div>
                  <span className="status-badge" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                    {u.role === 'admin' ? '👑 Admin' : '👤 Ügyfél'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TECHNICAL DOCUMENTATION */}
      {activeTab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Section 1: System Architecture */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Zap size={22} /> 1. Rendszerarchitektúra és Működési Elv</div>
            </div>
            <p style={{ color: '#94a3b8', lineHeight: '1.6' }}>
              Az ESP32 Dual-CAN eszköz két független CAN busz csatornán keresztül csatlakozik a jármű hálózatára. 
              Az <strong>1. csatorna (CAN-C)</strong> 500 kbps sebességgel olvassa a motor- és diagnosztikai adatokat az OBD portról. 
              A <strong>2. csatorna (CAN-B)</strong> 83.3 kbps (vagy típusfüggő) sebességgel csatlakozik a belső kényelmi hálózatra, és kezeli az ablakok, zárak, tető távoli mozgatását.
            </p>

            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', fontFamily: 'JetBrains Mono', fontSize: '0.85rem', color: '#00f2fe' }}>
              [ Autó CAN-C (500k) ] ──> [ SN65HVD230 Transceiver ] ──> [ ESP32 TWAI (GPIO4/5) ] ──┐<br />
              [ Autó CAN-B (83.3k) ] ──> [ MCP2515 SPI Modul ]     ──> [ ESP32 SPI (GPIO15/19) ] ┼─> [ MQTTS / 4G ] ──> [ SmartCar Szerver ]<br />
              [ GPS Vevő Antennák ]  ──> [ SIM7600G-H / A7670E ]   ──> [ ESP32 UART (GPIO16/17) ] ┘
            </div>
          </div>

          {/* Section 2: BOM Bill of Materials */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Cpu size={22} /> 2. Szükséges Alkatrészek (BOM Lista)</div>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#94a3b8', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: '#fff' }}>
                  <th style={{ padding: '10px' }}>Alkatrész</th>
                  <th style={{ padding: '10px' }}>Típus / Modell</th>
                  <th style={{ padding: '10px' }}>Szerep / Bekötés</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px', color: '#fff', fontWeight: '600' }}>Mikrokontroller</td>
                  <td style={{ padding: '10px' }}>ESP32-S3-DevKitC-1 (vagy WROOM-32U)</td>
                  <td style={{ padding: '10px' }}>Fő vezérlőegység, TWAI + SPI + UART felülettel</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px', color: '#fff', fontWeight: '600' }}>1. CAN Csatoló</td>
                  <td style={{ padding: '10px' }}>SN65HVD230 CAN Transceiver (3.3V)</td>
                  <td style={{ padding: '10px' }}>CAN-C (Motor/Diag 500k) illesztése az OBD PIN 6/14-re</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px', color: '#fff', fontWeight: '600' }}>2. CAN Csatoló</td>
                  <td style={{ padding: '10px' }}>MCP2515 SPI + TJA1050 Modul</td>
                  <td style={{ padding: '10px' }}>CAN-B (Komfort 83.3k) illesztése a csomagtéri SAM modulra</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px', color: '#fff', fontWeight: '600' }}>4G LTE + GPS Modul</td>
                  <td style={{ padding: '10px' }}>SIM7600G-H vagy A7670E TTL Modul</td>
                  <td style={{ padding: '10px' }}>MQTTS felhős kommunikáció + NMEA GPS nyomkövetés</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', color: '#fff', fontWeight: '600' }}>Autós Tápellátás</td>
                  <td style={{ padding: '10px' }}>12V ➔ 5V DC-DC Buck konverter + Fuse Tap</td>
                  <td style={{ padding: '10px' }}>Stabilitás 12V-ról biztosítékkal védve</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Wiring & Pinout Tables */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Wrench size={22} /> 3. Bekötési Rajz & Pinout Táblázatok</div>
            </div>

            <div className="dashboard-grid">
              <div>
                <h4 style={{ color: '#00f2fe', marginBottom: '10px' }}>CAN-C (OBD-II Port) Bekötés</h4>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', fontFamily: 'JetBrains Mono' }}>
                  SN65HVD230 VCC ──> ESP32 3.3V<br />
                  SN65HVD230 GND ──> ESP32 GND & OBD PIN 4/5<br />
                  SN65HVD230 TX  ──> ESP32 GPIO 5<br />
                  SN65HVD230 RX  ──> ESP32 GPIO 4<br />
                  SN65HVD230 CANH ──> OBD PIN 6 (Zöld/Fehér)<br />
                  SN65HVD230 CANL ──> OBD PIN 14 (Zöld)
                </div>
              </div>

              <div>
                <h4 style={{ color: '#7f53ac', marginBottom: '10px' }}>CAN-B (Komfort SAM) Bekötés</h4>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', fontFamily: 'JetBrains Mono' }}>
                  MCP2515 VCC  ──> ESP32 5V<br />
                  MCP2515 GND  ──> ESP32 GND<br />
                  MCP2515 CS   ──> ESP32 GPIO 15<br />
                  MCP2515 SO   ──> ESP32 GPIO 19 (MISO)<br />
                  MCP2515 SI   ──> ESP32 GPIO 23 (MOSI)<br />
                  MCP2515 SCK  ──> ESP32 GPIO 18 (CLK)<br />
                  MCP2515 CANH ──> SAM Barna/Piros<br />
                  MCP2515 CANL ──> SAM Barna
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: ESPHome / Programming Code */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><FileCode size={22} /> 4. Programozási Útmutató & ESPHome YAML Kód</div>
              <button className="btn-secondary" onClick={handleCopyCode}>
                {copiedCode ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
                {copiedCode ? 'Másolva!' : 'Kód Másolása'}
              </button>
            </div>

            <pre style={{
              background: '#060a12',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              color: '#00f2fe',
              fontFamily: 'JetBrains Mono',
              fontSize: '0.85rem',
              overflowX: 'auto',
              maxHeight: '350px'
            }}>
              {esphomeCodeExample}
            </pre>
          </div>

        </div>
      )}
    </div>
  );
}
