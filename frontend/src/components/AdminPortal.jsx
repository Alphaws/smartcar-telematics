import React, { useState, useEffect } from 'react';
import { 
  Shield, Cpu, Users, Radio, PlusCircle, BookOpen, Wrench, FileCode, Zap, 
  CheckCircle, AlertTriangle, RefreshCw, Copy, Check, Link 
} from 'lucide-react';

export default function AdminPortal({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('pairing'); // 'pairing' | 'docs' | 'users'
  const [stats, setStats] = useState(null);
  const [canProfiles, setCanProfiles] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

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
            <div className="brand-subtitle">Hardver Párosítás & Aktiválás</div>
          </div>
        </div>
        <button className="btn-secondary" onClick={onLogout}>Kijelentkezés</button>
      </header>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button 
          className={`btn-secondary ${activeTab === 'pairing' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('pairing')}
          style={{ background: activeTab === 'pairing' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'pairing' ? '#00f2fe' : undefined }}
        >
          <Link size={18} /> Hardver Párosítás & Aktiválás
        </button>
        <button 
          className={`btn-secondary ${activeTab === 'docs' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('docs')}
          style={{ background: activeTab === 'docs' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'docs' ? '#00f2fe' : undefined }}
        >
          <BookOpen size={18} /> Műszaki Dokumentáció
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

      {/* TAB 1: DEVICE PAIRING & VEHICLES */}
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

      {/* TAB 2: TECHNICAL DOCUMENTATION */}
      {activeTab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Zap size={22} /> 1. Rendszerarchitektúra és Működési Elv</div>
            </div>
            <p style={{ color: '#94a3b8', lineHeight: '1.6' }}>
              Az ESP32 Dual-CAN eszköz két független CAN busz csatornán keresztül csatlakozik a jármű hálózatára. 
              Az <strong>1. csatorna (CAN-C)</strong> 500 kbps sebességgel olvassa a motor- és diagnosztikai adatokat az OBD portról. 
              A <strong>2. csatorna (CAN-B)</strong> 83.3 kbps (vagy típusfüggő) sebességgel csatlakozik a belső kényelmi hálózatra, és kezeli az ablakok, zárak, tető távoli mozgatását.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
