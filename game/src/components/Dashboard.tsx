import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { gameAPI } from '../utils/api';
import { FiTarget, FiAward, FiTrendingUp } from 'react-icons/fi';
import { GiRaceCar, GiSpeedometer } from 'react-icons/gi';

interface Stats {
  totalScore: number;
  accuracy: number;
  gamesPlayed: number;
  rank: number;
  bestStreak: number;
  modeStats: {
    silhouette: { accuracy: number; games: number };
    detail: { accuracy: number; games: number };
    sound: { accuracy: number; games: number };
    speed: { accuracy: number; games: number };
  };
}

const DEMO_STATS: Stats = {
  totalScore: 32400,
  accuracy: 87.3,
  gamesPlayed: 124,
  rank: 42,
  bestStreak: 14,
  modeStats: {
    silhouette: { accuracy: 82, games: 44 },
    detail: { accuracy: 79, games: 38 },
    sound: { accuracy: 71, games: 22 },
    speed: { accuracy: 91, games: 20 },
  },
};

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; delay?: number }> = ({ label, value, icon, color, delay = 0 }) => (
  <div className={`race-card anim-slide-up`} style={{
    borderRadius: '8px',
    padding: '1.5rem',
    textAlign: 'center',
    opacity: 0,
    animationDelay: `${delay}s`,
    animationFillMode: 'forwards',
  }}>
    <div style={{
      fontSize: '1.5rem',
      color,
      marginBottom: '0.5rem',
      filter: `drop-shadow(0 0 8px ${color}60)`,
    }}>{icon}</div>
    <div style={{
      fontFamily: "'Bebas Neue', cursive",
      fontSize: '2.5rem',
      color: 'white',
      letterSpacing: '0.02em',
      lineHeight: 1,
    }}>{value}</div>
    <div style={{
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '0.65rem',
      color: 'rgba(255,255,255,0.35)',
      letterSpacing: '0.2em',
      marginTop: '0.3rem',
    }}>{label}</div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>(DEMO_STATS);

  useEffect(() => {
    gameAPI.getUserStats()
      .then((res) => setStats(res.data))
      .catch(() => setStats(DEMO_STATS));
  }, []);

  return (
    <div style={{ padding: '6rem 2rem 4rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Profile header */}
      <div className="anim-dash-in" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: '3rem',
        padding: '2rem',
        background: 'rgba(225,75,87,0.04)',
        border: '1px solid rgba(225,75,87,0.15)',
        borderRadius: '8px',
        opacity: 0,
        animationFillMode: 'forwards',
      }}>
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #E14B57, #EF8A4C)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          boxShadow: '0 0 20px rgba(225,75,87,0.3)',
        }}>
          <GiRaceCar />
        </div>
        <div>
          <div style={{
            fontFamily: "'Bebas Neue', cursive",
            fontSize: '2rem',
            color: 'white',
            letterSpacing: '0.05em',
          }}>{user?.username || 'GUEST DRIVER'}</div>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '0.7rem',
            color: '#EF8A4C',
            letterSpacing: '0.15em',
          }}>RANK #{stats.rank} · SEASON 2026</div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '3rem',
      }}>
        <StatCard label="TOTAL SCORE" value={stats.totalScore.toLocaleString()} icon={<GiSpeedometer />} color="#E14B57" delay={0.1} />
        <StatCard label="ACCURACY" value={`${stats.accuracy}%`} icon={<FiTarget />} color="#EF8A4C" delay={0.2} />
        <StatCard label="RACES" value={stats.gamesPlayed} icon={<GiRaceCar />} color="#E7C979" delay={0.3} />
        <StatCard label="GLOBAL RANK" value={`#${stats.rank}`} icon={<FiAward />} color="#8B5CF6" delay={0.4} />
        <StatCard label="BEST STREAK" value={stats.bestStreak} icon={<FiTrendingUp />} color="#22C55E" delay={0.5} />
      </div>

      {/* Mode breakdown */}
      <div className="race-card anim-slide-up" style={{
        borderRadius: '8px',
        padding: '2rem',
        opacity: 0,
        animationDelay: '0.5s',
        animationFillMode: 'forwards',
      }}>
        <h3 style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: '1.5rem',
          letterSpacing: '0.1em',
          marginBottom: '1.5rem',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ color: '#E14B57' }}>◆</span> MODE BREAKDOWN
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Object.entries(stats.modeStats).map(([mode, s]) => (
            <div key={mode}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
                fontFamily: "'Bebas Neue', cursive",
                fontSize: '1rem',
                letterSpacing: '0.1em',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{mode.toUpperCase()}</span>
                <span style={{ color: '#EF8A4C' }}>{s.accuracy}%</span>
              </div>
              <div style={{
                height: '6px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${s.accuracy}%`,
                  background: `linear-gradient(90deg, #E14B57, #EF8A4C)`,
                  borderRadius: '3px',
                  boxShadow: '0 0 8px rgba(239,138,76,0.4)',
                  transition: 'width 1s cubic-bezier(0.23, 1, 0.32, 1)',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
