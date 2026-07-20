import React, { useState, useEffect } from 'react';
import { 
  Shield, Cpu, Users, Radio, PlusCircle, BookOpen, Wrench, FileCode, Zap, 
  CheckCircle, AlertTriangle, RefreshCw, Copy, Check, Link, Car, Info, MapPin, ArrowRight
} from 'lucide-react';

export default function AdminPortal({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('docs'); 
  const [selectedCarGuide, setSelectedCarGuide] = useState('renault_fluence'); 
  
  const [stats, setStats] = useState(null);
  const [canProfiles, setCanProfiles] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [loading, setLoading] = useState(true);

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
            <h1>SmartCar Szerelési & Kapcsolási Kézikönyv</h1>
            <div className="brand-subtitle">Vizuális Kódfüggetlen Bekötési Rajzok</div>
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
          <BookOpen size={18} /> Vizuális Kapcsolási Rajz
        </button>
        <button 
          className={`btn-secondary ${activeTab === 'pairing' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('pairing')}
          style={{ background: activeTab === 'pairing' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'pairing' ? '#00f2fe' : undefined }}
        >
          <Link size={18} /> Hardver Párosítás & Aktiválás
        </button>
      </div>

      {/* TAB 1: VISUAL GRAPHICAL SCHEMATICS (NO ACCIDENTAL TEXT WRAPPING) */}
      {activeTab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* VISUAL HARDWARE CONNECTION BLOCKS */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Zap size={22} style={{ color: '#00f2fe' }} /> 1. Vizuális Modul Összekötési Blokkvázlat</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', margin: '16px 0' }}>
              
              {/* Block 1: Power Supply */}
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: '700', marginBottom: '10px' }}>
                  <Zap size={20} /> 1. Autós Tápellátás
                </div>
                <div style={{ fontSize: '0.85rem', color: '#fff', lineHeight: '1.6' }}>
                  • <strong>+12V BATT+:</strong> Fuse Tap adapter a biztosítéktábláról
                  <br />• <strong>GND:</strong> Karosszéria testcsavar
                  <br />• <strong>DC-DC Konverter:</strong> 12V ➔ 5V (3A kimenet)
                </div>
              </div>

              {/* Block 2: ESP32 MCU */}
              <div style={{ background: 'rgba(0, 242, 254, 0.08)', border: '1px solid #00f2fe', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00f2fe', fontWeight: '700', marginBottom: '10px' }}>
                  <Cpu size={20} /> 2. ESP32-S3 Fővezérlő
                </div>
                <div style={{ fontSize: '0.85rem', color: '#fff', lineHeight: '1.6' }}>
                  • <strong>Táp:</strong> VIN lábra 5V (DC-DC-ből)
                  <br />• <strong>GPIO 4, 5:</strong> CAN-C (Motor/Diag)
                  <br />• <strong>GPIO 15,18,19,23:</strong> CAN-B (Komfort SPI)
                  <br />• <strong>GPIO 16, 17:</strong> 4G Modem (UART)
                </div>
              </div>

              {/* Block 3: 4G GPS Modem */}
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid #f59e0b', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: '700', marginBottom: '10px' }}>
                  <Radio size={20} /> 3. 4G LTE & GPS Modem
                </div>
                <div style={{ fontSize: '0.85rem', color: '#fff', lineHeight: '1.6' }}>
                  • <strong>Modell:</strong> A7670E / SIM7600 (Európai)
                  <br />• <strong>Táp:</strong> 5V kimenet a DC-DC-ből
                  <br />• <strong>Adat:</strong> MQTTS TLS 1.3 titkosítás
                  <br />• <strong>GPS Antenna:</strong> Kerámia antenna
                </div>
              </div>

            </div>
          </div>

          {/* CAR SELECTOR BUTTONS */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '700', marginBottom: '12px' }}>
              Válaszd ki a szerelendő Autótípust a kapcsolási rajz megtekintéséhez:
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                className={`btn-secondary ${selectedCarGuide === 'renault_fluence' ? 'active-tab' : ''}`}
                onClick={() => setSelectedCarGuide('renault_fluence')}
                style={{ background: selectedCarGuide === 'renault_fluence' ? '#00f2fe' : undefined, color: selectedCarGuide === 'renault_fluence' ? '#000' : undefined, fontWeight: '700' }}
              >
                <Car size={16} /> Renault Fluence / Mégane III
              </button>
              <button 
                className={`btn-secondary ${selectedCarGuide === 'mercedes_w164' ? 'active-tab' : ''}`}
                onClick={() => setSelectedCarGuide('mercedes_w164')}
                style={{ background: selectedCarGuide === 'mercedes_w164' ? '#00f2fe' : undefined, color: selectedCarGuide === 'mercedes_w164' ? '#000' : undefined, fontWeight: '700' }}
              >
                <Car size={16} /> Mercedes-Benz GL / ML (W164)
              </button>
              <button 
                className={`btn-secondary ${selectedCarGuide === 'bmw_e60' ? 'active-tab' : ''}`}
                onClick={() => setSelectedCarGuide('bmw_e60')}
                style={{ background: selectedCarGuide === 'bmw_e60' ? '#00f2fe' : undefined, color: selectedCarGuide === 'bmw_e60' ? '#000' : undefined, fontWeight: '700' }}
              >
                <Car size={16} /> BMW 5 / 3 Series (E60 / E90)
              </button>
              <button 
                className={`btn-secondary ${selectedCarGuide === 'vw_mqb' ? 'active-tab' : ''}`}
                onClick={() => setSelectedCarGuide('vw_mqb')}
                style={{ background: selectedCarGuide === 'vw_mqb' ? '#00f2fe' : undefined, color: selectedCarGuide === 'vw_mqb' ? '#000' : undefined, fontWeight: '700' }}
              >
                <Car size={16} /> VW / Audi / Skoda (MQB)
              </button>
              <button 
                className={`btn-secondary ${selectedCarGuide === 'ford_focus3' ? 'active-tab' : ''}`}
                onClick={() => setSelectedCarGuide('ford_focus3')}
                style={{ background: selectedCarGuide === 'ford_focus3' ? '#00f2fe' : undefined, color: selectedCarGuide === 'ford_focus3' ? '#000' : undefined, fontWeight: '700' }}
              >
                <Car size={16} /> Ford Focus MK3 / Mondeo MK4
              </button>
            </div>
          </div>

          {/* RENAULT FLUENCE PINOUT VISUAL CARDS */}
          {selectedCarGuide === 'renault_fluence' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Car size={24} style={{ color: '#00f2fe' }} /> Renault Fluence & Mégane III Kábelezési Kapcsolás</div>
                <span className="status-badge" style={{ background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', borderColor: '#00f2fe' }}>CAN-C: 500k | CAN-Body: 250k</span>
              </div>

              {/* Pin Connections Visual Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
                
                {/* Connection 1: CAN-C */}
                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#10b981', fontWeight: '700', fontSize: '0.9rem' }}>🟢 1. CAN-C Motor & Diagnosztika (500 kbps)</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' }}>
                      ESP32 <strong>GPIO 5 (TX) & GPIO 4 (RX)</strong> ➔ SN65HVD230 CAN Modul
                    </div>
                  </div>
                  <ArrowRight style={{ color: '#10b981', margin: '0 16px' }} />
                  <div style={{ flex: 1, background: '#060a12', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: '#fff', fontWeight: '600', fontSize: '0.85rem' }}>Autó: OBD-II Csatlakozó (Kormány alatt balra)</div>
                    <div style={{ color: '#10b981', fontSize: '0.82rem', marginTop: '2px' }}>
                      • CAN High ➔ <strong>OBD PIN 6</strong> (Fehér kábel)
                      <br />• CAN Low ➔ <strong>OBD PIN 14</strong> (Rózsaszín / Kék kábel)
                    </div>
                  </div>
                </div>

                {/* Connection 2: CAN-Body */}
                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', background: 'rgba(127, 83, 172, 0.06)', border: '1px solid rgba(127, 83, 172, 0.3)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#7f53ac', fontWeight: '700', fontSize: '0.9rem' }}>🟣 2. CAN-Body Komfort Zár & Ablak (250 kbps)</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' }}>
                      ESP32 <strong>GPIO 15,18,19,23 (SPI)</strong> ➔ MCP2515 CAN Modul
                    </div>
                  </div>
                  <ArrowRight style={{ color: '#7f53ac', margin: '0 16px' }} />
                  <div style={{ flex: 1, background: '#060a12', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: '#fff', fontWeight: '600', fontSize: '0.85rem' }}>Autó: UCH Vezérlő Modul (Biztosítéktábla mögött)</div>
                    <div style={{ color: '#7f53ac', fontSize: '0.82rem', marginTop: '2px' }}>
                      • CAN High ➔ UCH 40-pin <strong>PIN 12</strong> (Barna/Fehér kábel)
                      <br />• CAN Low ➔ UCH 40-pin <strong>PIN 13</strong> (Barna/Zöld kábel)
                    </div>
                  </div>
                </div>

                {/* Connection 3: Power */}
                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#ef4444', fontWeight: '700', fontSize: '0.9rem' }}>🔴 3. Tápellátás & Test</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' }}>
                      DC-DC Buck Konverter IN+ & IN-
                    </div>
                  </div>
                  <ArrowRight style={{ color: '#ef4444', margin: '0 16px' }} />
                  <div style={{ flex: 1, background: '#060a12', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: '#fff', fontWeight: '600', fontSize: '0.85rem' }}>Autó: Biztosítéktábla & Testcsavar</div>
                    <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '2px' }}>
                      • +12V BATT+ ➔ 15A Cigarettagyújtó biztosíték (Fuse Tap)
                      <br />• GND ➔ Műszerfal alatti fémváz testcsavar
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* MERCEDES W164 PINOUT VISUAL CARDS */}
          {selectedCarGuide === 'mercedes_w164' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Car size={24} style={{ color: '#10b981' }} /> Mercedes-Benz GL / ML (W164) Kábelezési Kapcsolás</div>
                <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: '#10b981' }}>CAN-C: 500k | CAN-B: 83.3k</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#10b981', fontWeight: '700' }}>🟢 1. CAN-C Motor & Diag (500k)</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>ESP32 GPIO 4, 5 ➔ SN65HVD230 Modul</div>
                  </div>
                  <ArrowRight style={{ color: '#10b981', margin: '0 16px' }} />
                  <div style={{ flex: 1, background: '#060a12', padding: '10px 14px', borderRadius: '8px' }}>
                    <div style={{ color: '#fff', fontSize: '0.85rem' }}>Autó: OBD-II Csatlakozó</div>
                    <div style={{ color: '#10b981', fontSize: '0.82rem' }}>• PIN 6 (Zöld/Fehér) & PIN 14 (Zöld)</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', background: 'rgba(127, 83, 172, 0.06)', border: '1px solid rgba(127, 83, 172, 0.3)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#7f53ac', fontWeight: '700' }}>🟣 2. CAN-B Komfort (83.3k)</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>ESP32 SPI ➔ MCP2515 Modul</div>
                  </div>
                  <ArrowRight style={{ color: '#7f53ac', margin: '0 16px' }} />
                  <div style={{ flex: 1, background: '#060a12', padding: '10px 14px', borderRadius: '8px' }}>
                    <div style={{ color: '#fff', fontSize: '0.85rem' }}>Autó: REAR SAM Modul (Csomagtér jobb oldal)</div>
                    <div style={{ color: '#7f53ac', fontSize: '0.82rem' }}>• CAN High ➔ Barna / Piros érpár<br />• CAN Low ➔ Barna érpár</div>
                  </div>
                </div>
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
              <div className="card-title"><Link size={22} /> Hardver Párosítása Járműhöz</div>
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
              <div className="card-title"><Cpu size={22} /> Járművek & Párosított Eszközök</div>
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
