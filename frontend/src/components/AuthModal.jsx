import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldAlert } from 'lucide-react';

export default function AuthModal({ initialMode = 'login', onClose, onLoginSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = mode === 'login' ? { email, password } : { name, email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Sikertelen hitelesítés');
      }

      localStorage.setItem('smartcar_token', data.token);
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        
        <h2>{mode === 'login' ? 'Bejelentkezés' : 'Fiók Regisztráció'}</h2>
        <p className="modal-subtitle">
          {mode === 'login' ? 'Lépj be a SmartCar fiókodba' : 'Hozz létre új SmartCar fiókot'}
        </p>

        {error && (
          <div className="auth-error">
            <ShieldAlert size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="input-group">
              <User size={18} />
              <input 
                type="text" 
                placeholder="Teljes Név" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
          )}

          <div className="input-group">
            <Mail size={18} />
            <input 
              type="email" 
              placeholder="Email Cím" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group">
            <Lock size={18} />
            <input 
              type="password" 
              placeholder="Jelszó" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? 'Feldolgozás...' : mode === 'login' ? 'Bejelentkezés' : 'Regisztráció'}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <span>Még nincs fiókod? <button onClick={() => setMode('register')}>Regisztrálj itt</button></span>
          ) : (
            <span>Már van fiókod? <button onClick={() => setMode('login')}>Lépj be itt</button></span>
          )}
        </div>
      </div>
    </div>
  );
}
