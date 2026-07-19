import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GiTireIronCross, GiSpeedometer } from 'react-icons/gi';

const TAGLINES = ['IDENTIFY.', 'RACE.', 'DOMINATE.'];

const HeroSection: React.FC = () => {
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
        setVisible(true);
      }, 300);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      textAlign: 'center',
      padding: '0 2rem',
      overflow: 'hidden',
    }}>
      {/* Road texture bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '200px',
        background: `
          repeating-linear-gradient(
            to right,
            rgba(255,255,255,0.04) 0px,
            rgba(255,255,255,0.04) 2px,
            transparent 2px,
            transparent 60px
          ),
          linear-gradient(to top, rgba(255,0,32,0.05), transparent)
        `,
        animation: 'roadMove 1s linear infinite',
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,0,32,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Corner checkered accents */}
      <div style={{
        position: 'absolute',
        top: '80px',
        left: '20px',
        width: '80px',
        height: '80px',
        background: `
          repeating-conic-gradient(rgba(255,0,32,0.15) 0% 25%, transparent 0% 50%)
            0 0 / 20px 20px
        `,
      }} />
      <div style={{
        position: 'absolute',
        top: '80px',
        right: '20px',
        width: '80px',
        height: '80px',
        background: `
          repeating-conic-gradient(rgba(255,0,32,0.15) 0% 25%, transparent 0% 50%)
            0 0 / 20px 20px
        `,
      }} />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Eyebrow */}
        <div className="anim-dash-in" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255,0,32,0.1)',
          border: '1px solid rgba(255,0,32,0.3)',
          padding: '6px 16px',
          borderRadius: '2px',
          marginBottom: '1.5rem',
          opacity: 0,
        }}>
          <GiTireIronCross size={14} color="#FF0020" />
          <span style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '0.75rem',
            color: '#FF6B00',
            letterSpacing: '0.2em',
          }}>
            SEASON 2026 · ENGINE READY
          </span>
        </div>

        {/* Title */}
        <h1 className="anim-slide-up delay-200" style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 'clamp(4rem, 12vw, 10rem)',
          lineHeight: 0.9,
          letterSpacing: '0.02em',
          marginBottom: '1rem',
          opacity: 0,
        }}>
          <span style={{ display: 'block', color: 'white' }}>VEHICLE</span>
          <span style={{
            display: 'block',
            color: '#FF0020',
            textShadow: '0 0 40px rgba(255,0,32,0.6), 0 0 80px rgba(255,0,32,0.3)',
            WebkitTextStroke: '1px rgba(255,0,32,0.5)',
          }}>IQ</span>
        </h1>

        {/* Animated tagline */}
        <div style={{
          height: '3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '2rem',
        }}>
          <span style={{
            fontFamily: "'Bebas Neue', cursive",
            fontSize: '2.5rem',
            letterSpacing: '0.3em',
            color: '#FFD700',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(-10px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            textShadow: '0 0 20px rgba(255,215,0,0.5)',
          }}>
            {TAGLINES[taglineIndex]}
          </span>
        </div>

        {/* Subtitle */}
        <p className="anim-slide-up delay-400" style={{
          fontFamily: "'Barlow', sans-serif",
          fontWeight: 300,
          fontSize: '1.1rem',
          color: 'rgba(255,255,255,0.55)',
          maxWidth: '520px',
          margin: '0 auto 3rem',
          lineHeight: 1.7,
          opacity: 0,
          letterSpacing: '0.05em',
        }}>
          Test your vehicle identification skills across silhouettes, details,<br />
          and engine sounds. Compete globally. Build your legacy.
        </p>

        {/* CTA buttons */}
        <div className="anim-slide-up delay-600" style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          opacity: 0,
        }}>
          <button
            className="btn-race"
            onClick={() => navigate('/play')}
            style={{
              padding: '16px 48px',
              fontSize: '1.3rem',
              fontFamily: "'Bebas Neue', cursive",
              letterSpacing: '0.15em',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <GiSpeedometer size={20} />
            START ENGINE
          </button>

          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '16px 48px',
              fontSize: '1.3rem',
              fontFamily: "'Bebas Neue', cursive",
              letterSpacing: '0.15em',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: '4px',
              cursor: 'none',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,0,32,0.5)';
              (e.currentTarget as HTMLElement).style.color = 'white';
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,0,32,0.08)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            CREATE ACCOUNT
          </button>
        </div>

        {/* Stats row */}
        <div className="anim-slide-up delay-800" style={{
          display: 'flex',
          gap: '3rem',
          justifyContent: 'center',
          marginTop: '4rem',
          opacity: 0,
        }}>
          {[
            { value: '196', label: 'CAR MODELS' },
            { value: '5', label: 'GAME MODES' },
            { value: '90.5%', label: 'AI ACCURACY' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Bebas Neue', cursive",
                fontSize: '2.5rem',
                color: '#FF0020',
                textShadow: '0 0 20px rgba(255,0,32,0.4)',
              }}>{stat.value}</div>
              <div style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.2em',
              }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
