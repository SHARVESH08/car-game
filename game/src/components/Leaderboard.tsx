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

const DEMO_DATA: LeaderEntry[] = [
  { rank: 1, username: 'APEX_DRIVER', totalScore: 98450, accuracy: 94.2, gamesPlayed: 312 },
  { rank: 2, username: 'TURBO_REX', totalScore: 87200, accuracy: 91.7, gamesPlayed: 289 },
  { rank: 3, username: 'NITRO_PHANTOM', totalScore: 76800, accuracy: 89.5, gamesPlayed: 256 },
  { rank: 4, username: 'REDLINE_ACE', totalScore: 65400, accuracy: 88.0, gamesPlayed: 201 },
  { rank: 5, username: 'DRIFT_KING_9', totalScore: 52100, accuracy: 85.3, gamesPlayed: 178 },
];

const RANK_COLORS: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

const Leaderboard: React.FC = () => {
  const [data, setData] = useState<LeaderEntry[]>(DEMO_DATA);

  useEffect(() => {
    gameAPI.getLeaderboard()
      .then((res) => setData(res.data.leaderboard))
      .catch(() => setData(DEMO_DATA));
  }, []);

  return (
    <section style={{ padding: '5rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <span style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '0.75rem',
          color: '#FF6B00',
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
          <GiPodium color="#FFD700" />
          LEADERBOARD
        </h2>
        <div style={{
          width: '60px',
          height: '3px',
          background: 'linear-gradient(90deg, #FFD700, #FF6B00)',
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
                ? 'linear-gradient(135deg, rgba(255,215,0,0.05), rgba(15,15,26,1))'
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
                color: entry.rank <= 3 ? RANK_COLORS[entry.rank] : '#FF6B00',
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
