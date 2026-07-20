import React, { useState, useEffect } from 'react';
import { 
  Shield, Cpu, Users, Radio, PlusCircle, BookOpen, Wrench, FileCode, Zap, 
  CheckCircle, AlertTriangle, RefreshCw, Copy, Check, Link, Car, Info, MapPin, 
  ArrowRight, Search, Filter, Edit3, Trash2, X, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';

export default function AdminPortal({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'vehicles' | 'devices' | 'pairing' | 'docs'
  
  // Data States
  const [stats, setStats] = useState(null);
  const [canProfiles, setCanProfiles] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [devicesList, setDevicesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal Editing States
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [selectedVehicleModal, setSelectedVehicleModal] = useState(null);
  const [selectedDeviceModal, setSelectedDeviceModal] = useState(null);
  const [editFormMsg, setEditFormMsg] = useState(null);

  // Device Pairing Form State
  const [selectedVin, setSelectedVin] = useState('');
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [selectedCanProfile, setSelectedCanProfile] = useState('');
  const [formMsg, setFormMsg] = useState(null);
  const [selectedCarGuide, setSelectedCarGuide] = useState('renault_fluence');

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [resStats, resProfiles, resUsers, resVehicles, resDevices] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/can-profiles', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/vehicles', { headers }),
        fetch('/api/admin/devices', { headers })
      ]);

      const statsData = await resStats.json();
      const profilesData = await resProfiles.json();
      const usersData = await resUsers.json();
      const vehiclesData = await resVehicles.json();
      const devicesData = await resDevices.json();

      setStats(statsData);
      setCanProfiles(profilesData);
      setUsersList(usersData);
      setVehiclesList(vehiclesData);
      setDevicesList(devicesData);

      if (profilesData.length > 0) setSelectedCanProfile(profilesData[0].id);
      if (vehiclesData.length > 0) setSelectedVin(vehiclesData[0].vin);
    } catch (err) {
      console.error('Admin data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // User Actions (Edit / Delete)
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setEditFormMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${selectedUserModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: selectedUserModal.name,
          email: selectedUserModal.email,
          role: selectedUserModal.role
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sikertelen mentés');
      
      setEditFormMsg({ type: 'success', text: data.message });
      setTimeout(() => { setSelectedUserModal(null); fetchAdminData(); }, 1200);
    } catch (err) {
      setEditFormMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a felhasználót?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Hiba a törlés során');
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Vehicle Actions (Edit / Delete)
  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    setEditFormMsg(null);
    try {
      const res = await fetch(`/api/admin/vehicles/${selectedVehicleModal.vin}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: selectedVehicleModal.name,
          plate: selectedVehicleModal.plate,
          status: selectedVehicleModal.status,
          deviceId: selectedVehicleModal.deviceId,
          canProfileId: selectedVehicleModal.canProfileId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sikertelen mentés');

      setEditFormMsg({ type: 'success', text: data.message });
      setTimeout(() => { setSelectedVehicleModal(null); fetchAdminData(); }, 1200);
    } catch (err) {
      setEditFormMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteVehicle = async (vin) => {
    if (!window.confirm(`Biztosan törlöd a(z) ${vin} alvázszámú járművet?`)) return;
    try {
      const res = await fetch(`/api/admin/vehicles/${vin}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Hiba a törlés során');
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Device Pairing Action
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
          deviceId: deviceIdInput,
          canProfileId: selectedCanProfile
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Sikertelen eszköz párosítás');

      setFormMsg({ type: 'success', text: data.message });
      setDeviceIdInput('');
      fetchAdminData();
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message });
    }
  };

  // Filtering Logic
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || u.role === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const filteredVehicles = vehiclesList.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (v.ownerEmail && v.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredDevices = devicesList.filter(d => {
    const matchesSearch = d.deviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.vehicleName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination Slice
  const getPaginatedData = (dataArray) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return dataArray.slice(startIndex, startIndex + itemsPerPage);
  };

  const getTotalPages = (dataArray) => Math.ceil(dataArray.length / itemsPerPage) || 1;

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
            <h1>SmartCar Telematics Admin Konzol</h1>
            <div className="brand-subtitle">Részletes Ügyfél-, Jármű- és Eszközkezelés</div>
          </div>
        </div>
        <button className="btn-secondary" onClick={onLogout}>Kijelentkezés</button>
      </header>

      {/* Stats KPI Overview */}
      {stats && (
        <div className="telemetry-grid" style={{ marginBottom: '20px' }}>
          <div className="telemetry-card">
            <div className="card-label"><Users size={16} /> Összes Ügyfél</div>
            <div className="card-value" style={{ color: '#00f2fe' }}>{stats.totalUsers}</div>
          </div>
          <div className="telemetry-card">
            <div className="card-label"><Car size={16} /> Regisztrált Járművek</div>
            <div className="card-value" style={{ color: '#10b981' }}>{stats.totalVehicles}</div>
          </div>
          <div className="telemetry-card">
            <div className="card-label"><Radio size={16} /> Aktív ESP32 Modulok</div>
            <div className="card-value" style={{ color: '#f59e0b' }}>{stats.onlineDevices}</div>
          </div>
          <div className="telemetry-card">
            <div className="card-label"><Zap size={16} /> MQTT Broker</div>
            <div className="card-value" style={{ color: stats.mqttStatus === 'connected' ? '#10b981' : '#ef4444' }}>
              {stats.mqttStatus === 'connected' ? 'OK 🟢' : 'HIBA 🔴'}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button 
          className={`btn-secondary ${activeTab === 'users' ? 'active-tab' : ''}`}
          onClick={() => { setActiveTab('users'); setCurrentPage(1); setSearchQuery(''); }}
          style={{ background: activeTab === 'users' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'users' ? '#00f2fe' : undefined }}
        >
          <Users size={18} /> 👥 Ügyfelek ({usersList.length})
        </button>
        <button 
          className={`btn-secondary ${activeTab === 'vehicles' ? 'active-tab' : ''}`}
          onClick={() => { setActiveTab('vehicles'); setCurrentPage(1); setSearchQuery(''); }}
          style={{ background: activeTab === 'vehicles' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'vehicles' ? '#00f2fe' : undefined }}
        >
          <Car size={18} /> 🚗 Járművek ({vehiclesList.length})
        </button>
        <button 
          className={`btn-secondary ${activeTab === 'devices' ? 'active-tab' : ''}`}
          onClick={() => { setActiveTab('devices'); setCurrentPage(1); setSearchQuery(''); }}
          style={{ background: activeTab === 'devices' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'devices' ? '#00f2fe' : undefined }}
        >
          <Cpu size={18} /> 📟 Fizikai Eszközök ({devicesList.length})
        </button>
        <button 
          className={`btn-secondary ${activeTab === 'pairing' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('pairing')}
          style={{ background: activeTab === 'pairing' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'pairing' ? '#00f2fe' : undefined }}
        >
          <Link size={18} /> 🔗 Eszköz Párosítás
        </button>
        <button 
          className={`btn-secondary ${activeTab === 'docs' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('docs')}
          style={{ background: activeTab === 'docs' ? 'rgba(0, 242, 254, 0.2)' : undefined, borderColor: activeTab === 'docs' ? '#00f2fe' : undefined }}
        >
          <BookOpen size={18} /> 📖 Szerelési Útmutató
        </button>
      </div>

      {/* FILTER & SEARCH BAR FOR TABLES */}
      {(activeTab === 'users' || activeTab === 'vehicles' || activeTab === 'devices') && (
        <div style={{ display: 'flex', gap: '16px', margin: '20px 0', alignItems: 'center' }}>
          <div className="input-group" style={{ flex: 1, margin: 0 }}>
            <Search size={18} style={{ color: '#94a3b8', marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Keresés névre, emailre, VIN-re, rendszámra vagy Eszköz ID-ra..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} style={{ color: '#94a3b8' }} />
            <select 
              value={statusFilter} 
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            >
              <option value="ALL" style={{ background: '#0a0e17' }}>Minden Státusz</option>
              {activeTab === 'users' && (
                <>
                  <option value="ADMIN" style={{ background: '#0a0e17' }}>Adminok</option>
                  <option value="USER" style={{ background: '#0a0e17' }}>Ügyfelek</option>
                </>
              )}
              {(activeTab === 'vehicles' || activeTab === 'devices') && (
                <>
                  <option value="online" style={{ background: '#0a0e17' }}>✅ Aktív / Online</option>
                  <option value="pending_activation" style={{ background: '#0a0e17' }}>⏳ Beszerelésre vár</option>
                </>
              )}
            </select>
          </div>
        </div>
      )}

      {/* TAB 1: USERS MANAGEMENT TABLE */}
      {activeTab === 'users' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Users size={22} style={{ color: '#00f2fe' }} /> Regisztrált Ügyfelek Adatbázisa</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', margin: '12px 0' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', color: '#fff' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>ID</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Név</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Email</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Szerepkör</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Járművei</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedData(filteredUsers).map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', color: '#94a3b8', fontSize: '0.8rem' }}>{u.id}</td>
                  <td style={{ padding: '12px', fontWeight: '600', color: '#fff' }}>{u.name}</td>
                  <td style={{ padding: '12px', color: '#00f2fe' }}>{u.email}</td>
                  <td style={{ padding: '12px' }}>
                    <span className="status-badge" style={{ background: u.role === 'admin' ? 'rgba(127,83,172,0.2)' : 'rgba(16,185,129,0.2)', color: u.role === 'admin' ? '#7f53ac' : '#10b981' }}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>{u.vehicleCount || 0} autó</td>
                  <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setSelectedUserModal({ ...u })}>
                      <Edit3 size={14} /> Módosítás
                    </button>
                    <button className="btn-secondary" style={{ padding: '6px 10px', color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDeleteUser(u.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', color: '#94a3b8', fontSize: '0.85rem' }}>
            <div>Összesen {filteredUsers.length} ügyfél (Oldal: {currentPage} / {getTotalPages(filteredUsers)})</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                <ChevronLeft size={16} /> Előző
              </button>
              <button className="btn-secondary" disabled={currentPage >= getTotalPages(filteredUsers)} onClick={() => setCurrentPage(prev => prev + 1)}>
                Következő <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VEHICLES MANAGEMENT TABLE */}
      {activeTab === 'vehicles' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Car size={22} style={{ color: '#10b981' }} /> Flotta Járművek Részletes Listája</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', margin: '12px 0' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', color: '#fff' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Jármű Név / Rendszám</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>VIN Alvázszám</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Tulajdonos</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Fizikai Eszköz ID</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Státusz</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedData(filteredVehicles).map(v => (
                <tr key={v.vin} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', fontWeight: '600', color: '#fff' }}>
                    {v.name} <span style={{ color: '#00f2fe' }}>({v.plate})</span>
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#94a3b8' }}>{v.vin}</td>
                  <td style={{ padding: '12px', color: '#94a3b8' }}>{v.ownerEmail || 'Nincs hozzárendelve'}</td>
                  <td style={{ padding: '12px', color: '#f59e0b', fontSize: '0.8rem' }}>{v.deviceId}</td>
                  <td style={{ padding: '12px' }}>
                    <span className="status-badge" style={{ background: v.status === 'online' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: v.status === 'online' ? '#10b981' : '#f59e0b' }}>
                      {v.status === 'online' ? '✅ Online' : '⏳ Várakozik'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setSelectedVehicleModal({ ...v })}>
                      <Eye size={14} /> Részletek / Módosítás
                    </button>
                    <button className="btn-secondary" style={{ padding: '6px 10px', color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDeleteVehicle(v.vin)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', color: '#94a3b8', fontSize: '0.85rem' }}>
            <div>Összesen {filteredVehicles.length} jármű (Oldal: {currentPage} / {getTotalPages(filteredVehicles)})</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                <ChevronLeft size={16} /> Előző
              </button>
              <button className="btn-secondary" disabled={currentPage >= getTotalPages(filteredVehicles)} onClick={() => setCurrentPage(prev => prev + 1)}>
                Következő <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEVICES MANAGEMENT TABLE */}
      {activeTab === 'devices' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Cpu size={22} style={{ color: '#f59e0b' }} /> Telepített ESP32 Hardver Eszközök</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', margin: '12px 0' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', color: '#fff' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Fizikai Eszköz ID / IMEI</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Hozzárendelt Jármű</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>CAN Profil</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Utolsó Kommunikáció</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Státusz</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedData(filteredDevices).map(d => (
                <tr key={d.deviceId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', fontWeight: '700', color: '#f59e0b', fontFamily: 'JetBrains Mono' }}>{d.deviceId}</td>
                  <td style={{ padding: '12px', color: '#fff' }}>{d.vehicleName} ({d.plate})</td>
                  <td style={{ padding: '12px', color: '#00f2fe' }}>{d.canProfileName || 'Alapértelmezett'}</td>
                  <td style={{ padding: '12px', color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(d.lastPing).toLocaleString('hu-HU')}</td>
                  <td style={{ padding: '12px' }}>
                    <span className="status-badge" style={{ background: d.status === 'online' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: d.status === 'online' ? '#10b981' : '#f59e0b' }}>
                      {d.status === 'online' ? '✅ Aktív MQTTS' : '⏳ Párosításra vár'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {selectedUserModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '450px', background: '#0a0e17', border: '1px solid #00f2fe' }}>
            <div className="card-header">
              <div className="card-title"><Edit3 size={20} /> Ügyfél Adatainak Módosítása</div>
              <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setSelectedUserModal(null)}><X size={16} /></button>
            </div>

            {editFormMsg && (
              <div style={{ padding: '10px', borderRadius: '8px', background: editFormMsg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: '#fff', margin: '10px 0' }}>
                {editFormMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="auth-form">
              <div className="input-group">
                <label style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Ügyfél Neve:</label>
                <input type="text" value={selectedUserModal.name} onChange={e => setSelectedUserModal({ ...selectedUserModal, name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Email Cím:</label>
                <input type="email" value={selectedUserModal.email} onChange={e => setSelectedUserModal({ ...selectedUserModal, email: e.target.value })} required />
              </div>
              <div className="input-group">
                <label style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Szerepkör:</label>
                <select 
                  value={selectedUserModal.role} 
                  onChange={e => setSelectedUserModal({ ...selectedUserModal, role: e.target.value })}
                  style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '10px', color: '#fff' }}
                >
                  <option value="user" style={{ background: '#0a0e17' }}>Ügyfél (User)</option>
                  <option value="admin" style={{ background: '#0a0e17' }}>Adminisztrátor (Admin)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="submit" className="btn-primary full-width">Mentés</button>
                <button type="button" className="btn-secondary full-width" onClick={() => setSelectedUserModal(null)}>Mégse</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VEHICLE MODAL */}
      {selectedVehicleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px', background: '#0a0e17', border: '1px solid #10b981' }}>
            <div className="card-header">
              <div className="card-title"><Car size={20} /> Jármű Részletei & Módosítása</div>
              <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setSelectedVehicleModal(null)}><X size={16} /></button>
            </div>

            {editFormMsg && (
              <div style={{ padding: '10px', borderRadius: '8px', background: editFormMsg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: '#fff', margin: '10px 0' }}>
                {editFormMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveVehicle} className="auth-form">
              <div className="input-group">
                <label style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Jármű Neve:</label>
                <input type="text" value={selectedVehicleModal.name} onChange={e => setSelectedVehicleModal({ ...selectedVehicleModal, name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Rendszám:</label>
                <input type="text" value={selectedVehicleModal.plate} onChange={e => setSelectedVehicleModal({ ...selectedVehicleModal, plate: e.target.value })} required />
              </div>
              <div className="input-group">
                <label style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Fizikai ESP32 Eszköz ID:</label>
                <input type="text" value={selectedVehicleModal.deviceId} onChange={e => setSelectedVehicleModal({ ...selectedVehicleModal, deviceId: e.target.value })} required />
              </div>
              <div className="input-group">
                <label style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Aktiválási Státusz:</label>
                <select 
                  value={selectedVehicleModal.status} 
                  onChange={e => setSelectedVehicleModal({ ...selectedVehicleModal, status: e.target.value })}
                  style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '10px', color: '#fff' }}
                >
                  <option value="online" style={{ background: '#0a0e17' }}>✅ Online (Aktiválva)</option>
                  <option value="pending_activation" style={{ background: '#0a0e17' }}>⏳ Beszerelésre vár</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="submit" className="btn-primary full-width">Változtatások Mentése</button>
                <button type="button" className="btn-secondary full-width" onClick={() => setSelectedVehicleModal(null)}>Bezárás</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: DEVICE PAIRING */}
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
                  value={deviceIdInput} 
                  onChange={e => setDeviceIdInput(e.target.value)} 
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
        </div>
      )}

      {/* TAB 5: WIRING HANDBOOK */}
      {activeTab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Zap size={22} style={{ color: '#00f2fe' }} /> Vizuális Modul Összekötési Blokkvázlat</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', margin: '16px 0' }}>
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
        </div>
      )}
    </div>
  );
}
