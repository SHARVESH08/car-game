import React from 'react';
import { GiProcessor } from 'react-icons/gi';
import type { TopPrediction } from '../utils/api';

interface Props {
  top5: TopPrediction[];
  isConfident: boolean;
  message?: string | null;
}

/** The CV model's answer: top guess + confidence, then the full top-5.
    Honest by design — refuses to bluff on out-of-distribution images. */
const AiPanel: React.FC<Props> = ({ top5, isConfident, message }) => (
  <div className="ai-panel anim-slide-up" style={{ animationFillMode: 'forwards' }}>
    <div className="ai-panel-title">
      <GiProcessor /> AI PREDICTION
      {!isConfident && <span className="ood-badge">NOT CONFIDENT</span>}
    </div>
    {!isConfident && (
      <p className="ood-message">
        {message ?? "Not confident — this doesn't look like one of the 196 cars I trained on. Best guesses:"}
      </p>
    )}
    {top5.length > 0 && isConfident && (
      <div className="ai-top-guess">
        <span className="ai-top-name">{top5[0].name}</span>
        <span className="conf-badge">{(top5[0].prob * 100).toFixed(1)}% CONFIDENT</span>
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

export default AiPanel;
