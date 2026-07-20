import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { 
  Car, Shield, Lock, Unlock, Wind, Gauge, Fuel, Thermometer, 
  BatteryCharging, MapPin, AlertTriangle, CheckCircle, RefreshCw, Cpu 
} from 'lucide-react';
import L from 'leaflet';

// Custom Map Marker Icon
const carIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-cyan.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to center map on telemetry updates
function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function App() {
  const [vehicle, setVehicle] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    socket.on('vehicles_init', (data) => {
      if (data && data.length > 0) {
        setVehicle(data[0]);
      }
    });

    socket.on('vehicle_update', (updatedVehicle) => {
      setVehicle((prev) => (prev?.id === updatedVehicle.id ? updatedVehicle : prev));
    });

    // Fallback fetch via REST API
    fetch('/api/vehicles')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) setVehicle(data[0]);
      })
      .catch((err) => console.error('API Error:', err));

    return () => socket.disconnect();
  }, []);

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

  if (!vehicle) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw className="animate-spin" size={40} style={{ margin: '0 auto 16px', color: '#00f2fe' }} />
          <h2>SmartCar Rendszer Betöltése...</h2>
        </div>
      </div>
    );
  }

  const { telemetry, controls, dtcList } = vehicle;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            <Car size={26} />
          </div>
          <div className="brand-title">
            <h1>{vehicle.name}</h1>
            <div className="brand-subtitle">SmartCar Telematics Platform</div>
          </div>
        </div>
        <div className="status-badge">
          <div className="pulse-dot"></div>
          CAN-B & GPS Online
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

      {/* Main Grid */}
      <div className="dashboard-grid">

        {/* Left Column: Remote Controls & Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Quick Remote Actions Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Shield size={22} /> Távvezérlés (CAN-B Busz)
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Ablakok: {controls.windowsClosed ? 'Zárva ✅' : 'Nyitva ⚠️'}
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
                onClick={() => handleCommand(controls.doorsLocked ? 'UNLOCK_DOORS' : 'LOCK_DOORS')}
                disabled={loadingAction === 'LOCK_DOORS' || loadingAction === 'UNLOCK_DOORS'}
              >
                {controls.doorsLocked ? <Lock style={{ color: '#10b981' }} /> : <Unlock style={{ color: '#ef4444' }} />}
                <span>{controls.doorsLocked ? 'Ajtók Zárva (Kinyitás)' : 'Ajtók Nyitva (Bezárás)'}</span>
              </button>
            </div>
          </div>

          {/* Telemetry Gauges Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Gauge size={22} /> Élő Telemetria & Állapot
              </div>
            </div>

            <div className="telemetry-grid">
              <div className="telemetry-item">
                <div className="telemetry-label">
                  <BatteryCharging size={14} style={{ color: '#00f2fe' }} /> Akku
                </div>
                <div className="telemetry-value">{telemetry.batteryVoltage} V</div>
              </div>

              <div className="telemetry-item">
                <div className="telemetry-label">
                  <Fuel size={14} style={{ color: '#10b981' }} /> Üzemanyag
                </div>
                <div className="telemetry-value">{telemetry.fuelLevelLiters} L ({telemetry.fuelLevelPercent}%)</div>
              </div>

              <div className="telemetry-item">
                <div className="telemetry-label">
                  <Thermometer size={14} style={{ color: '#f59e0b' }} /> Hűtővíz
                </div>
                <div className="telemetry-value">{telemetry.coolantTemp} °C</div>
              </div>

              <div className="telemetry-item">
                <div className="telemetry-label">
                  <Gauge size={14} style={{ color: '#7f53ac' }} /> Sebesség
                </div>
                <div className="telemetry-value">{telemetry.speed} km/h</div>
              </div>

              <div className="telemetry-item" style={{ gridColumn: 'span 2' }}>
                <div className="telemetry-label">
                  <Car size={14} style={{ color: '#94a3b8' }} /> Km Óra Állás
                </div>
                <div className="telemetry-value">{telemetry.odometer.toLocaleString()} km</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live GPS Map & Diagnostics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Live GPS Map Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <MapPin size={22} /> Valós Idejű GPS Nyomkövetés
              </div>
              <span style={{ fontSize: '0.8rem', color: '#00f2fe', fontFamily: 'JetBrains Mono' }}>
                {telemetry.lat}, {telemetry.lng}
              </span>
            </div>

            <div className="map-wrapper">
              <MapContainer 
                center={[telemetry.lat, telemetry.lng]} 
                zoom={15} 
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[telemetry.lat, telemetry.lng]} icon={carIcon}>
                  <Popup>
                    <strong>{vehicle.name}</strong><br />
                    Rendszám: {vehicle.plate}<br />
                    Akku: {telemetry.batteryVoltage} V
                  </Popup>
                </Marker>
                <MapRecenter lat={telemetry.lat} lng={telemetry.lng} />
              </MapContainer>
            </div>
          </div>

          {/* DTC Diagnostics Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <AlertTriangle size={22} style={{ color: '#f59e0b' }} /> Motordiagnosztika & Hibakódok (DTC)
              </div>
            </div>

            <div className="dtc-list">
              {dtcList.map((dtc, index) => (
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

      {/* Footer */}
      <footer className="footer">
        SmartCar Telematics Platform v1.0.0 &bull; Dual-CAN ESP32 Architecture &bull; Designed by DeepMind Coding Agent &bull; 2026
      </footer>
    </div>
  );
}
