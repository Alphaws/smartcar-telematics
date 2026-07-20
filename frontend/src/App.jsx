import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { 
  Car, Shield, Lock, Unlock, Wind, Gauge, Fuel, Thermometer, 
  BatteryCharging, MapPin, AlertTriangle, CheckCircle, RefreshCw, LogOut, PlusCircle, Clock, ChevronDown
} from 'lucide-react';
import L from 'leaflet';

import LandingPage from './components/LandingPage.jsx';
import AuthModal from './components/AuthModal.jsx';
import AdminPortal from './components/AdminPortal.jsx';

// Self-contained Cyan Car Marker Icon SVG (Zero 404 CDN dependencies)
const cyanMarkerSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="%2300f2fe" stroke="%23060a12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="%23060a12"/></svg>`;

const carIcon = new L.Icon({
  iconUrl: cyanMarkerSvg,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('smartcar_token') || null);
  const [authModalMode, setAuthModalMode] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [vehicles, setVehicles] = useState([]);
  const [selectedVin, setSelectedVin] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // New Vehicle Form State
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleVin, setNewVehicleVin] = useState('');
  const [newVehiclePlate, setNewVehiclePlate] = useState('');

  // Restore User Session
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            if (data.user.role === 'admin') setActiveTab('admin');
            fetchUserVehicles(token);
          } else {
            handleLogout();
          }
        })
        .catch(() => handleLogout());
    }
  }, [token]);

  const fetchUserVehicles = (authToken) => {
    fetch('/api/vehicles', {
      headers: { Authorization: `Bearer ${authToken || token}` }
    })
      .then(res => res.json())
      .then(data => {
        setVehicles(data);
        if (data.length > 0) {
          setSelectedVin(prev => prev && data.some(v => v.vin === prev) ? prev : data[0].vin);
        }
      })
      .catch(err => console.error('Fetch vehicles error:', err));
  };

  // Socket.IO Vehicle Data Subscription
  useEffect(() => {
    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    socket.on('vehicle_update', (updatedVehicle) => {
      setVehicles(prev => {
        const exists = prev.some(v => v.vin === updatedVehicle.vin);
        if (exists) {
          return prev.map(v => v.vin === updatedVehicle.vin ? updatedVehicle : v);
        }
        return [...prev, updatedVehicle];
      });
    });

    return () => socket.disconnect();
  }, []);

  const handleLoginSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    setAuthModalMode(null);
    setActiveTab(userData.role === 'admin' ? 'admin' : 'dashboard');
    fetchUserVehicles(userToken);
    showToast(`Üdvözlünk újra, ${userData.name}!`);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setVehicles([]);
    setSelectedVin(null);
    localStorage.removeItem('smartcar_token');
    setActiveTab('dashboard');
    showToast('Kijelentkeztél a rendszerből.');
  };

  const handleDemoLogin = async (role) => {
    const email = role === 'admin' ? 'admin@smartcar.hu' : 'imre@smartcar.hu';
    const password = role === 'admin' ? 'admin123' : 'user123';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.token) {
        handleLoginSuccess(data.user, data.token);
      }
    } catch (err) {
      showToast('Demó belépési hiba');
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/vehicles/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newVehicleName,
          vin: newVehicleVin,
          plate: newVehiclePlate
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Hiba a jármű felvételekor');

      showToast(data.message);
      setNewVehicleName(''); setNewVehicleVin(''); setNewVehiclePlate('');
      setShowAddVehicleForm(false);
      fetchUserVehicles(token);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleCommand = async (action) => {
    if (!selectedVin) return;
    setLoadingAction(action);

    try {
      const res = await fetch(`/api/vehicles/${selectedVin}/command`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
      } else {
        showToast(data.error || 'Hiba a parancs küldése közben!');
      }
    } catch (e) {
      showToast('Hiba a parancs küldése közben!');
    } finally {
      setLoadingAction(null);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // If not logged in ➔ Show Landing Page
  if (!user) {
    return (
      <>
        <LandingPage 
          onOpenLogin={() => setAuthModalMode('login')} 
          onOpenRegister={() => setAuthModalMode('register')} 
          onDemoLogin={handleDemoLogin}
        />
        {authModalMode && (
          <AuthModal 
            initialMode={authModalMode} 
            onClose={() => setAuthModalMode(null)} 
            onLoginSuccess={handleLoginSuccess}
          />
        )}
      </>
    );
  }

  // If Admin logged in & Admin tab selected
  if (user.role === 'admin' && activeTab === 'admin') {
    return (
      <>
        <div className="admin-subnav" style={{ background: '#0e1626', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.85rem', color: '#00f2fe' }}>Bejelentkezve: <strong>{user.name}</strong> (👑 Admin)</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setActiveTab('dashboard')}>
              🚗 Ügyfél Dashboard Nézet
            </button>
            <button className="btn-secondary" onClick={handleLogout}>
              <LogOut size={16} /> Kijelentkezés
            </button>
          </div>
        </div>
        <AdminPortal token={token} onLogout={handleLogout} />
      </>
    );
  }

  const selectedVehicle = vehicles.find(v => v.vin === selectedVin) || vehicles[0];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon"><Car size={26} /></div>
          <div className="brand-title">
            <h1>{selectedVehicle ? selectedVehicle.name : 'SmartCar Telematics'}</h1>
            <div className="brand-subtitle">SmartCar Telematics Platform</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* VEHICLE SELECTOR DROPDOWN */}
          {vehicles.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 242, 254, 0.08)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
              <Car size={18} style={{ color: '#00f2fe' }} />
              <select 
                value={selectedVin || ''} 
                onChange={e => setSelectedVin(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {vehicles.map(v => (
                  <option key={v.vin} value={v.vin} style={{ background: '#0a0e17' }}>
                    {v.name} ({v.plate})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button className="btn-secondary" onClick={() => setShowAddVehicleForm(true)}>
            <PlusCircle size={18} /> Új Autó Felvétele
          </button>

          {user.role === 'admin' && (
            <button className="btn-secondary" onClick={() => setActiveTab('admin')}>
              👑 Admin Portál
            </button>
          )}

          {selectedVehicle && (
            <div className="status-badge" style={{ 
              background: selectedVehicle.status === 'online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              borderColor: selectedVehicle.status === 'online' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
              color: selectedVehicle.status === 'online' ? '#10b981' : '#f59e0b'
            }}>
              <div className="pulse-dot" style={{ backgroundColor: selectedVehicle.status === 'online' ? '#10b981' : '#f59e0b' }}></div>
              {selectedVehicle.status === 'online' ? 'CAN-B & GPS Online' : '⏳ Szervizes Beszerelésre Vár'}
            </div>
          )}

          <button className="btn-secondary" onClick={handleLogout} title="Kijelentkezés">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* MULTI-VEHICLE SELECTOR BAR */}
      {vehicles.length > 1 && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>Válassz Járművet:</span>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {vehicles.map(v => (
              <button 
                key={v.vin}
                className={`btn-secondary ${selectedVin === v.vin ? 'active-tab' : ''}`}
                onClick={() => setSelectedVin(v.vin)}
                style={{ 
                  background: selectedVin === v.vin ? '#00f2fe' : undefined, 
                  color: selectedVin === v.vin ? '#000' : undefined,
                  fontWeight: '700'
                }}
              >
                <Car size={16} /> {v.name} ({v.plate}) [{v.status === 'online' ? 'ONLINE' : 'VÁRAKOZIK'}]
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          padding: '14px 20px',
          background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(79, 172, 254, 0.2))',
          border: '1px solid #00f2fe',
          borderRadius: '12px',
          color: '#fff',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle size={20} style={{ color: '#00f2fe' }} />
          {toastMessage}
        </div>
      )}

      {/* Modal: Add New Vehicle */}
      {showAddVehicleForm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Új Jármű Felvétele</h2>
            <p className="modal-subtitle">Add meg a járműved adatait a beszerelés előtt</p>

            <form onSubmit={handleAddVehicle} className="auth-form">
              <div className="input-group">
                <input type="text" placeholder="Jármű Megnevezése (pl. BMW 530d)" value={newVehicleName} onChange={e => setNewVehicleName(e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="text" placeholder="Alvázszám (VIN - 17 karakter)" value={newVehicleVin} onChange={e => setNewVehicleVin(e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="text" placeholder="Rendszám (pl. XYZ-789)" value={newVehiclePlate} onChange={e => setNewVehiclePlate(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary full-width">Jármű Rögzítése</button>
                <button type="button" className="btn-secondary full-width" onClick={() => setShowAddVehicleForm(false)}>Mégse</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* If User Has No Vehicles Yet */}
      {vehicles.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Car size={50} style={{ color: '#00f2fe', margin: '0 auto 16px' }} />
          <h2>Még nincs regisztrált járműved a fiókodban</h2>
          <p style={{ color: '#94a3b8', margin: '12px 0 24px' }}>
            Regisztráld az autódat a felületen! A szervizben az Adminisztrátor párosítja majd az ESP32 hardver eszközt.
          </p>
          <button className="btn-primary" onClick={() => setShowAddVehicleForm(true)} style={{ width: 'auto', margin: '0 auto' }}>
            <PlusCircle size={18} /> Új Jármű Felvétele Most
          </button>
        </div>
      )}

      {/* Selected Vehicle Pending Activation View */}
      {selectedVehicle && selectedVehicle.status === 'pending_activation' && (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px', border: '1px solid #f59e0b' }}>
          <Clock size={48} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
          <h2>Várakozás szervizes beszerelésre és aktiválásra</h2>
          <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '12px auto' }}>
            A(z) <strong>{selectedVehicle.name} ({selectedVehicle.plate})</strong> adatait rögzítettük! Amint az autóvillamossági szervizben beszerelik az ESP32 hardvert, az Adminisztrátor aktiválja az eszközt, és elindul az élő nyomkövetés és távvezérlés.
          </p>
          <div style={{ fontSize: '0.85rem', color: '#00f2fe', fontFamily: 'JetBrains Mono' }}>
            Alvázszám (VIN): {selectedVehicle.vin}
          </div>
        </div>
      )}

      {/* Active Online Vehicle Dashboard View */}
      {selectedVehicle && selectedVehicle.status === 'online' && (
        <div className="dashboard-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Shield size={22} /> Távvezérlés (CAN-B Busz)</div>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Ablakok: {selectedVehicle.controls.windowsClosed ? 'Zárva ✅' : 'Nyitva ⚠️'}
                </span>
              </div>
              <div className="remote-grid">
                <button 
                  className="action-btn primary"
                  onClick={() => handleCommand('ROLLUP_WINDOWS')}
                  disabled={loadingAction === 'ROLLUP_WINDOWS'}
                >
                  <Wind />
                  <span>{loadingAction === 'ROLLUP_WINDOWS' ? 'Küldés...' : 'Ablakok & Tető Felhúzása'}</span>
                </button>
                <button 
                  className="action-btn"
                  onClick={() => handleCommand(selectedVehicle.controls.doorsLocked ? 'UNLOCK_DOORS' : 'LOCK_DOORS')}
                  disabled={loadingAction === 'LOCK_DOORS' || loadingAction === 'UNLOCK_DOORS'}
                >
                  {selectedVehicle.controls.doorsLocked ? <Lock style={{ color: '#10b981' }} /> : <Unlock style={{ color: '#ef4444' }} />}
                  <span>{selectedVehicle.controls.doorsLocked ? 'Ajtók Zárva (Kinyitás)' : 'Ajtók Nyitva (Bezárás)'}</span>
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title"><Gauge size={22} /> Élő Telemetria & Állapot</div>
              </div>
              <div className="telemetry-grid">
                <div className="telemetry-item">
                  <div className="telemetry-label"><BatteryCharging size={14} style={{ color: '#00f2fe' }} /> Akku</div>
                  <div className="telemetry-value">{selectedVehicle.telemetry.batteryVoltage} V</div>
                </div>
                <div className="telemetry-item">
                  <div className="telemetry-label"><Fuel size={14} style={{ color: '#10b981' }} /> Üzemanyag</div>
                  <div className="telemetry-value">{selectedVehicle.telemetry.fuelLevelLiters} L ({selectedVehicle.telemetry.fuelLevelPercent}%)</div>
                </div>
                <div className="telemetry-item">
                  <div className="telemetry-label"><Thermometer size={14} style={{ color: '#f59e0b' }} /> Hűtővíz</div>
                  <div className="telemetry-value">{selectedVehicle.telemetry.coolantTemp} °C</div>
                </div>
                <div className="telemetry-item">
                  <div className="telemetry-label"><Gauge size={14} style={{ color: '#7f53ac' }} /> Sebesség</div>
                  <div className="telemetry-value">{selectedVehicle.telemetry.speed} km/h</div>
                </div>
                <div className="telemetry-item" style={{ gridColumn: 'span 2' }}>
                  <div className="telemetry-label"><Car size={14} style={{ color: '#94a3b8' }} /> Km Óra Állás</div>
                  <div className="telemetry-value">{selectedVehicle.telemetry.odometer.toLocaleString()} km</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title"><MapPin size={22} /> Valós Idejű GPS Nyomkövetés</div>
                <span style={{ fontSize: '0.8rem', color: '#00f2fe', fontFamily: 'JetBrains Mono' }}>
                  {selectedVehicle.telemetry.lat}, {selectedVehicle.telemetry.lng}
                </span>
              </div>
              <div className="map-wrapper">
                <MapContainer center={[selectedVehicle.telemetry.lat, selectedVehicle.telemetry.lng]} zoom={15} scrollWheelZoom={false}>
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[selectedVehicle.telemetry.lat, selectedVehicle.telemetry.lng]} icon={carIcon}>
                    <Popup><strong>{selectedVehicle.name}</strong><br />Rendszám: {selectedVehicle.plate}</Popup>
                  </Marker>
                  <MapRecenter lat={selectedVehicle.telemetry.lat} lng={selectedVehicle.telemetry.lng} />
                </MapContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title"><AlertTriangle size={22} style={{ color: '#f59e0b' }} /> Motordiagnosztika & Hibakódok (DTC)</div>
              </div>
              <div className="dtc-list">
                {selectedVehicle.dtcList.map((dtc, index) => (
                  <div className="dtc-item" key={index}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="dtc-code">{dtc.code}</span>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{dtc.module} Vezérlőegység</div>
                        <div className="dtc-desc">{dtc.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        SmartCar Telematics Platform v1.0.0 &bull; Dual-CAN ESP32 SaaS Architecture &bull; 2026
      </footer>
    </div>
  );
}
