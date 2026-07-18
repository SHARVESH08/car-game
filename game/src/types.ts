export type Mode = 'classic' | 'silhouette' | 'detail' | 'speed';

export interface Label {
  idx: number;
  name: string;
  make: string;
  model: string;
  year: number;
}

export interface TopPrediction extends Label {
  prob: number;
}

export interface RevealResponse {
  truth: Label;
  human: { level: 'model' | 'make' | 'wrong'; points: number };
  ai: {
    level: 'model' | 'make' | 'wrong';
    points: number;
    top5: TopPrediction[];
    is_confident: boolean;
  };
}

export interface PredictResponse {
  top5: TopPrediction[];
  max_prob: number;
  entropy: number;
  is_confident: boolean;
  message: string | null;
}

export interface Session {
  human: number;
  ai: number;
  rounds: number;
  streak: number;
  bestStreak: number;
}
