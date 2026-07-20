import React from 'react';
import { Shield, Car, Wind, MapPin, Gauge, Cpu, Check, ArrowRight, Lock, Zap } from 'lucide-react';

export default function LandingPage({ onOpenLogin, onOpenRegister, onDemoLogin }) {
  return (
    <div className="landing-container">
      {/* Navigation Bar */}
      <nav className="landing-nav">
        <div className="brand">
          <div className="brand-icon">
            <Car size={26} />
          </div>
          <div className="brand-title">
            <h1>SmartCar</h1>
            <div className="brand-subtitle">Telematics Platform</div>
          </div>
        </div>

        <div className="nav-actions">
          <button className="btn-secondary" onClick={() => onDemoLogin('user')}>
            🚗 Élő Demó
          </button>
          <button className="btn-secondary" onClick={onOpenLogin}>
            Bejelentkezés
          </button>
          <button className="btn-primary" onClick={onOpenRegister}>
            Regisztráció
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <Zap size={14} /> Legújabb ESP32 Dual-CAN & 4G Technológia
        </div>
        <h1 className="hero-title">
          A Járműved Mindig a <span className="gradient-text">Kezedben</span>
        </h1>
        <p className="hero-subtitle">
          Távvezérelt ablak- és tolótető felhúzás, azonnali központi zár irányítás, valós idejű GPS nyomkövetés és motordiagnosztika egyetlen prémium felületen.
        </p>

        <div className="hero-cta-group">
          <button className="btn-hero-primary" onClick={onOpenRegister}>
            Kezdd el ingyen <ArrowRight size={18} />
          </button>
          <button className="btn-hero-secondary" onClick={() => onDemoLogin('admin')}>
            👑 Adminisztrátori Nézet
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><Wind size={24} /></div>
            <h3>Távvezérlés (CAN-B)</h3>
            <p>Húzd fel a nyitva felejtett ablakokat és a tolótetőt a strandról vagy a munkahelyedről egyetlen gombnyomással.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><MapPin size={24} /></div>
            <h3>Élő GPS Nyomkövetés</h3>
            <p>Folyamatos műholdas helyzetmeghatározás, útvonal-előzmények és zónaelhagyási riasztások (Geofencing).</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><Gauge size={24} /></div>
            <h3>Telemetria & Akkuvédelem</h3>
            <p>Akkumulátor feszültség, üzemanyagszint és hűtővíz figyelés okos alvó móddal az akku lemerülése ellen.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><Cpu size={24} /></div>
            <h3>Motordiagnosztika (DTC)</h3>
            <p>Azonnali értesítés a műszerfali hibakódokról és vezérlőegység-állapotokról Push üzenetben.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section">
        <div className="section-title">
          <h2>Válassz <span className="gradient-text">Csomagot</span></h2>
          <p>Rugalmas előfizetés lakossági felhasználóknak és flottaüzemeltetőknek.</p>
        </div>

        <div className="pricing-grid">
          <div className="price-card">
            <div className="price-header">
              <h3>Egyéni (Personal)</h3>
              <div className="price">4 900 Ft <span>/ hó</span></div>
            </div>
            <ul className="price-features">
              <li><Check size={16} /> 1 Jármű teljes vezérlése</li>
              <li><Check size={16} /> Ablak- és zár távvezérlés</li>
              <li><Check size={16} /> Élő GPS Nyomkövetés</li>
              <li><Check size={16} /> Push / Telegram Értesítések</li>
            </ul>
            <button className="btn-price" onClick={onOpenRegister}>Megrendelés</button>
          </div>

          <div className="price-card featured">
            <div className="badge-popular">Legnépszerűbb</div>
            <div className="price-header">
              <h3>Flotta (Fleet)</h3>
              <div className="price">12 900 Ft <span>/ hó</span></div>
            </div>
            <ul className="price-features">
              <li><Check size={16} /> Korlátlan Jármű és Flottatérkép</li>
              <li><Check size={16} /> Admin Portál & Ügyfélkezelés</li>
              <li><Check size={16} /> Telemetria Export & API hozzáférés</li>
              <li><Check size={16} /> Egyedi CAN profil támogatás</li>
            </ul>
            <button className="btn-price primary" onClick={onOpenRegister}>Flotta Indítása</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; 2026 SmartCar Telematics SaaS Platform. Minden jog fenntartva.</p>
      </footer>
    </div>
  );
}
