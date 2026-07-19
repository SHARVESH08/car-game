import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gameAPI, recordResult, type Round, type RevealResult } from '../utils/api';
import { GiSpeedometer } from 'react-icons/gi';
import { FiClock, FiTarget, FiZap } from 'react-icons/fi';
import AiPanel from './AiPanel';

const MODE_TITLES: Record<string, string> = {
  silhouette: 'SILHOUETTE MODE',
  detail: 'DETAIL MODE',
  sound: 'SOUND MODE',
  speed: 'SPEED ROUND',
};

const roundSeconds = (mode: string) => (mode === 'speed' ? 12 : 30);

const GameScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode') || 'silhouette';
  const totalSeconds = roundSeconds(mode);

  const [round, setRound] = useState<Round | null>(null);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [showScore, setShowScore] = useState<{ value: number; id: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);

  const fetchRound = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    submittingRef.current = false;
    setLoading(true);
    setFeedback(null);
    setReveal(null);
    setError(null);
    setAnswer('');
    setHintsUsed(0);
    setZoomOrigin(`${20 + Math.random() * 60}% ${20 + Math.random() * 60}%`);
    try {
      const res = await gameAPI.getRound();
      setRound(res.data);
    } catch (err: any) {
      setRound(null);
      setError(err?.response?.data?.message || 'Cannot reach the pit wall (API offline?)');
    }
    setLoading(false);
    setTimeLeft(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (mode === 'sound') return;
    fetchRound();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [mode, fetchRound]);

  const finishRound = useCallback(async (timedOut: boolean, typed: string) => {
    if (!round || submittingRef.current) return;
    submittingRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const res = await gameAPI.submitAnswer(round.id, typed, mode, timedOut);
      const result = res.data;
      setReveal(result);
      if (result.human.correct && !timedOut) {
        const pts = Math.max(100, Math.round(1000 * (timeLeft / totalSeconds) - hintsUsed * 100));
        setScore((s) => s + pts);
        setStreak((s) => s + 1);
        setFeedback('correct');
        setShowScore({ value: pts, id: Date.now() });
        recordResult(mode, true, pts, streak + 1);
        setTimeout(() => setShowScore(null), 1500);
      } else {
        setStreak(0);
        setFeedback('wrong');
        recordResult(mode, false, 0, 0);
      }
    } catch (err: any) {
      submittingRef.current = false;
      setError(err?.response?.data?.message || 'Submit failed — try again');
    }
  }, [round, mode, timeLeft, totalSeconds, hintsUsed, streak]);

  useEffect(() => {
    if (!round || feedback || mode === 'sound') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          finishRound(true, '');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [round, feedback, mode, finishRound]);

  if (mode === 'sound') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem',
      }}>
        <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '3rem', letterSpacing: '0.15em', color: '#FF0020' }}>
          ENGINE SOUND MODE
        </h2>
        <p style={{ fontFamily: "'Share Tech Mono', monospace", color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>
          COMING SOON — NO ENGINE-AUDIO DATASET IN THE GARAGE YET
        </p>
        <button className="btn-race" onClick={() => navigate('/')}
          style={{ padding: '14px 32px', fontSize: '1.1rem', fontFamily: "'Bebas Neue', cursive", letterSpacing: '0.1em', borderRadius: '4px' }}>
          BACK TO THE GRID
        </button>
      </div>
    );
  }

  const imgFilter =
    !feedback && mode === 'silhouette'
      ? 'grayscale(1) brightness(0.45) contrast(6)'  // real photos: crush to silhouette
      : 'none';
  const imgTransform = !feedback && mode === 'detail' ? 'scale(2.8)' : 'none';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '6rem 2rem 4rem',
      position: 'relative',
    }}>
      {/* Score popup */}
      {showScore && (
        <div key={showScore.id} style={{
          position: 'fixed',
          top: '40%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: "'Bebas Neue', cursive",
          fontSize: '4rem',
          color: '#FFD700',
          textShadow: '0 0 30px rgba(255,215,0,0.6)',
          animation: 'scorePopup 0.8s ease-out forwards',
          zIndex: 200,
          pointerEvents: 'none',
        }}>
          +{showScore.value}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '800px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', cursive",
            fontSize: '1.8rem',
            letterSpacing: '0.1em',
            color: '#FF0020',
          }}>{MODE_TITLES[mode] || 'GAME MODE'}</h2>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {streak > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                fontFamily: "'Bebas Neue', cursive",
                color: '#FFD700', fontSize: '1.2rem',
                textShadow: '0 0 10px rgba(255,215,0,0.4)',
              }}>
                <FiZap /> {streak}x
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontFamily: "'Bebas Neue', cursive",
              color: 'white', fontSize: '1.5rem',
            }}>
              <GiSpeedometer color="#FF6B00" />
              {score.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Timer bar */}
        <div style={{
          height: '6px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '3px',
          marginBottom: '2rem',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            height: '100%',
            width: `${(timeLeft / totalSeconds) * 100}%`,
            background: timeLeft > totalSeconds / 3
              ? 'linear-gradient(90deg, #FF0020, #FF6B00)'
              : timeLeft > totalSeconds / 6
              ? '#FF6B00'
              : '#FF0020',
            transition: 'width 1s linear, background 0.3s ease',
            boxShadow: timeLeft <= 5 ? '0 0 12px #FF0020' : 'none',
          }} />
        </div>

        {/* Time display */}
        <div style={{
          textAlign: 'right',
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '0.8rem',
          color: timeLeft <= 5 ? '#FF0020' : 'rgba(255,255,255,0.4)',
          marginBottom: '1.5rem',
          animation: timeLeft <= 5 ? 'timerTick 0.5s ease infinite' : 'none',
          display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end',
        }}>
          <FiClock size={12} /> {timeLeft}s
        </div>

        {/* Vehicle display */}
        <div className="race-card" style={{
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '1.5rem',
          border: feedback === 'correct'
            ? '1px solid #22C55E'
            : feedback === 'wrong'
            ? '1px solid #FF0020'
            : '1px solid var(--race-border)',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          boxShadow: feedback === 'correct'
            ? '0 0 30px rgba(34,197,94,0.2)'
            : feedback === 'wrong'
            ? '0 0 30px rgba(255,0,32,0.2)'
            : 'none',
        }}>
          {loading || !round ? (
            <div style={{
              height: '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Bebas Neue', cursive",
              fontSize: '1.3rem',
              color: error ? '#FF0020' : 'rgba(255,255,255,0.2)',
              letterSpacing: '0.2em',
              padding: '0 2rem',
              textAlign: 'center',
            }}>
              {error ?? 'LOADING VEHICLE...'}
            </div>
          ) : (
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              <img
                src={round.imageUrl}
                alt="Vehicle"
                style={{
                  width: '100%',
                  height: '340px',
                  objectFit: mode === 'detail' && !feedback ? 'cover' : 'contain',
                  background: '#000',
                  filter: imgFilter,
                  transform: imgTransform,
                  transformOrigin: zoomOrigin,
                  transition: 'filter 0.5s ease, transform 0.5s ease',
                }}
              />
              {/* Mode overlay */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'rgba(0,0,0,0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '4px 12px',
                borderRadius: '2px',
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '0.65rem',
                letterSpacing: '0.2em',
                color: '#FF6B00',
              }}>
                {mode.toUpperCase()}
              </div>

              {/* Feedback overlay */}
              {feedback && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: feedback === 'correct'
                    ? 'rgba(34,197,94,0.15)'
                    : 'rgba(255,0,32,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Bebas Neue', cursive",
                  fontSize: '3rem',
                  letterSpacing: '0.2em',
                  color: feedback === 'correct' ? '#22C55E' : '#FF0020',
                  textShadow: `0 0 20px ${feedback === 'correct' ? '#22C55E' : '#FF0020'}`,
                  animation: 'dashIn 0.3s ease forwards',
                }}>
                  {feedback === 'correct' ? '✓ CORRECT' : '✗ WRONG'}
                  {reveal && (
                    <div style={{
                      position: 'absolute',
                      bottom: '1rem',
                      fontSize: '1rem',
                      color: 'rgba(255,255,255,0.85)',
                      letterSpacing: '0.08em',
                    }}>
                      {reveal.truth.name}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hints */}
        {round && !feedback && hintsUsed <= round.hints.length && (
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {round.hints.slice(0, hintsUsed).map((hint, i) => (
              <span key={i} style={{
                background: 'rgba(255,107,0,0.1)',
                border: '1px solid rgba(255,107,0,0.3)',
                padding: '4px 12px',
                borderRadius: '2px',
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '0.75rem',
                color: '#FF6B00',
              }}>{hint}</span>
            ))}
            {hintsUsed < round.hints.length && (
              <button
                onClick={() => setHintsUsed((h) => h + 1)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.4)',
                  padding: '4px 12px',
                  borderRadius: '2px',
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: '0.75rem',
                  cursor: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,107,0,0.4)';
                  e.currentTarget.style.color = '#FF6B00';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                }}
              >
                + HINT (-100 pts)
              </button>
            )}
          </div>
        )}

        {/* Answer input / next round */}
        {!feedback ? (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && answer.trim() && finishRound(false, answer)}
              placeholder="ENTER BRAND / MODEL..."
              disabled={!round}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                padding: '14px 20px',
                color: 'white',
                fontFamily: "'Bebas Neue', cursive",
                fontSize: '1.1rem',
                letterSpacing: '0.1em',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(255,0,32,0.5)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <button
              className="btn-race"
              onClick={() => answer.trim() && finishRound(false, answer)}
              disabled={!round}
              style={{
                padding: '14px 32px',
                fontSize: '1.1rem',
                fontFamily: "'Bebas Neue', cursive",
                letterSpacing: '0.1em',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: round ? 1 : 0.5,
              }}
            >
              <FiTarget size={16} />
              LOCK IN
            </button>
          </div>
        ) : (
          <>
            {/* The ML showcase: what the model saw, with its confidence */}
            {reveal && (
              <div style={{ marginBottom: '1.5rem' }}>
                <AiPanel top5={reveal.ai.top5} isConfident={reveal.ai.is_confident} />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-race"
                onClick={fetchRound}
                style={{
                  padding: '14px 40px',
                  fontSize: '1.1rem',
                  fontFamily: "'Bebas Neue', cursive",
                  letterSpacing: '0.15em',
                  borderRadius: '4px',
                }}
              >
                NEXT RACE →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameScreen;
