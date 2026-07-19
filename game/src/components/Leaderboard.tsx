import React, { useEffect, useState } from 'react';
import { gameAPI } from '../utils/api';
import { GiPodium } from 'react-icons/gi';

interface LeaderEntry {
  rank: number;
  username: string;
  totalScore: number;
  accuracy: number;
  gamesPlayed: number;
}

const RANK_COLORS: Record<number, string> = { 1: '#E7C979', 2: '#C0C0C0', 3: '#CD7F32' };

const Leaderboard: React.FC = () => {
  const [data, setData] = useState<LeaderEntry[]>([]);

  useEffect(() => {
    gameAPI.getLeaderboard()
      .then((res) => setData(res.data.leaderboard))
      .catch(() => setData([]));
  }, []);

  return (
    <section style={{ padding: '5rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <span style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '0.75rem',
          color: '#EF8A4C',
          letterSpacing: '0.3em',
          display: 'block',
          marginBottom: '0.5rem',
        }}>GLOBAL STANDINGS</span>
        <h2 style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 'clamp(2.5rem, 6vw, 5rem)',
          color: 'white',
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}>
          <GiPodium color="#E7C979" />
          LEADERBOARD
        </h2>
        <div style={{
          width: '60px',
          height: '3px',
          background: 'linear-gradient(90deg, #E7C979, #EF8A4C)',
          margin: '1rem auto 0',
          borderRadius: '2px',
        }} />
      </div>

      {/* Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '48px 1fr 120px 100px 80px',
          gap: '1rem',
          padding: '0.5rem 1.5rem',
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          color: 'rgba(255,255,255,0.3)',
        }}>
          <span>#</span>
          <span>DRIVER</span>
          <span style={{ textAlign: 'right' }}>SCORE</span>
          <span style={{ textAlign: 'right' }}>ACCURACY</span>
          <span style={{ textAlign: 'right' }}>RACES</span>
        </div>

        {data.length === 0 && (
          <div className="race-card" style={{
            borderRadius: '6px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '0.8rem',
            letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.35)',
          }}>
            NO DRIVERS ON THE GRID YET — PLAY A ROUND TO CLAIM P1
          </div>
        )}

        {data.map((entry, i) => (
          <div
            key={entry.rank}
            className={`race-card anim-slide-up`}
            style={{
              borderRadius: '6px',
              padding: '1rem 1.5rem',
              display: 'grid',
              gridTemplateColumns: '48px 1fr 120px 100px 80px',
              gap: '1rem',
              alignItems: 'center',
              opacity: 0,
              animationDelay: `${i * 0.08}s`,
              animationFillMode: 'forwards',
              borderColor: entry.rank <= 3 ? `${RANK_COLORS[entry.rank]}30` : undefined,
              background: entry.rank === 1
                ? 'linear-gradient(135deg, rgba(231,201,121,0.05), rgba(15,15,26,1))'
                : 'var(--race-card)',
            }}
          >
            {/* Rank */}
            <span style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: entry.rank <= 3 ? '1.5rem' : '1.1rem',
              color: RANK_COLORS[entry.rank] || 'rgba(255,255,255,0.3)',
              textShadow: entry.rank <= 3 ? `0 0 12px ${RANK_COLORS[entry.rank]}60` : 'none',
            }}>
              {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
            </span>

            {/* Username */}
            <div>
              <span style={{
                fontFamily: "'Bebas Neue', cursive",
                fontSize: '1.1rem',
                color: 'white',
                letterSpacing: '0.05em',
              }}>{entry.username}</span>
            </div>

            {/* Score */}
            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '1rem',
                color: entry.rank <= 3 ? RANK_COLORS[entry.rank] : '#EF8A4C',
                textShadow: entry.rank <= 3 ? `0 0 8px ${RANK_COLORS[entry.rank]}50` : 'none',
              }}>{entry.totalScore.toLocaleString()}</span>
            </div>

            {/* Accuracy */}
            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '0.85rem',
                color: entry.accuracy >= 90 ? '#22C55E' : 'rgba(255,255,255,0.5)',
              }}>{entry.accuracy}%</span>
            </div>

            {/* Games */}
            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.3)',
              }}>{entry.gamesPlayed}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Leaderboard;
