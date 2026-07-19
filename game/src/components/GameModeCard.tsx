import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface GameMode {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  difficulty: string;
  color: string;
  tag: string;
}

const MODES: GameMode[] = [
  {
    id: 'silhouette',
    title: 'SILHOUETTE',
    subtitle: 'MODE',
    description: 'Identify vehicles from their outline only. Shape recognition at its finest.',
    icon: '🌑',
    difficulty: 'MEDIUM',
    color: '#8B5CF6',
    tag: 'VISUAL',
  },
  {
    id: 'detail',
    title: 'IMAGE',
    subtitle: 'DETAIL',
    description: 'Cropped headlights, badges, and tails. Find the vehicle in the details.',
    icon: '🔍',
    difficulty: 'HARD',
    color: '#EF8A4C',
    tag: 'DETAIL',
  },
  {
    id: 'sound',
    title: 'ENGINE',
    subtitle: 'SOUND',
    description: 'Close your eyes. Listen. What machine is roaring at you?',
    icon: '🔊',
    difficulty: 'EXPERT',
    color: '#E14B57',
    tag: 'COMING SOON',
  },
  {
    id: 'speed',
    title: 'SPEED',
    subtitle: 'ROUND',
    description: 'Maximum vehicles. Minimum time. Pure instinct over analysis.',
    icon: '⚡',
    difficulty: 'INSANE',
    color: '#E7C979',
    tag: 'TIMED',
  },
  {
    id: 'scan',
    title: 'AI',
    subtitle: 'SCAN',
    description: 'Upload your own ride. The neural net calls make, model and confidence.',
    icon: '🧠',
    difficulty: 'SHOWCASE',
    color: '#00E5FF',
    tag: 'ML MODEL',
  },
];

const DIFF_COLORS: Record<string, string> = {
  MEDIUM: '#8B5CF6',
  HARD: '#EF8A4C',
  EXPERT: '#E14B57',
  INSANE: '#E7C979',
  SHOWCASE: '#00E5FF',
};

const GameModeCard: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Section header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <span style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '0.75rem',
          color: '#EF8A4C',
          letterSpacing: '0.3em',
          display: 'block',
          marginBottom: '0.5rem',
        }}>SELECT YOUR</span>
        <h2 style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 'clamp(2.5rem, 6vw, 5rem)',
          color: 'white',
          letterSpacing: '0.05em',
        }}>
          RACE MODE
        </h2>
        <div style={{
          width: '60px',
          height: '3px',
          background: 'linear-gradient(90deg, #E14B57, #EF8A4C)',
          margin: '1rem auto 0',
          borderRadius: '2px',
        }} />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.5rem',
      }}>
        {MODES.map((mode, i) => (
          <div
            key={mode.id}
            className={`race-card anim-slide-up delay-${(i + 1) * 100}`}
            onMouseEnter={() => setHoveredId(mode.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => navigate(mode.id === 'scan' ? '/scan' : `/play?mode=${mode.id}`)}
            style={{
              borderRadius: '8px',
              padding: '2rem',
              cursor: 'none',
              opacity: 0,
              animationFillMode: 'forwards',
              borderColor: hoveredId === mode.id ? mode.color : 'var(--race-border)',
              boxShadow: hoveredId === mode.id
                ? `0 12px 40px ${mode.color}30, inset 0 0 30px ${mode.color}08`
                : 'none',
            }}
          >
            {/* Tag */}
            <span style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              background: `${mode.color}20`,
              color: mode.color,
              border: `1px solid ${mode.color}40`,
              padding: '3px 10px',
              borderRadius: '2px',
            }}>{mode.tag}</span>

            {/* Icon */}
            <div style={{
              fontSize: '3rem',
              margin: '1.5rem 0 1rem',
              filter: hoveredId === mode.id ? `drop-shadow(0 0 12px ${mode.color})` : 'none',
              transition: 'filter 0.3s ease',
              transform: hoveredId === mode.id ? 'scale(1.15)' : 'scale(1)',
            }}>{mode.icon}</div>

            {/* Title */}
            <h3 style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: '2rem',
              letterSpacing: '0.05em',
              lineHeight: 1,
              color: 'white',
            }}>
              {mode.title}<br />
              <span style={{ color: mode.color, fontSize: '1.5rem' }}>{mode.subtitle}</span>
            </h3>

            {/* Description */}
            <p style={{
              fontFamily: "'Barlow', sans-serif",
              fontWeight: 300,
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.5)',
              marginTop: '0.8rem',
              lineHeight: 1.6,
            }}>{mode.description}</p>

            {/* Difficulty */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.1em',
              }}>DIFFICULTY</span>
              <span style={{
                fontFamily: "'Bebas Neue', cursive",
                fontSize: '0.9rem',
                letterSpacing: '0.15em',
                color: DIFF_COLORS[mode.difficulty] || '#E14B57',
                textShadow: `0 0 8px ${DIFF_COLORS[mode.difficulty] || '#E14B57'}60`,
              }}>{mode.difficulty}</span>
            </div>

            {/* Hover CTA */}
            {hoveredId === mode.id && (
              <div style={{
                marginTop: '1rem',
                padding: '10px',
                background: `${mode.color}15`,
                border: `1px solid ${mode.color}30`,
                borderRadius: '4px',
                textAlign: 'center',
                fontFamily: "'Bebas Neue', cursive",
                fontSize: '1rem',
                letterSpacing: '0.15em',
                color: mode.color,
                animation: 'dashIn 0.3s ease forwards',
              }}>
                ENTER → 
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default GameModeCard;
