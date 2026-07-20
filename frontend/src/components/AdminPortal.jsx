import React, { useState, useEffect } from 'react';
import { 
  Shield, Cpu, Users, Radio, PlusCircle, BookOpen, Wrench, FileCode, Zap, 
  CheckCircle, AlertTriangle, RefreshCw, Copy, Check, Link, Car, Info
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
            <h1>SmartCar Telematics Szerelési Kézikönyv</h1>
            <div className="brand-subtitle">Egyértelmű, Lépésről-Lépésre Bekötési Útmutatók</div>
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
          <BookOpen size={18} /> Szerelési & Bekötési Útmutató
        </button>
        <button 
          className={`btn-secondary ${activeTab === 'pairing' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('pairing')}
          style={{ background: activeTab === 'pairing' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'pairing' ? '#00f2fe' : undefined }}
        >
          <Link size={18} /> Hardver Párosítás & Aktiválás
        </button>
      </div>

      {/* TAB 1: VISUAL EASY WIRING GUIDES */}
      {activeTab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Car Model Selector Buttons */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>
              Válaszd ki a szerelendő Autótípust:
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

          {/* RENAULT FLUENCE DETAILED VISUAL GUIDE */}
          {selectedCarGuide === 'renault_fluence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <Car size={24} style={{ color: '#00f2fe' }} /> Renault Fluence & Mégane III (2009–2016) Szerelési Rajz
                  </div>
                  <span className="status-badge" style={{ background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', borderColor: '#00f2fe' }}>
                    CAN-C: 500 kbps | CAN-Body: 250 kbps
                  </span>
                </div>

                <div style={{ padding: '16px', background: 'rgba(0, 242, 254, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 242, 254, 0.2)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00f2fe', fontWeight: '600', marginBottom: '4px' }}>
                    <Info size={18} /> Összefoglalás autóvillamossági szerelőknek:
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0 }}>
                    Az ESP32 modult a műszerfal alatt balra, a biztosítéktábla mellett helyezzük el. A 12V tápfeszültséget a biztosítéktábláról vesszük Fuse Tap adapterrel, a motor adatokat az OBD portról, az ablakok/zárak vezérlését pedig a mögötte lévő UCH modulról.
                  </p>
                </div>

                {/* Clear Wire Mapping Table */}
                <h4 style={{ color: '#fff', marginBottom: '12px' }}>📊 Kábel-és Csatlakozó Mátrix (Hova mit kell kötni?):</h4>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', color: '#fff' }}>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Jelzés / Funkció</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>ESP32 / Modul Láb</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Autó Oldali Csatlakozó Pont</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Vezeték Színe az Autóban</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px', color: '#ef4444', fontWeight: '700' }}>🔴 +12V Állandó Táp</td>
                      <td style={{ padding: '12px' }}>DC-DC Konverter IN+</td>
                      <td style={{ padding: '12px' }}>Utastéri biztosítéktábla (Fuse Tap)</td>
                      <td style={{ padding: '12px', color: '#ef4444', fontWeight: '600' }}>Piros / Sárga 15A biztosíték</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px', color: '#94a3b8', fontWeight: '700' }}>⚫ Karosszéria Test</td>
                      <td style={{ padding: '12px' }}>DC-DC Konverter IN- & ESP32 GND</td>
                      <td style={{ padding: '12px' }}>Műszerfal alatti fém vázcsavar / OBD PIN 4,5</td>
                      <td style={{ padding: '12px', color: '#94a3b8', fontWeight: '600' }}>Fekete / Testcsavar</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px', color: '#10b981', fontWeight: '700' }}>🟢 CAN-C High (Motor/Diag)</td>
                      <td style={{ padding: '12px' }}>SN65HVD230 CANH (GPIO 5 TX)</td>
                      <td style={{ padding: '12px' }}>16-pólusú OBD-II csatlakozó <strong>PIN 6</strong></td>
                      <td style={{ padding: '12px', color: '#10b981', fontWeight: '600' }}>Fehér sodort érpár</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px', color: '#10b981', fontWeight: '700' }}>🟢 CAN-C Low (Motor/Diag)</td>
                      <td style={{ padding: '12px' }}>SN65HVD230 CANL (GPIO 4 RX)</td>
                      <td style={{ padding: '12px' }}>16-pólusú OBD-II csatlakozó <strong>PIN 14</strong></td>
                      <td style={{ padding: '12px', color: '#10b981', fontWeight: '600' }}>Rózsaszín vagy Kék érpár</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px', color: '#7f53ac', fontWeight: '700' }}>🟣 CAN-Body High (Zárak/Ablak)</td>
                      <td style={{ padding: '12px' }}>MCP2515 CANH (GPIO 15 CS SPI)</td>
                      <td style={{ padding: '12px' }}>UCH Komfort Modul (kormány alatt balra)</td>
                      <td style={{ padding: '12px', color: '#7f53ac', fontWeight: '600' }}>Barna / Fehér sodort érpár</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px', color: '#7f53ac', fontWeight: '700' }}>🟣 CAN-Body Low (Zárak/Ablak)</td>
                      <td style={{ padding: '12px' }}>MCP2515 CANL</td>
                      <td style={{ padding: '12px' }}>UCH Komfort Modul 40-pin csatlakozó</td>
                      <td style={{ padding: '12px', color: '#7f53ac', fontWeight: '600' }}>Barna / Zöld sodort érpár</td>
                    </tr>
                  </tbody>
                </table>

                {/* Step-by-Step Installation Cards */}
                <h4 style={{ color: '#fff', margin: '20px 0 12px' }}>🛠️ Szerelési Lépések az Autóban:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ background: '#060a12', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: '#00f2fe', fontWeight: '700', marginBottom: '6px' }}>1. Műszerfal Bontás</div>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
                      Pattintsd le a műszerfal bal alsó kis tárolórekeszét (a kormány és az ajtó között). Ekkor meglátod a biztosítéktáblát, a fekete OBD csatlakozót és mögötte az UCH modult.
                    </p>
                  </div>
                  <div style={{ background: '#060a12', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: '#10b981', fontWeight: '700', marginBottom: '6px' }}>2. Kábelek Rákötése</div>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
                      Ráforrasztással vagy sorkapoccsal kösd a zöld CAN modul vezetékeit az OBD 6-os és 14-es lábára. A lila CAN modul vezetékeit kösd az UCH modul Barna/Fehér és Barna/Zöld sodort érpárjára.
                    </p>
                  </div>
                  <div style={{ background: '#060a12', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: '#f59e0b', fontWeight: '700', marginBottom: '6px' }}>3. Táp & Rögzítés</div>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
                      Dugd be a Fuse Tap adaptert a cigarettagyújtó 15A-es biztosítékának helyére. Rögzítsd az ESP32 műanyag dobozát kötegelővel a műszerfal alatti fém vázszerkezethez.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* MERCEDES W164 DETAILED VISUAL GUIDE */}
          {selectedCarGuide === 'mercedes_w164' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Car size={24} style={{ color: '#10b981' }} /> Mercedes-Benz GL / ML (W164 / X164) Szerelési Rajz
                </div>
                <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: '#10b981' }}>
                  CAN-C: 500 kbps | CAN-B: 83.3 kbps
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', margin: '16px 0' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', color: '#fff' }}>
                    <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Jelzés</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>ESP32 Láb</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Autó Oldali Csatlakozási Pont</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Mercedes Kábel Színek</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', color: '#ef4444', fontWeight: '700' }}>🔴 +12V Állandó Táp</td>
                    <td style={{ padding: '12px' }}>DC-DC IN+</td>
                    <td style={{ padding: '12px' }}>REAR SAM Biztosítéktábla (Csomagtér jobb oldal)</td>
                    <td style={{ padding: '12px', color: '#ef4444' }}>Piros 15A Biztosíték Helye</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', color: '#10b981', fontWeight: '700' }}>🟢 CAN-C High (Motor)</td>
                    <td style={{ padding: '12px' }}>SN65HVD230 CANH</td>
                    <td style={{ padding: '12px' }}>OBD-II PIN 6</td>
                    <td style={{ padding: '12px', color: '#10b981' }}>Zöld / Fehér érpár</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', color: '#10b981', fontWeight: '700' }}>🟢 CAN-C Low (Motor)</td>
                    <td style={{ padding: '12px' }}>SN65HVD230 CANL</td>
                    <td style={{ padding: '12px' }}>OBD-II PIN 14</td>
                    <td style={{ padding: '12px', color: '#10b981' }}>Zöld érpár</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', color: '#7f53ac', fontWeight: '700' }}>🟣 CAN-B High (Komfort)</td>
                    <td style={{ padding: '12px' }}>MCP2515 CANH</td>
                    <td style={{ padding: '12px' }}>REAR SAM Barna Csatlakozó</td>
                    <td style={{ padding: '12px', color: '#7f53ac' }}>Barna / Piros sodort érpár</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', color: '#7f53ac', fontWeight: '700' }}>🟣 CAN-B Low (Komfort)</td>
                    <td style={{ padding: '12px' }}>MCP2515 CANL</td>
                    <td style={{ padding: '12px' }}>REAR SAM Barna Csatlakozó</td>
                    <td style={{ padding: '12px', color: '#7f53ac' }}>Barna sodort érpár</td>
                  </tr>
                </tbody>
              </table>
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
