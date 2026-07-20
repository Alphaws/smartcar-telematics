import React, { useState, useEffect } from 'react';
import { Shield, Cpu, Users, Radio, PlusCircle, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminPortal({ token, onLogout }) {
  const [stats, setStats] = useState(null);
  const [canProfiles, setCanProfiles] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <RefreshCw className="animate-spin" size={40} style={{ color: '#00f2fe' }} />
        <h2>Adminisztációs Adatok Betöltése...</h2>
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
            <h1>SmartCar Adminisztrációs Portál</h1>
            <div className="brand-subtitle">Hardver Párosítás & Ügyfélkezelés</div>
          </div>
        </div>
        <button className="btn-secondary" onClick={onLogout}>Kijelentkezés</button>
      </header>

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

      {/* Main Content Grid */}
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

        {/* Users & Devices List */}
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
    </div>
  );
}
