import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_URL, newRound, reveal } from '../api';
import type { Label, Mode, RevealResponse } from '../types';
import AiReveal from './AiReveal';
import SearchableSelect from './SearchableSelect';

const SPEED_SECONDS = 10;

const MODE_HINT: Record<Mode, string> = {
  classic: 'Full image, no timer. Base points.',
  silhouette: 'Crushed to a silhouette — the AI sees the full image, you get 1.5×.',
  detail: 'Zoomed way in — the AI sees the full image, you get 1.5×.',
  speed: `${SPEED_SECONDS}s on the clock. 2× points.`,
};

interface Props {
  mode: Mode;
  labels: Label[];
  streak: number;
  onRoundEnd: (r: RevealResponse) => void;
}

export default function RoundView({ mode, labels, streak, onRoundEnd }: Props) {
  const [roundId, setRoundId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [make, setMake] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [result, setResult] = useState<RevealResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(SPEED_SECONDS);
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealingRef = useRef(false);

  const makes = useMemo(
    () => [...new Set(labels.map((l) => l.make))].sort(),
    [labels],
  );
  const models = useMemo(
    () =>
      make
        ? [...new Set(labels.filter((l) => l.make === make).map((l) => l.model))].sort()
        : [],
    [labels, make],
  );

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const loadRound = useCallback(async () => {
    stopTimer();
    revealingRef.current = false;
    setResult(null);
    setError(null);
    setMake(null);
    setModel(null);
    setRoundId(null);
    setImageUrl(null);
    setTimeLeft(SPEED_SECONDS);
    setZoomOrigin(`${20 + Math.random() * 60}% ${20 + Math.random() * 60}%`);
    try {
      const r = await newRound();
      setRoundId(r.round_id);
      setImageUrl(`${API_URL}${r.image_url}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    loadRound();
    return stopTimer;
  }, [loadRound, mode]);

  const doReveal = useCallback(
    async (timedOut: boolean) => {
      if (!roundId || revealingRef.current) return;
      revealingRef.current = true;
      stopTimer();
      try {
        const r = await reveal(roundId, {
          make,
          model,
          mode,
          streak,
          timed_out: timedOut,
        });
        setResult(r);
        onRoundEnd(r);
      } catch (e) {
        revealingRef.current = false;
        setError((e as Error).message);
      }
    },
    [roundId, make, model, mode, streak, onRoundEnd],
  );

  // speed-mode countdown starts once the image is up
  useEffect(() => {
    if (mode !== 'speed' || !imageUrl || result) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          doReveal(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return stopTimer;
  }, [mode, imageUrl, result, doReveal]);

  const imgStyle: React.CSSProperties = result
    ? {}
    : mode === 'silhouette'
      ? { filter: 'grayscale(1) brightness(0.45) contrast(6)' }
      : mode === 'detail'
        ? { transform: 'scale(2.8)', transformOrigin: zoomOrigin }
        : {};

  return (
    <div className="round">
      <div className="mode-hint">{MODE_HINT[mode]}</div>

      {mode === 'speed' && !result && (
        <div className="timer-track">
          <div
            className={`timer-fill ${timeLeft <= 3 ? 'danger' : ''}`}
            style={{ width: `${(timeLeft / SPEED_SECONDS) * 100}%` }}
          />
        </div>
      )}

      <div className={`photo-frame ${result ? (result.human.points > 0 ? 'won' : 'lost') : ''}`}>
        {imageUrl ? (
          <img src={imageUrl} alt="mystery car" style={imgStyle} />
        ) : (
          <div className="photo-loading">{error ?? 'LOADING VEHICLE…'}</div>
        )}
        {result && (
          <div className="truth-banner">
            <span className={`verdict ${result.human.level}`}>
              {result.human.level === 'model'
                ? '✓ EXACT'
                : result.human.level === 'make'
                  ? '◐ MAKE ONLY'
                  : '✗ WRONG'}
            </span>
            <span className="truth-name">{result.truth.name}</span>
          </div>
        )}
      </div>

      {!result ? (
        <div className="guess-bar">
          <SearchableSelect
            placeholder="MAKE…"
            options={makes}
            value={make}
            onChange={(v) => {
              setMake(v);
              setModel(null);
            }}
          />
          <SearchableSelect
            placeholder={make ? 'MODEL…' : 'PICK MAKE FIRST'}
            options={models}
            value={model}
            onChange={setModel}
            disabled={!make}
          />
          <button className="btn" disabled={!make || !roundId} onClick={() => doReveal(false)}>
            LOCK IN
          </button>
        </div>
      ) : (
        <>
          <div className="points-row">
            <div className="points you">
              YOU <strong>+{result.human.points}</strong>
            </div>
            <div className="points ai">
              AI <strong>+{result.ai.points}</strong>
              <span className="ai-level">
                {result.ai.level === 'model' ? 'exact' : result.ai.level === 'make' ? 'make only' : 'wrong'}
              </span>
            </div>
          </div>
          <AiReveal top5={result.ai.top5} isConfident={result.ai.is_confident} />
          <button className="btn next" onClick={loadRound}>
            NEXT ROUND →
          </button>
        </>
      )}
      {error && result === null && imageUrl && <div className="error">{error}</div>}
    </div>
  );
}
