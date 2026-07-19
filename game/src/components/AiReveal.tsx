import type { TopPrediction } from '../types';

interface Props {
  top5: TopPrediction[];
  isConfident: boolean;
  notConfidentMessage?: string | null;
}

/** The AI's answer: top-5 with confidence bars. Honest when unsure. */
export default function AiReveal({ top5, isConfident, notConfidentMessage }: Props) {
  return (
    <div className="ai-reveal">
      <div className="ai-reveal-title">
        AI PREDICTION
        {!isConfident && <span className="ood-badge">NOT CONFIDENT</span>}
      </div>
      {!isConfident && (
        <p className="ood-message">
          {notConfidentMessage ??
            "Not confident — this doesn't look like one of the 196 cars I was trained on. Best guesses:"}
        </p>
      )}
      {top5.length > 0 && isConfident && (
        <div className="ai-top-guess">
          <span className="ai-top-name">{top5[0].name}</span>
          <span className="conf-badge">{(top5[0].prob * 100).toFixed(1)}% confident</span>
        </div>
      )}
      {top5.map((p, i) => (
        <div className="pred-row" key={p.idx ?? i}>
          <span className="pred-rank">{i + 1}</span>
          <span className="pred-name">{p.name}</span>
          <div className="pred-bar-track">
            <div className="pred-bar" style={{ width: `${Math.max(p.prob * 100, 1.2)}%` }} />
          </div>
          <span className="pred-prob">{(p.prob * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}
