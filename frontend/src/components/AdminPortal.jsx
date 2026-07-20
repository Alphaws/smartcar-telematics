import React, { useState, useEffect } from 'react';
import { 
  Shield, Cpu, Users, Radio, PlusCircle, BookOpen, Wrench, FileCode, Zap, 
  CheckCircle, AlertTriangle, RefreshCw, Copy, Check, Link, Car
} from 'lucide-react';

export default function AdminPortal({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('docs'); 
  const [selectedCarGuide, setSelectedCarGuide] = useState('renault_fluence'); // 'renault_fluence' | 'mercedes_w164' | 'bmw_e60' | 'vw_mqb' | 'ford_focus3'
  
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

esp32:
  board: esp32-s3-devkitc-1

uart:
  - id: modem_uart
    tx_pin: GPIO17
    rx_pin: GPIO16
    baud_rate: 115200

gps:
  id: gps_tracker
  uart_id: modem_uart

canbus:
  - platform: esp32_can
    id: can_c_powertrain
    tx_pin: GPIO5
    rx_pin: GPIO4
    bit_rate: 500kbps

  - platform: mcp2515
    id: can_b_comfort
    cs_pin: GPIO15
    bit_rate: 83.3kbps # Modellfüggő: Renault: 250k, Mercedes: 83.3k, BMW: 100k
    clock: 8MHz`;

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
            <div className="brand-subtitle">Minden Autótípus Bekötési Rajza & CAN Busz Specifikációja</div>
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
          <BookOpen size={18} /> Járműspecifikus Bekötési Rajzok
        </button>
        <button 
          className={`btn-secondary ${activeTab === 'pairing' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('pairing')}
          style={{ background: activeTab === 'pairing' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'pairing' ? '#00f2fe' : undefined }}
        >
          <Link size={18} /> Hardver Párosítás & Aktiválás
        </button>
      </div>

      {/* TAB 1: DETAILED TECHNICAL DOCUMENTATION BY VEHICLE MODEL */}
      {activeTab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Car Model Selector Subnav */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '12px' }}>Válaszd ki a szerelendő Autótípust a kapcsolási rajz megtekintéséhez:</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                className={`btn-secondary ${selectedCarGuide === 'renault_fluence' ? 'active-tab' : ''}`}
                onClick={() => setSelectedCarGuide('renault_fluence')}
                style={{ background: selectedCarGuide === 'renault_fluence' ? '#00f2fe' : undefined, color: selectedCarGuide === 'renault_fluence' ? '#000' : undefined, fontWeight: '600' }}
              >
                <Car size={16} /> Renault Fluence / Mégane III
              </button>
              <button 
                className={`btn-secondary ${selectedCarGuide === 'mercedes_w164' ? 'active-tab' : ''}`}
                onClick={() => setSelectedCarGuide('mercedes_w164')}
                style={{ background: selectedCarGuide === 'mercedes_w164' ? '#00f2fe' : undefined, color: selectedCarGuide === 'mercedes_w164' ? '#000' : undefined, fontWeight: '600' }}
              >
                <Car size={16} /> Mercedes-Benz GL / ML (W164)
              </button>
              <button 
                className={`btn-secondary ${selectedCarGuide === 'bmw_e60' ? 'active-tab' : ''}`}
                onClick={() => setSelectedCarGuide('bmw_e60')}
                style={{ background: selectedCarGuide === 'bmw_e60' ? '#00f2fe' : undefined, color: selectedCarGuide === 'bmw_e60' ? '#000' : undefined, fontWeight: '600' }}
              >
                <Car size={16} /> BMW 5 / 3 Series (E60 / E90)
              </button>
              <button 
                className={`btn-secondary ${selectedCarGuide === 'vw_mqb' ? 'active-tab' : ''}`}
                onClick={() => setSelectedCarGuide('vw_mqb')}
                style={{ background: selectedCarGuide === 'vw_mqb' ? '#00f2fe' : undefined, color: selectedCarGuide === 'vw_mqb' ? '#000' : undefined, fontWeight: '600' }}
              >
                <Car size={16} /> VW / Audi / Skoda (MQB)
              </button>
              <button 
                className={`btn-secondary ${selectedCarGuide === 'ford_focus3' ? 'active-tab' : ''}`}
                onClick={() => setSelectedCarGuide('ford_focus3')}
                style={{ background: selectedCarGuide === 'ford_focus3' ? '#00f2fe' : undefined, color: selectedCarGuide === 'ford_focus3' ? '#000' : undefined, fontWeight: '600' }}
              >
                <Car size={16} /> Ford Focus MK3 / Mondeo MK4
              </button>
            </div>
          </div>

          {/* 1. RENAULT FLUENCE GUIDE */}
          {selectedCarGuide === 'renault_fluence' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Car size={22} style={{ color: '#00f2fe' }} /> Renault Fluence & Mégane III (2009–2016) Bekötési Útmutató</div>
                <span className="status-badge">CAN-C: 500k | CAN-Body: 250k</span>
              </div>

              <div style={{ background: '#060a12', padding: '16px', borderRadius: '12px', fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: '#00f2fe', lineHeight: '1.5', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
{`[ ESP32-S3 ]                                                  [ RENAULT FLUENCE ]
  VIN (5V)  <─────────────── (5V DC-DC Buck) <─────────────── (+12V BATT+ Biztosítéktábla)
  GND       <─────────────── (GND Testpont)  <─────────────── (Karosszéria Test)

  // 1. CAN-C (Motor/Diag 500k)
  GPIO 5 (TX) ──> SN65HVD230 TX
  GPIO 4 (RX) ──> SN65HVD230 RX
  SN65HVD230 CANH ──────────────────────────────────────────> OBD-II PIN 6 (Fehér kábel)
  SN65HVD230 CANL ──────────────────────────────────────────> OBD-II PIN 14 (Rózsaszín/Kék)

  // 2. CAN-Body (Komfort UCH 250k)
  GPIO 15 (CS) ──> MCP2515 CS
  GPIO 18/23/19 ──> MCP2515 SPI (SCK/SI/SO)
  MCP2515 CANH ─────────────────────────────────────────────> UCH Modul PIN 12 (Barna/Fehér)
  MCP2515 CANL ─────────────────────────────────────────────> UCH Modul PIN 13 (Barna/Zöld)`}
              </div>

              <div style={{ marginTop: '16px', color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.6' }}>
                <h4 style={{ color: '#fff', marginBottom: '6px' }}>📍 Fizikai Elhelyezkedés az Autóban:</h4>
                <ul style={{ paddingLeft: '20px' }}>
                  <li><strong>OBD-II Csatlakozó:</strong> A műszerfal bal alsó részén a kormány alatt lévő tárolórekesz mögött.</li>
                  <li><strong>UCH Komfort Vezérlőegység:</strong> A kormány alatt balra, az utastéri biztosítéktábla mögött. A 40-pólusú csatlakozóban található a Barna/Fehér (CAN-H) és Barna/Zöld (CAN-L) sodort érpár.</li>
                  <li><strong>Vezérelhető akciók:</strong> Központi zár nyitás/zárás, komfort ablakemelés & tető felhúzás (0x05E0 frame), csomagtér nyitás.</li>
                </ul>
              </div>
            </div>
          )}

          {/* 2. MERCEDES-BENZ W164 GUIDE */}
          {selectedCarGuide === 'mercedes_w164' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Car size={22} style={{ color: '#10b981' }} /> Mercedes-Benz GL / ML / R (W164 / X164) Bekötési Útmutató</div>
                <span className="status-badge">CAN-C: 500k | CAN-B: 83.3k</span>
              </div>

              <div style={{ background: '#060a12', padding: '16px', borderRadius: '12px', fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: '#10b981', lineHeight: '1.5', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
{`[ ESP32-S3 ]                                                  [ MERCEDES W164 ]
  VIN (5V)  <─────────────── (5V DC-DC Buck) <─────────────── (+12V BATT+ REAR SAM Biztosíték)
  GND       <─────────────── (GND Testpont)  <─────────────── (Karosszéria Test)

  // 1. CAN-C (Motor/Diag 500k)
  SN65HVD230 CANH ──────────────────────────────────────────> OBD-II PIN 6 (Zöld/Fehér)
  SN65HVD230 CANL ──────────────────────────────────────────> OBD-II PIN 14 (Zöld)

  // 2. CAN-B (Komfort REAR SAM 83.3k)
  MCP2515 CANH ─────────────────────────────────────────────> REAR SAM Barna/Piros érpár
  MCP2515 CANL ─────────────────────────────────────────────> REAR SAM Barna érpár`}
              </div>

              <div style={{ marginTop: '16px', color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.6' }}>
                <h4 style={{ color: '#fff', marginBottom: '6px' }}>📍 Fizikai Elhelyezkedés az Autóban:</h4>
                <ul style={{ paddingLeft: '20px' }}>
                  <li><strong>REAR SAM Modul:</strong> A csomagtartó jobb oldali burkolata mögött lévő fő biztosíték- és relétábla.</li>
                  <li><strong>Kábel színek:</strong> A gyári Mercedes CAN-B busz hálózaton a <strong>Barna (CAN-L)</strong> és a <strong>Barna/Piros (CAN-H)</strong> sodort érpár viszi az ablakok, zárak és napfénytető parancsait.</li>
                  <li><strong>Vezérelhető akciók:</strong> Távkapcsolós ablak- és tetőfelhúzás (0x01E0 frame), központi zár kinyitás/bezárás (0x01A0 frame), akku feszültség & üzemanyag telemetria.</li>
                </ul>
              </div>
            </div>
          )}

          {/* 3. BMW E60 GUIDE */}
          {selectedCarGuide === 'bmw_e60' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Car size={22} style={{ color: '#f59e0b' }} /> BMW 5 Series / 3 Series (E60 / E90 K-CAN) Bekötési Útmutató</div>
                <span className="status-badge">PT-CAN: 500k | K-CAN: 100k</span>
              </div>

              <div style={{ background: '#060a12', padding: '16px', borderRadius: '12px', fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: '#f59e0b', lineHeight: '1.5', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
{`[ ESP32-S3 ]                                                  [ BMW E60 / E90 ]
  // 1. PT-CAN (Powertrain 500k)
  SN65HVD230 CANH ──────────────────────────────────────────> OBD-II PIN 6 (Kék/Piros)
  SN65HVD230 CANL ──────────────────────────────────────────> OBD-II PIN 14 (Kék/Barna)

  // 2. K-CAN (Body/Komfort 100k)
  MCP2515 CANH ─────────────────────────────────────────────> JBE Modul Sárga/Piros érpár
  MCP2515 CANL ─────────────────────────────────────────────> JBE Modul Sárga/Barna érpár`}
              </div>

              <div style={{ marginTop: '16px', color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.6' }}>
                <h4 style={{ color: '#fff', marginBottom: '6px' }}>📍 Fizikai Elhelyezkedés az Autóban:</h4>
                <ul style={{ paddingLeft: '20px' }}>
                  <li><strong>JBE (Junction Box Electronics):</strong> A kesztyűtartó mögötti fő kapcsolótáblán található.</li>
                  <li><strong>K-CAN Kábel színek:</strong> <strong>Sárga/Piros (K-CAN High)</strong> és <strong>Sárga/Barna (K-CAN Low)</strong>.</li>
                  <li><strong>Vezérelhető akciók:</strong> Komfortzárás (ablakok + napfénytető felhúzása 0x2D0 frame), központi zár kinyitása/bezárása, csomagtér nyitás.</li>
                </ul>
              </div>
            </div>
          )}

          {/* 4. VW MQB GUIDE */}
          {selectedCarGuide === 'vw_mqb' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Car size={22} style={{ color: '#7f53ac' }} /> VW / Audi / Skoda / Seat (MQB & PQ35 Platform)</div>
                <span className="status-badge">Drive CAN: 500k | Comfort CAN: 500k</span>
              </div>

              <div style={{ background: '#060a12', padding: '16px', borderRadius: '12px', fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: '#7f53ac', lineHeight: '1.5', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
{`[ ESP32-S3 ]                                                  [ VOLKSWAGEN / AUDI ]
  // 1. CAN-Drive (500k)
  SN65HVD230 CANH ──────────────────────────────────────────> OBD-II PIN 6 (Narancs/Fekete)
  SN65HVD230 CANL ──────────────────────────────────────────> OBD-II PIN 14 (Narancs/Barna)

  // 2. CAN-Comfort (500k)
  MCP2515 CANH ─────────────────────────────────────────────> Gateway Modul Narancs/Zöld érpár
  MCP2515 CANL ─────────────────────────────────────────────> Gateway Modul Narancs/Barna érpár`}
              </div>
            </div>
          )}

          {/* 5. FORD FOCUS GUIDE */}
          {selectedCarGuide === 'ford_focus3' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Car size={22} style={{ color: '#ef4444' }} /> Ford Focus MK3 / Mondeo MK4 / Kuga (MS-CAN & HS-CAN)</div>
                <span className="status-badge">HS-CAN: 500k | MS-CAN: 125k</span>
              </div>

              <div style={{ background: '#060a12', padding: '16px', borderRadius: '12px', fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: '#ef4444', lineHeight: '1.5', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
{`[ ESP32-S3 ]                                                  [ FORD FOCUS MK3 ]
  // 1. HS-CAN (High-Speed 500k)
  SN65HVD230 CANH ──────────────────────────────────────────> OBD-II PIN 6 (Fehér/Kék)
  SN65HVD230 CANL ──────────────────────────────────────────> OBD-II PIN 14 (Fehér)

  // 2. MS-CAN (Medium-Speed 125k)
  MCP2515 CANH ─────────────────────────────────────────────> OBD-II PIN 3 (Szürke/Narancs)
  MCP2515 CANL ─────────────────────────────────────────────> OBD-II PIN 11 (Ibolya/Narancs)`}
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: DEVICE PAIRING & VEHICLES */}
      {activeTab === 'pairing' && (
        <div className="dashboard-grid">
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Link size={22} /> Hardver Párosítása Járműhöz
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
