import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Garage', to: '/profile' },
    { label: 'Race', to: '/play' },
    { label: 'AI Scan', to: '/scan' },
    { label: 'Leaderboard', to: '/leaderboard' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: 'all 0.3s ease',
        background: scrolled
          ? 'rgba(10, 10, 15, 0.96)'
          : 'rgba(10, 10, 15, 0.7)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(224, 85, 97, 0.15)',
        boxShadow: scrolled ? '0 4px 40px rgba(0,0,0,0.6)' : 'none',
      }}
    >
      {/* Top speed stripe */}
      <div style={{
        height: '2px',
        background: 'linear-gradient(90deg, var(--neon-red), var(--neon-orange), var(--neon-yellow), transparent)',
      }} />

      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, var(--neon-red), var(--neon-orange))',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 900,
            boxShadow: 'var(--red-glow)',
            fontFamily: 'var(--font-display)',
            color: 'white',
          }}>IQ</div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: 'var(--neon-white)',
          }}>
            VEHICLE<span style={{ color: 'var(--neon-red)' }}>IQ</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.68rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: isActive(link.to) ? 'var(--neon-orange)' : 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                padding: '8px 16px',
                position: 'relative',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={e => {
                if (!isActive(link.to)) (e.target as HTMLElement).style.color = 'white';
              }}
              onMouseLeave={e => {
                if (!isActive(link.to)) (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
              }}
            >
              {isActive(link.to) && (
                <span style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '16px',
                  right: '16px',
                  height: '2px',
                  background: 'linear-gradient(90deg, var(--neon-red), var(--neon-orange))',
                  boxShadow: 'var(--orange-glow)',
                }} />
              )}
              {link.label}
            </Link>
          ))}

          {/* Auth buttons */}
          <div style={{ marginLeft: '16px', display: 'flex', gap: '8px' }}>
            {user ? (
              <>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--neon-cyan)',
                  padding: '8px 12px',
                  border: '1px solid rgba(0,229,255,0.2)',
                  borderRadius: '2px',
                }}>
                  {user.username}
                </span>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="btn-race btn-secondary"
                  style={{ padding: '8px 20px', fontSize: '0.65rem' }}
                >
                  Pit Stop
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-race btn-secondary"
                  style={{ padding: '8px 20px', fontSize: '0.65rem' }}>
                  Login
                </Link>
                <Link to="/login" className="btn-race btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.65rem' }}>
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
