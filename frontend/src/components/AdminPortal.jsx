import React, { useState, useEffect } from 'react';
import { 
  Shield, Cpu, Users, Radio, PlusCircle, BookOpen, Wrench, FileCode, Zap, 
  CheckCircle, AlertTriangle, RefreshCw, Copy, Check, Link, Car, Info, MapPin
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
            <h1>SmartCar Telematics Master Handbook</h1>
            <div className="brand-subtitle">Hardver Összekötési Rajz & Autó Kábel Helyszín Leírások</div>
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
          <BookOpen size={18} /> Részletes Összekötési & Kábel Útmutató
        </button>
        <button 
          className={`btn-secondary ${activeTab === 'pairing' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('pairing')}
          style={{ background: activeTab === 'pairing' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'pairing' ? '#00f2fe' : undefined }}
        >
          <Link size={18} /> Hardver Párosítás & Aktiválás
        </button>
      </div>

      {/* TAB 1: HARDWARE INTERCONNECTION & CAR WIRING LOCATIONS */}
      {activeTab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SECTION A: MASTER HARDWARE INTERCONNECTION SCHEMATIC */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Zap size={22} style={{ color: '#00f2fe' }} /> 1. Az Alkatrészek Teljes Hardveres Összekötési Rajza</div>
            </div>
            
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: '1.5' }}>
              Ez a rajz mutatja meg, hogyan kell a különálló paneleket (ESP32-S3, SN65HVD230 CAN modul, MCP2515 CAN modul, A7670E 4G/GPS modem, DC-DC Buck táp) összekötni egymással a NYÁK-on vagy a próbapanelen:
            </p>

            <div style={{ background: '#060a12', padding: '16px', borderRadius: '12px', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#00f2fe', lineHeight: '1.4', overflowX: 'auto', border: '1px solid var(--border-color)', margin: '12px 0' }}>
{`┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                ESP32 DUAL-CAN & 4G TELEMATIKA HARDVER RAJZ                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  [ 12V AUTÓS TÁP (Fuse Tap) ] ────> [ MP1584EN Buck Konverter ] ────> OUT+ (+5V)  ───> [ ESP32 VIN & MCP2515 VCC ]
  [ KAROSSZÉRIA TEST (GND) ] ─────> OUT- (GND) ───> [ ESP32 GND & ÖSSZES MODUL GND ]

  ┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                                       ESP32-S3 MIKROKONTROLLER                                        │
  │                                                                                                       │
  │   GPIO 5 (TWAI TX) ─────────────────────────> SN65HVD230 (CAN-C)  TX Pin                              │
  │   GPIO 4 (TWAI RX) ─────────────────────────> SN65HVD230 (CAN-C)  RX Pin                              │
  │   3.3V OUT ─────────────────────────────────> SN65HVD230 (CAN-C)  VCC Pin                             │
  │                                                                                                       │
  │   GPIO 15 (SPI CS) ─────────────────────────> MCP2515    (CAN-B)  CS Pin                              │
  │   GPIO 18 (SPI SCK) ────────────────────────> MCP2515    (CAN-B)  SCK Pin                             │
  │   GPIO 23 (SPI MOSI) ───────────────────────> MCP2515    (CAN-B)  SI Pin                              │
  │   GPIO 19 (SPI MISO) ───────────────────────> MCP2515    (CAN-B)  SO Pin                              │
  │                                                                                                       │
  │   GPIO 17 (UART TX) ────────────────────────> A7670E 4G Modem     RX Pin                              │
  │   GPIO 16 (UART RX) ────────────────────────> A7670E 4G Modem     TX Pin                              │
  └───────────────────────────────────────────────────────────────────────────────────────────────────────┘
          │                                           │                                   │
          │ (CANH / CANL)                             │ (CANH / CANL)                     │ (4G / GPS MQTTS)
          ▼                                           ▼                                   ▼
 [ Autó CAN-C Motor/Diag ]                   [ Autó CAN-B Komfort UCH/SAM ]      [ Telekom/Yettel/Voda 4G ]`}
            </div>
          </div>

          {/* SECTION B: CAR MODEL SELECTOR FOR EXACT WIRE LOCATIONS */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><MapPin size={22} style={{ color: '#10b981' }} /> 2. Hol vannak a Kábelek az Utastérben? (Autótípus Választó)</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
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
                <Car size={16} /> Mercedes GL / ML (W164)
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

            {/* RENAULT FLUENCE EXACT WIRE LOCATION DETAILS */}
            {selectedCarGuide === 'renault_fluence' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', background: 'rgba(0,242,254,0.05)', borderRadius: '10px', border: '1px solid rgba(0,242,254,0.2)' }}>
                  <h4 style={{ color: '#00f2fe', marginBottom: '8px' }}>🚗 Renault Fluence & Mégane III (2009–2016) Kábel Helyszínek:</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginTop: '12px' }}>
                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#ef4444' }}>1. +12V Állandó Táp</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> A műszerfal bal alján lévő utastéri biztosítéktáblán.
                        <br /><strong>Melyik biztosíték?</strong> A felső sorban a 15A-es Cigarettagyújtó / Rádió biztosíték helye (Fuse Tap adapterrel).
                      </p>
                    </div>

                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#10b981' }}>2. Motor & Diag CAN-C (500k)</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> A kormány alatt balra lévő kis kipattintható tárolórekesz mögötti fekete OBD-II csatlakozóban.
                        <br /><strong>Vezetékek:</strong> <strong>PIN 6 (Fehér - CAN-H)</strong> és <strong>PIN 14 (Rózsaszín/Kék - CAN-L)</strong>.
                      </p>
                    </div>

                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#7f53ac' }}>3. Komfort CAN-Body (250k)</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> Az utastéri biztosítéktábla mögött elhelyezkedő fekete <strong>UCH (Unité Centrale Habitacle) vezérlőegységben</strong>.
                        <br /><strong>Vezetékek:</strong> A 40-pin csatlakozóban a <strong>Barna/Fehér (CAN-H)</strong> és <strong>Barna/Zöld (CAN-L)</strong> sodort érpár.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MERCEDES W164 EXACT WIRE LOCATION DETAILS */}
            {selectedCarGuide === 'mercedes_w164' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', background: 'rgba(16,185,129,0.05)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <h4 style={{ color: '#10b981', marginBottom: '8px' }}>🚗 Mercedes-Benz GL / ML (W164 / X164) Kábel Helyszínek:</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginTop: '12px' }}>
                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#ef4444' }}>1. +12V Állandó Táp</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> A csomagtartó jobb oldali kárpitja mögött lévő REAR SAM biztosítéktáblán.
                        <br /><strong>Melyik biztosíték?</strong> Bármelyik szabad 15A-es tartalék biztosítékhely (Fuse Tap adapterrel).
                      </p>
                    </div>

                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#10b981' }}>2. Motor & Diag CAN-C (500k)</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> A vezetőoldali műszerfal alsó részén lévő OBD csatlakozóban.
                        <br /><strong>Vezetékek:</strong> <strong>PIN 6 (Zöld/Fehér - CAN-H)</strong> és <strong>PIN 14 (Zöld - CAN-L)</strong>.
                      </p>
                    </div>

                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#7f53ac' }}>3. Komfort CAN-B (83.3k)</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> A csomagtartó jobb oldalán lévő <strong>REAR SAM kényelmi modul</strong> barna csatlakozójában.
                        <br /><strong>Vezetékek:</strong> <strong>Barna/Piros (CAN-H)</strong> és <strong>Barna (CAN-L)</strong> sodort érpár.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BMW E60 EXACT WIRE LOCATION DETAILS */}
            {selectedCarGuide === 'bmw_e60' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', background: 'rgba(245,158,11,0.05)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>🚗 BMW 5 Series / 3 Series (E60 / E90) Kábel Helyszínek:</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginTop: '12px' }}>
                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#ef4444' }}>1. +12V Állandó Táp</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> A kesztyűtartó mögötti belső biztosítéktáblán.
                        <br /><strong>Melyik biztosíték?</strong> 15A-es szivargyújtó / belső világítás biztosítéka (Fuse Tap adapterrel).
                      </p>
                    </div>

                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#10b981' }}>2. PT-CAN Motor (500k)</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> A vezetőoldali lábtér feletti OBD-II aljzatban.
                        <br /><strong>Vezetékek:</strong> <strong>PIN 6 (Kék/Piros - CAN-H)</strong> és <strong>PIN 14 (Kék/Barna - CAN-L)</strong>.
                      </p>
                    </div>

                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#7f53ac' }}>3. K-CAN Komfort (100k)</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> A kesztyűtartó leengedése után a <strong>JBE (Junction Box) modul</strong> fekete csatlakozójában.
                        <br /><strong>Vezetékek:</strong> <strong>Sárga/Piros (K-CAN High)</strong> és <strong>Sárga/Barna (K-CAN Low)</strong> érpár.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VW MQB EXACT WIRE LOCATION DETAILS */}
            {selectedCarGuide === 'vw_mqb' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', background: 'rgba(127,83,172,0.05)', borderRadius: '10px', border: '1px solid rgba(127,83,172,0.2)' }}>
                  <h4 style={{ color: '#7f53ac', marginBottom: '8px' }}>🚗 VW / Audi / Skoda / Seat (MQB Platform) Kábel Helyszínek:</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginTop: '12px' }}>
                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#ef4444' }}>1. +12V Állandó Táp</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> A műszerfal bal oldalán lévő ajtó felőli biztosítéktáblán.
                      </p>
                    </div>

                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#10b981' }}>2. Drive CAN (500k)</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> A vezetőoldali lábtéri OBD csatlakozóban.
                        <br /><strong>Vezetékek:</strong> <strong>PIN 6 (Narancs/Fekete - CAN-H)</strong> és <strong>PIN 14 (Narancs/Barna - CAN-L)</strong>.
                      </p>
                    </div>

                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#7f53ac' }}>3. Comfort CAN (500k)</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> A kormányoszlop feletti <strong>J533 Data Gateway modulban</strong>.
                        <br /><strong>Vezetékek:</strong> <strong>Narancs/Zöld (CAN-H)</strong> és <strong>Narancs/Barna (CAN-L)</strong> érpár.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FORD FOCUS MK3 EXACT WIRE LOCATION DETAILS */}
            {selectedCarGuide === 'ford_focus3' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', background: 'rgba(239,68,68,0.05)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <h4 style={{ color: '#ef4444', marginBottom: '8px' }}>🚗 Ford Focus MK3 / Mondeo MK4 Kábel Helyszínek:</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginTop: '12px' }}>
                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#ef4444' }}>1. +12V Állandó Táp</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> Kesztyűtartó alatti BCM (Body Control Module) biztosítéktáblán.
                      </p>
                    </div>

                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#10b981' }}>2. HS-CAN Motor (500k)</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> OBD-II csatlakozóban.
                        <br /><strong>Vezetékek:</strong> <strong>PIN 6 (Fehér/Kék - CAN-H)</strong> és <strong>PIN 14 (Fehér - CAN-L)</strong>.
                      </p>
                    </div>

                    <div style={{ background: '#060a12', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: '#7f53ac' }}>3. MS-CAN Komfort (125k)</strong>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                        <strong>Hol van?</strong> Szintén az OBD-II csatlakozóban ki van vezetve!
                        <br /><strong>Vezetékek:</strong> <strong>PIN 3 (Szürke/Narancs - CAN-H)</strong> és <strong>PIN 11 (Ibolya/Narancs - CAN-L)</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

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
