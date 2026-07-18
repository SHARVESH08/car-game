import type { Mode, PredictResponse, RevealResponse, Label } from './types';

// Point at any deployed API without code changes: VITE_API_URL=https://... npm run build
export const API_URL: string =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8000';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const fetchLabels = () => fetch(`${API_URL}/labels`).then((r) => json<Label[]>(r));

export const newRound = () =>
  fetch(`${API_URL}/round`, { method: 'POST' }).then((r) =>
    json<{ round_id: string; image_url: string }>(r),
  );

export const reveal = (
  roundId: string,
  guess: { make: string | null; model: string | null; mode: Mode; streak: number; timed_out: boolean },
) =>
  fetch(`${API_URL}/round/${roundId}/reveal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(guess),
  }).then((r) => json<RevealResponse>(r));

export const predictUpload = (file: File) => {
  const body = new FormData();
  body.append('file', file);
  return fetch(`${API_URL}/predict`, { method: 'POST', body }).then((r) =>
    json<PredictResponse>(r),
  );
};
