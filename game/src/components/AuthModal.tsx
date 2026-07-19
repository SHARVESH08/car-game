import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import { GiRaceCar } from 'react-icons/gi';

const AuthModal: React.FC<{ mode: 'login' | 'register' }> = ({ mode: initMode }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await authAPI.login(email, password);
        login(res.data.token, res.data.user);
      } else {
        const res = await authAPI.register(username, email, password);
        login(res.data.token, res.data.user);
      }
      navigate('/play');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed');
    }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    padding: '14px 18px',
    color: 'white',
    fontFamily: "'Barlow', sans-serif",
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
    }}>
      {/* Glow bg */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 40% 40% at 50% 50%, rgba(255,0,32,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="race-card anim-slide-up" style={{
        borderRadius: '12px',
        padding: '3rem',
        width: '100%',
        maxWidth: '440px',
        opacity: 0,
        animationFillMode: 'forwards',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Top stripe */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #FF0020, #FF6B00, #FFD700)',
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <GiRaceCar size={40} color="#FF0020" style={{ filter: 'drop-shadow(0 0 10px rgba(255,0,32,0.5))' }} />
          <h1 style={{
            fontFamily: "'Bebas Neue', cursive",
            fontSize: '2.5rem',
            letterSpacing: '0.1em',
            color: 'white',
            marginTop: '0.5rem',
          }}>
            Vehicle<span style={{ color: '#FF0020' }}>IQ</span>
          </h1>
        </div>

        {/* Tab toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '4px',
          padding: '4px',
          marginBottom: '2rem',
        }}>
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '10px',
                background: mode === m ? 'linear-gradient(135deg, #FF0020, #FF6B00)' : 'transparent',
                border: 'none',
                borderRadius: '2px',
                color: mode === m ? 'white' : 'rgba(255,255,255,0.4)',
                fontFamily: "'Bebas Neue', cursive",
                fontSize: '1rem',
                letterSpacing: '0.1em',
                cursor: 'none',
                transition: 'all 0.3s ease',
              }}
            >
              {m === 'login' ? 'SIGN IN' : 'REGISTER'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'register' && (
            <input
              type="text"
              placeholder="USERNAME"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ ...inputStyle, fontFamily: "'Bebas Neue', cursive", letterSpacing: '0.1em' }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(255,0,32,0.5)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          )}
          <input
            type="email"
            placeholder="EMAIL"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ ...inputStyle, fontFamily: "'Bebas Neue', cursive", letterSpacing: '0.1em' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(255,0,32,0.5)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          <input
            type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            style={{ ...inputStyle, fontFamily: "'Bebas Neue', cursive", letterSpacing: '0.15em' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(255,0,32,0.5)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>

        {error && (
          <div style={{
            margin: '1rem 0 0',
            padding: '10px',
            background: 'rgba(255,0,32,0.1)',
            border: '1px solid rgba(255,0,32,0.3)',
            borderRadius: '4px',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '0.75rem',
            color: '#FF6B00',
            letterSpacing: '0.05em',
          }}>⚠ {error}</div>
        )}

        <button
          className="btn-race"
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: '1.5rem',
            padding: '16px',
            fontSize: '1.2rem',
            fontFamily: "'Bebas Neue', cursive",
            letterSpacing: '0.15em',
            borderRadius: '4px',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'AUTHENTICATING...' : mode === 'login' ? 'START ENGINE' : 'JOIN THE GRID'}
        </button>

        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontFamily: "'Barlow', sans-serif",
          fontSize: '0.85rem',
          color: 'rgba(255,255,255,0.35)',
        }}>
          {mode === 'login' ? 'No account? ' : 'Already racing? '}
          <span
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ color: '#FF6B00', cursor: 'none', textDecoration: 'underline' }}
          >
            {mode === 'login' ? 'Join the grid' : 'Sign in'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
