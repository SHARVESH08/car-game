import { useCallback, useEffect, useState } from 'react';
import { fetchLabels } from './api';
import RoundView from './components/RoundView';
import UploadView from './components/UploadView';
import type { Label, Mode, RevealResponse, Session } from './types';

const MODES: { id: Mode; title: string; blurb: string; mult: string }[] = [
  { id: 'classic', title: 'CLASSIC', blurb: 'Full photo, no pressure', mult: '1×' },
  { id: 'silhouette', title: 'SILHOUETTE', blurb: 'Shapes only', mult: '1.5×' },
  { id: 'detail', title: 'DETAIL', blurb: 'Extreme zoom-in', mult: '1.5×' },
  { id: 'speed', title: 'SPEED ROUND', blurb: '10 seconds. Go.', mult: '2×' },
];

const FRESH: Session = { human: 0, ai: 0, rounds: 0, streak: 0, bestStreak: 0 };

export default function App() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [labelsError, setLabelsError] = useState<string | null>(null);
  const [screen, setScreen] = useState<'menu' | Mode | 'upload'>('menu');
  const [session, setSession] = useState<Session>(FRESH);

  useEffect(() => {
    fetchLabels()
      .then(setLabels)
      .catch((e) => setLabelsError((e as Error).message));
  }, []);

  const onRoundEnd = useCallback((r: RevealResponse) => {
    setSession((s) => {
      const streak = r.human.points > 0 ? s.streak + 1 : 0;
      return {
        human: s.human + r.human.points,
        ai: s.ai + r.ai.points,
        rounds: s.rounds + 1,
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
      };
    });
  }, []);

  const leader =
    session.rounds === 0 ? null : session.human >= session.ai ? 'you' : 'ai';

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setScreen('menu')}>
          BEAT<span>THE</span>MODEL
        </button>
        <div className="scoreboard">
          <div className={`score-chip ${leader === 'you' ? 'leading' : ''}`}>
            YOU <strong>{session.human.toLocaleString()}</strong>
          </div>
          <div className="score-vs">VS</div>
          <div className={`score-chip ${leader === 'ai' ? 'leading' : ''}`}>
            AI <strong>{session.ai.toLocaleString()}</strong>
          </div>
          {session.streak > 1 && <div className="streak-chip">⚡{session.streak}×</div>}
        </div>
      </header>

      {screen === 'menu' && (
        <main className="menu">
          <h1>
            CAN YOU BEAT A<br />
            <em>FINE-TUNED CONVNEXT?</em>
          </h1>
          <p className="sub">
            196 car models. You guess first, then the AI answers with its confidence.
            {session.rounds > 0 &&
              ` · ${session.rounds} rounds played · best streak ${session.bestStreak}`}
          </p>
          {labelsError && (
            <div className="error big">
              API unreachable: {labelsError} — start it with{' '}
              <code>uvicorn api.main:app --port 8000</code>
            </div>
          )}
          <div className="mode-grid">
            {MODES.map((m) => (
              <button key={m.id} className="mode-card" onClick={() => setScreen(m.id)}>
                <span className="mode-mult">{m.mult}</span>
                <span className="mode-title">{m.title}</span>
                <span className="mode-blurb">{m.blurb}</span>
              </button>
            ))}
            <button className="mode-card upload" onClick={() => setScreen('upload')}>
              <span className="mode-mult">∞</span>
              <span className="mode-title">YOUR PHOTO</span>
              <span className="mode-blurb">Upload a car, test the model</span>
            </button>
          </div>
        </main>
      )}

      {screen !== 'menu' && (
        <main className="play">
          <button className="back" onClick={() => setScreen('menu')}>
            ← MODES
          </button>
          {screen === 'upload' ? (
            <UploadView />
          ) : (
            <RoundView mode={screen} labels={labels} streak={session.streak} onRoundEnd={onRoundEnd} />
          )}
        </main>
      )}
    </div>
  );
}
