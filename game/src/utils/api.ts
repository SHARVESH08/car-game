// Same interface the original VehicleIQ frontend used (axios-style {data}
// responses), backed by the FastAPI inference server + localStorage.
// No account server exists: auth is local-only, leaderboard mixes demo rows
// with the local player's real stats.

export const API_URL: string =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8000';

async function http<T>(path: string, init?: RequestInit): Promise<{ data: T }> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw { response: { data: { message: detail.detail ?? `HTTP ${res.status}` } } };
  }
  return { data: (await res.json()) as T };
}

// ---------- types ----------

export interface Round {
  id: string;
  imageUrl: string;
  hints: string[];
}

export interface TopPrediction {
  idx: number;
  name: string;
  make: string;
  model: string;
  year: number;
  prob: number;
}

export interface RevealResult {
  truth: { name: string; make: string; model: string; year: number };
  human: { level: 'model' | 'make' | 'wrong'; correct: boolean };
  ai: {
    level: 'model' | 'make' | 'wrong';
    points: number;
    top5: TopPrediction[];
    is_confident: boolean;
  };
}

export interface PredictResult {
  top5: TopPrediction[];
  is_confident: boolean;
  message: string | null;
}

// ---------- local session/stat storage ----------

interface HistoryEntry {
  mode: string;
  correct: boolean;
  points: number;
  streak: number;
  ts: number;
}

const HISTORY_KEY = 'vehicleiq_history';

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function recordResult(mode: string, correct: boolean, points: number, streak: number) {
  const history = loadHistory();
  history.push({ mode, correct, points, streak, ts: Date.now() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-500)));
}

function computeStats() {
  const history = loadHistory();
  const games = history.length;
  const correct = history.filter((h) => h.correct).length;
  const totalScore = history.reduce((s, h) => s + h.points, 0);
  const bestStreak = history.reduce((m, h) => Math.max(m, h.streak), 0);
  const perMode = (mode: string) => {
    const rows = history.filter((h) => h.mode === mode);
    const hit = rows.filter((h) => h.correct).length;
    return {
      accuracy: rows.length ? Math.round((100 * hit) / rows.length) : 0,
      games: rows.length,
    };
  };
  return {
    totalScore,
    accuracy: games ? Math.round((1000 * correct) / games) / 10 : 0,
    gamesPlayed: games,
    rank: Math.max(1, 43 - Math.floor(totalScore / 2500)),
    bestStreak,
    modeStats: {
      silhouette: perMode('silhouette'),
      detail: perMode('detail'),
      sound: perMode('sound'),
      speed: perMode('speed'),
    },
  };
}

// ---------- auth (local-only; no account server) ----------

export const authAPI = {
  login: async (email: string, password: string) => {
    if (!email.includes('@') || password.length < 4) {
      throw { response: { data: { message: 'Invalid email or password (min 4 chars)' } } };
    }
    const username = email.split('@')[0].toUpperCase().slice(0, 14);
    return { data: { token: 'local', user: { id: 'local', username, email, totalScore: 0, rank: 42 } } };
  },
  register: async (username: string, email: string, password: string) => {
    if (!username.trim()) throw { response: { data: { message: 'Username required' } } };
    if (!email.includes('@') || password.length < 4) {
      throw { response: { data: { message: 'Invalid email or password (min 4 chars)' } } };
    }
    return { data: { token: 'local', user: { id: 'local', username: username.toUpperCase(), email, totalScore: 0, rank: 42 } } };
  },
};

// ---------- game ----------

export const gameAPI = {
  getRound: async (): Promise<{ data: Round }> => {
    const r = await http<{ round_id: string; image_url: string; hints: string[] }>(
      '/round', { method: 'POST' },
    );
    return {
      data: {
        id: r.data.round_id,
        imageUrl: `${API_URL}${r.data.image_url}`,
        hints: r.data.hints,
      },
    };
  },

  submitAnswer: (roundId: string, answer: string, mode: string, timedOut = false) =>
    http<RevealResult>(`/round/${roundId}/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer, mode, timed_out: timedOut }),
    }),

  predictUpload: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return http<PredictResult>('/predict', { method: 'POST', body });
  },

  // Honest leaderboard: only real local players — the grid starts empty.
  getLeaderboard: async () => {
    const me = computeStats();
    const user = JSON.parse(localStorage.getItem('vehicleiq_user') ?? 'null');
    const rows =
      me.gamesPlayed > 0
        ? [{
            rank: 1,
            username: user?.username ?? 'GUEST DRIVER',
            totalScore: me.totalScore,
            accuracy: me.accuracy,
            gamesPlayed: me.gamesPlayed,
          }]
        : [];
    return { data: { leaderboard: rows } };
  },

  getUserStats: async () => ({ data: computeStats() }),
};

export default { authAPI, gameAPI };
