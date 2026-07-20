import React, { useState, useEffect } from 'react';
import { 
  Shield, Cpu, Users, Radio, PlusCircle, BookOpen, Wrench, FileCode, Zap, 
  CheckCircle, AlertTriangle, RefreshCw, Copy, Check, Link, Car, Info, MapPin, 
  ArrowRight, Search, Filter, Edit3, Trash2, X, ChevronLeft, ChevronRight, Eye, Lock
} from 'lucide-react';

export default function AdminPortal({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'vehicles' | 'devices' | 'pairing' | 'docs' | 'security'
  
  // Data States
  const [stats, setStats] = useState(null);
  const [canProfiles, setCanProfiles] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [devicesList, setDevicesList] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
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

      const [resStats, resProfiles, resUsers, resVehicles, resDevices, resSecLogs] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/can-profiles', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/vehicles', { headers }),
        fetch('/api/admin/devices', { headers }),
        fetch('/api/admin/security-logs', { headers })
      ]);

      const statsData = await resStats.json();
      const profilesData = await resProfiles.json();
      const usersData = await resUsers.json();
      const vehiclesData = await resVehicles.json();
      const devicesData = await resDevices.json();
      const secLogsData = await resSecLogs.json();

      setStats(statsData);
      setCanProfiles(profilesData);
      setUsersList(usersData);
      setVehiclesList(vehiclesData);
      setDevicesList(devicesData);
      setSecurityLogs(secLogsData.logs || []);

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
    if (!window.confirm('Biztosan törölni szeretnéd ezt az ügyfelet?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) fetchAdminData();
    } catch (err) {
      alert('Törlési hiba!');
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
          deviceId: selectedVehicleModal.deviceId
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
    if (!window.confirm('Biztosan törölni szeretnéd ezt a járművet?')) return;
    try {
      const res = await fetch(`/api/admin/vehicles/${vin}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchAdminData();
    } catch (err) {
      alert('Törlési hiba!');
    }
  };

  // Pair Device Form Handler
  const handlePairDevice = async (e) => {
    e.preventDefault();
    setFormMsg(null);

    if (!selectedVin || !deviceIdInput || !selectedCanProfile) {
      setFormMsg({ type: 'error', text: 'Kérlek töltsd ki az összes mezőt!' });
      return;
    }

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
      if (!res.ok || !data.success) throw new Error(data.error || 'Párosítási hiba');

      setFormMsg({ type: 'success', text: data.message });
      setDeviceIdInput('');
      fetchAdminData();
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message });
    }
  };

  // Filtering Logic
  const getFilteredData = (list, type) => {
    return list.filter(item => {
      const matchesSearch = searchQuery === '' || Object.values(item).some(val => 
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      );
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter || item.eventType === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const currentData = activeTab === 'users' ? getFilteredData(usersList, 'users')
    : activeTab === 'vehicles' ? getFilteredData(vehiclesList, 'vehicles')
    : activeTab === 'devices' ? getFilteredData(devicesList, 'devices')
    : activeTab === 'security' ? getFilteredData(securityLogs, 'security')
    : [];

  const totalPages = Math.ceil(currentData.length / itemsPerPage) || 1;
  const paginatedData = currentData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="admin-container">
      {/* Top Stats Overview */}
      <div className="admin-stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="stat-label">Regisztrált Ügyfelek</div>
            <div className="stat-value">{stats ? stats.totalUsers : 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Car size={24} />
          </div>
          <div>
            <div className="stat-label">Flotta Járművek</div>
            <div className="stat-value">{stats ? stats.totalVehicles : 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(127, 83, 172, 0.1)', color: '#7f53ac' }}>
            <Cpu size={24} />
          </div>
          <div>
            <div className="stat-label">Aktivált ESP32 Modulok</div>
            <div className="stat-value">{devicesList.filter(d => d.status === 'online').length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <Lock size={24} />
          </div>
          <div>
            <div className="stat-label">Kivédett Támadások</div>
            <div className="stat-value">{securityLogs.length}</div>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="admin-nav-tabs">
        <button className={`admin-nav-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); setCurrentPage(1); }}>
          <Users size={18} /> Ügyfelek Kezelése ({usersList.length})
        </button>
        <button className={`admin-nav-btn ${activeTab === 'vehicles' ? 'active' : ''}`} onClick={() => { setActiveTab('vehicles'); setCurrentPage(1); }}>
          <Car size={18} /> Jármű Flotta ({vehiclesList.length})
        </button>
        <button className={`admin-nav-btn ${activeTab === 'devices' ? 'active' : ''}`} onClick={() => { setActiveTab('devices'); setCurrentPage(1); }}>
          <Cpu size={18} /> ESP32 Hardver Eszközök ({devicesList.length})
        </button>
        <button className={`admin-nav-btn ${activeTab === 'pairing' ? 'active' : ''}`} onClick={() => setActiveTab('pairing')}>
          <Link size={18} /> Eszköz Párosítás
        </button>
        <button className={`admin-nav-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => { setActiveTab('security'); setCurrentPage(1); }}>
          <Shield size={18} style={{ color: '#ef4444' }} /> 🛡️ Biztonsági Napló ({securityLogs.length})
        </button>
        <button className={`admin-nav-btn ${activeTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveTab('docs')}>
          <BookOpen size={18} /> Szerelési Kézikönyv
        </button>
      </div>

      {/* Search & Filter Bar (For Tables) */}
      {['users', 'vehicles', 'devices', 'security'].includes(activeTab) && (
        <div className="admin-filter-bar">
          <div className="search-box">
            <Search size={18} style={{ color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Keresés név, alvázszám, IP-cím vagy email alapján..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="filter-box">
            <Filter size={18} style={{ color: '#94a3b8' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
              <option value="ALL">Összes Állapot</option>
              <option value="online">Online / Aktivált</option>
              <option value="pending_activation">Várakozik</option>
              <option value="UNAUTHORIZED_TELEMETRY_ATTEMPT">Illetéktelen Támadások</option>
            </select>
          </div>

          <button className="btn-secondary" onClick={fetchAdminData} title="Adatok frissítése">
            <RefreshCw size={16} /> Frissítés
          </button>
        </div>
      )}

      {/* TAB 1: USERS TABLE */}
      {activeTab === 'users' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Users size={22} /> Ügyfelek és Fiókok</div>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Megjelenítve: {paginatedData.length} / {currentData.length} fiók</span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Ügyfél Név</th>
                <th>Email Cím</th>
                <th>Szerepkör</th>
                <th>Regisztráció</th>
                <th>Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-cyan'}`}>
                      {u.role === 'admin' ? '👑 Admin' : '👤 Ügyfél'}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>{new Date(u.created_at).toLocaleDateString('hu-HU')}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn edit" onClick={() => setSelectedUserModal(u)} title="Szerkesztés">
                        <Edit3 size={16} />
                      </button>
                      <button className="icon-btn delete" onClick={() => handleDeleteUser(u.id)} title="Törlés">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={18} /></button>
            <span>Oldal: {currentPage} / {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={18} /></button>
          </div>
        </div>
      )}

      {/* TAB 2: VEHICLES TABLE */}
      {activeTab === 'vehicles' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Car size={22} /> Jármű Flotta</div>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Megjelenítve: {paginatedData.length} / {currentData.length} jármű</span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Jármű Név</th>
                <th>Alvázszám (VIN)</th>
                <th>Rendszám</th>
                <th>Tulajdonos</th>
                <th>Eszköz ID</th>
                <th>Állapot</th>
                <th>Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(v => (
                <tr key={v.vin}>
                  <td><strong>{v.name}</strong></td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', color: '#00f2fe' }}>{v.vin}</td>
                  <td><span className="plate-badge">{v.plate}</span></td>
                  <td>{v.ownerName || v.ownerEmail}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>{v.deviceId}</td>
                  <td>
                    <span className={`badge ${v.status === 'online' ? 'badge-green' : 'badge-yellow'}`}>
                      {v.status === 'online' ? 'Online ✅' : 'Várakozik ⏳'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn edit" onClick={() => setSelectedVehicleModal(v)} title="Szerkesztés">
                        <Edit3 size={16} />
                      </button>
                      <button className="icon-btn delete" onClick={() => handleDeleteVehicle(v.vin)} title="Törlés">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={18} /></button>
            <span>Oldal: {currentPage} / {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={18} /></button>
          </div>
        </div>
      )}

      {/* TAB 3: DEVICES TABLE */}
      {activeTab === 'devices' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Cpu size={22} /> ESP32 Hardver Modulok</div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Fizikai Eszköz ID</th>
                <th>Kapcsolódott Jármű</th>
                <th>CAN Profil</th>
                <th>Utolsó Kommunikáció</th>
                <th>Állapot</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(d => (
                <tr key={d.deviceId}>
                  <td style={{ fontFamily: 'JetBrains Mono', fontWeight: '700', color: '#00f2fe' }}>{d.deviceId}</td>
                  <td>{d.vehicleName} ({d.plate})</td>
                  <td>{d.canProfileName}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>{new Date(d.lastPing).toLocaleString('hu-HU')}</td>
                  <td>
                    <span className={`badge ${d.status === 'online' ? 'badge-green' : 'badge-yellow'}`}>
                      {d.status === 'online' ? 'CAN & 4G Active' : 'Offline'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={18} /></button>
            <span>Oldal: {currentPage} / {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={18} /></button>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY AUDIT LOGS (UNAUTHORIZED TRAFFIC RETRIEVAL) */}
      {activeTab === 'security' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Shield size={22} style={{ color: '#ef4444' }} /> Illetéktelen Forgalom & Biztonsági Audit Napló</div>
            <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>🛡️ Összes Kivédett Támadás: {securityLogs.length}</span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Időpont</th>
                <th>Forrás IP-cím</th>
                <th>Esemény Típusa</th>
                <th>Alvázszám (VIN)</th>
                <th>Próbált Hardver Kulcs</th>
                <th>Részletek</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>{new Date(log.recordedAt).toLocaleString('hu-HU')}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontWeight: '700', color: '#ef4444' }}>{log.ipAddress}</td>
                  <td>
                    <span className="badge badge-yellow" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      ⚠️ {log.eventType}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>{log.vin || 'NEM MEGADOTT'}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', color: '#94a3b8' }}>{log.attemptedSecret}</td>
                  <td style={{ fontSize: '0.85rem' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={18} /></button>
            <span>Oldal: {currentPage} / {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={18} /></button>
          </div>
        </div>
      )}

      {/* TAB 5: PAIRING FORM */}
      {activeTab === 'pairing' && (
        <div className="card" style={{ maxWidth: '750px', margin: '0 auto' }}>
          <div className="card-header">
            <div className="card-title"><Link size={22} /> Hardver Párosítása Járműhöz</div>
          </div>
          
          <form onSubmit={handlePairDevice} className="auth-form" style={{ marginTop: '20px' }}>
            <div className="input-group">
              <label>1. Válassz Ügyfél Járművet (VIN):</label>
              <select value={selectedVin} onChange={e => setSelectedVin(e.target.value)} required>
                {vehiclesList.map(v => (
                  <option key={v.vin} value={v.vin}>
                    {v.name} ({v.plate}) &bull; VIN: {v.vin} [{v.status === 'online' ? 'AKTÍV' : 'VÁRAKOZIK'}]
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>2. ESP32 Hardver Eszköz Szériaszám / MAC Cím:</label>
              <input 
                type="text" 
                placeholder="Pl. ESP32_HW_84F3EB12A990" 
                value={deviceIdInput} 
                onChange={e => setDeviceIdInput(e.target.value)} 
                required 
              />
            </div>

            <div className="input-group">
              <label>3. CAN Busz Modell Profil:</label>
              <select value={selectedCanProfile} onChange={e => setSelectedCanProfile(e.target.value)} required>
                {canProfiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (CAN-B: {p.canB_speed}, CAN-C: {p.canC_speed})
                  </option>
                ))}
              </select>
            </div>

            {formMsg && (
              <div className={`status-badge ${formMsg.type === 'success' ? 'badge-green' : 'badge-yellow'}`}>
                {formMsg.text}
              </div>
            )}

            <button type="submit" className="btn-primary full-width" style={{ marginTop: '15px' }}>
              <Link size={18} /> Eszköz Párosítása és Aktiválása
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: WIRING HANDBOOK */}
      {activeTab === 'docs' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Wrench size={22} style={{ color: '#00f2fe' }} /> Színes Szervizes Bekötési Kézikönyv</div>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Válassz járműmodellt a pontos szervizes kábelbekötéshez!
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '16px 0' }}>
            <button className={`btn-secondary ${selectedCarGuide === 'renault_fluence' ? 'active-tab' : ''}`} onClick={() => setSelectedCarGuide('renault_fluence')}>Renault Fluence / Mégane III</button>
            <button className={`btn-secondary ${selectedCarGuide === 'mb_w164' ? 'active-tab' : ''}`} onClick={() => setSelectedCarGuide('mb_w164')}>Mercedes-Benz GL (W164)</button>
            <button className={`btn-secondary ${selectedCarGuide === 'bmw_e60' ? 'active-tab' : ''}`} onClick={() => setSelectedCarGuide('bmw_e60')}>BMW 530d (E60)</button>
            <button className={`btn-secondary ${selectedCarGuide === 'vw_mqb' ? 'active-tab' : ''}`} onClick={() => setSelectedCarGuide('vw_mqb')}>VW Group (MQB)</button>
            <button className={`btn-secondary ${selectedCarGuide === 'ford_focus3' ? 'active-tab' : ''}`} onClick={() => setSelectedCarGuide('ford_focus3')}>Ford Focus MK3</button>
          </div>

          <div style={{ background: '#090d16', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3>Bekötési Pontok ({selectedCarGuide.toUpperCase()})</h3>
            <p style={{ color: '#94a3b8', margin: '8px 0 16px' }}>
              Az ESP32 Dual-CAN egységet a megadott utastéri kábelkorbácsokra kell rákötni.
            </p>

            <div className="telemetry-grid">
              <div className="telemetry-item">
                <div className="telemetry-label">12V Tápfeszültség</div>
                <div className="telemetry-value" style={{ color: '#ef4444' }}>Klíma / OBD Fuse (15A)</div>
              </div>
              <div className="telemetry-item">
                <div className="telemetry-label">CAN-C Motor Busz (500k)</div>
                <div className="telemetry-value" style={{ color: '#10b981' }}>OBD2 PIN 6 (High) / PIN 14 (Low)</div>
              </div>
              <div className="telemetry-item">
                <div className="telemetry-label">CAN-B Komfort Busz</div>
                <div className="telemetry-value" style={{ color: '#00f2fe' }}>BSI / SAM Modul 40-pin csatlakozó</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {selectedUserModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Ügyfél Módosítása</h2>
            <form onSubmit={handleSaveUser} className="auth-form">
              <div className="input-group">
                <label>Név:</label>
                <input type="text" value={selectedUserModal.name} onChange={e => setSelectedUserModal({ ...selectedUserModal, name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label>Email:</label>
                <input type="email" value={selectedUserModal.email} onChange={e => setSelectedUserModal({ ...selectedUserModal, email: e.target.value })} required />
              </div>
              <div className="input-group">
                <label>Szerepkör:</label>
                <select value={selectedUserModal.role} onChange={e => setSelectedUserModal({ ...selectedUserModal, role: e.target.value })}>
                  <option value="user">👤 Ügyfél</option>
                  <option value="admin">👑 Adminisztrátor</option>
                </select>
              </div>

              {editFormMsg && <div className="status-badge">{editFormMsg.text}</div>}

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" className="btn-primary full-width">Mentés</button>
                <button type="button" className="btn-secondary full-width" onClick={() => setSelectedUserModal(null)}>Mégse</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VEHICLE MODAL */}
      {selectedVehicleModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Jármű Módosítása</h2>
            <form onSubmit={handleSaveVehicle} className="auth-form">
              <div className="input-group">
                <label>Jármű Név:</label>
                <input type="text" value={selectedVehicleModal.name} onChange={e => setSelectedVehicleModal({ ...selectedVehicleModal, name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label>Rendszám:</label>
                <input type="text" value={selectedVehicleModal.plate} onChange={e => setSelectedVehicleModal({ ...selectedVehicleModal, plate: e.target.value })} required />
              </div>
              <div className="input-group">
                <label>Fizikai Eszköz ID:</label>
                <input type="text" value={selectedVehicleModal.deviceId} onChange={e => setSelectedVehicleModal({ ...selectedVehicleModal, deviceId: e.target.value })} required />
              </div>
              <div className="input-group">
                <label>Állapot:</label>
                <select value={selectedVehicleModal.status} onChange={e => setSelectedVehicleModal({ ...selectedVehicleModal, status: e.target.value })}>
                  <option value="online">Online / Aktivált ✅</option>
                  <option value="pending_activation">Szervizes Aktiválásra Vár ⏳</option>
                </select>
              </div>

              {editFormMsg && <div className="status-badge">{editFormMsg.text}</div>}

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" className="btn-primary full-width">Mentés</button>
                <button type="button" className="btn-secondary full-width" onClick={() => setSelectedVehicleModal(null)}>Mégse</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
