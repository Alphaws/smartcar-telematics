import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { 
  Car, Shield, Lock, Unlock, Wind, Gauge, Fuel, Thermometer, 
  BatteryCharging, MapPin, AlertTriangle, CheckCircle, RefreshCw, LogOut, UserCheck
} from 'lucide-react';
import L from 'leaflet';

import LandingPage from './components/LandingPage.jsx';
import AuthModal from './components/AuthModal.jsx';
import AdminPortal from './components/AdminPortal.jsx';

// Custom Map Marker Icon
const carIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-cyan.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
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
  const [authModalMode, setAuthModalMode] = useState(null); // 'login' | 'register' | null
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'admin'

  const [vehicle, setVehicle] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Restore User Session from JWT Token
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
          } else {
            handleLogout();
          }
        })
        .catch(() => handleLogout());
    }
  }, [token]);

  // Socket.IO Vehicle Data Subscription
  useEffect(() => {
    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    socket.on('vehicles_init', (data) => {
      if (data && data.length > 0) setVehicle(data[0]);
    });

    socket.on('vehicle_update', (updatedVehicle) => {
      setVehicle((prev) => (prev?.id === updatedVehicle.id ? updatedVehicle : prev));
    });

    fetch('/api/vehicles')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) setVehicle(data[0]);
      })
      .catch((err) => console.error('API Error:', err));

    return () => socket.disconnect();
  }, []);

  const handleLoginSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    setAuthModalMode(null);
    setActiveTab(userData.role === 'admin' ? 'admin' : 'dashboard');
    showToast(`Üdvözlünk újra, ${userData.name}!`);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
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

  const handleCommand = async (action) => {
    if (!vehicle) return;
    setLoadingAction(action);

    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
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

  // If not logged in, render the Landing Page
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

  // If Admin logged in and Admin Tab is selected
  if (user.role === 'admin' && activeTab === 'admin') {
    return (
      <>
        <div className="admin-subnav" style={{ background: '#0e1626', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#00f2fe' }}>Bejelentkezve: <strong>{user.name}</strong> (👑 Admin)</span>
          </div>
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

  // Customer Vehicle Dashboard View
  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            <Car size={26} />
          </div>
          <div className="brand-title">
            <h1>{vehicle?.name || 'SmartCar Telematics'}</h1>
            <div className="brand-subtitle">SmartCar Telematics Platform</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user.role === 'admin' && (
            <button className="btn-secondary" onClick={() => setActiveTab('admin')}>
              👑 Admin Portál
            </button>
          )}
          <div className="status-badge">
            <div className="pulse-dot"></div>
            CAN-B & GPS Online
          </div>
          <button className="btn-secondary" onClick={handleLogout} title="Kijelentkezés">
            <LogOut size={18} />
          </button>
        </div>
      </header>

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

      {vehicle && (
        <div className="dashboard-grid">
          {/* Left Column: Remote Controls & Telemetry */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Shield size={22} /> Távvezérlés (CAN-B Busz)</div>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Ablakok: {vehicle.controls.windowsClosed ? 'Zárva ✅' : 'Nyitva ⚠️'}
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
                  onClick={() => handleCommand(vehicle.controls.doorsLocked ? 'UNLOCK_DOORS' : 'LOCK_DOORS')}
                  disabled={loadingAction === 'LOCK_DOORS' || loadingAction === 'UNLOCK_DOORS'}
                >
                  {vehicle.controls.doorsLocked ? <Lock style={{ color: '#10b981' }} /> : <Unlock style={{ color: '#ef4444' }} />}
                  <span>{vehicle.controls.doorsLocked ? 'Ajtók Zárva (Kinyitás)' : 'Ajtók Nyitva (Bezárás)'}</span>
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
                  <div className="telemetry-value">{vehicle.telemetry.batteryVoltage} V</div>
                </div>
                <div className="telemetry-item">
                  <div className="telemetry-label"><Fuel size={14} style={{ color: '#10b981' }} /> Üzemanyag</div>
                  <div className="telemetry-value">{vehicle.telemetry.fuelLevelLiters} L ({vehicle.telemetry.fuelLevelPercent}%)</div>
                </div>
                <div className="telemetry-item">
                  <div className="telemetry-label"><Thermometer size={14} style={{ color: '#f59e0b' }} /> Hűtővíz</div>
                  <div className="telemetry-value">{vehicle.telemetry.coolantTemp} °C</div>
                </div>
                <div className="telemetry-item">
                  <div className="telemetry-label"><Gauge size={14} style={{ color: '#7f53ac' }} /> Sebesség</div>
                  <div className="telemetry-value">{vehicle.telemetry.speed} km/h</div>
                </div>
                <div className="telemetry-item" style={{ gridColumn: 'span 2' }}>
                  <div className="telemetry-label"><Car size={14} style={{ color: '#94a3b8' }} /> Km Óra Állás</div>
                  <div className="telemetry-value">{vehicle.telemetry.odometer.toLocaleString()} km</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live GPS Map & Diagnostics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title"><MapPin size={22} /> Valós Idejű GPS Nyomkövetés</div>
                <span style={{ fontSize: '0.8rem', color: '#00f2fe', fontFamily: 'JetBrains Mono' }}>
                  {vehicle.telemetry.lat}, {vehicle.telemetry.lng}
                </span>
              </div>
              <div className="map-wrapper">
                <MapContainer center={[vehicle.telemetry.lat, vehicle.telemetry.lng]} zoom={15} scrollWheelZoom={false}>
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[vehicle.telemetry.lat, vehicle.telemetry.lng]} icon={carIcon}>
                    <Popup><strong>{vehicle.name}</strong><br />Rendszám: {vehicle.plate}</Popup>
                  </Marker>
                  <MapRecenter lat={vehicle.telemetry.lat} lng={vehicle.telemetry.lng} />
                </MapContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title"><AlertTriangle size={22} style={{ color: '#f59e0b' }} /> Motordiagnosztika & Hibakódok (DTC)</div>
              </div>
              <div className="dtc-list">
                {vehicle.dtcList.map((dtc, index) => (
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
