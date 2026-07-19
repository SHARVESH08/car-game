import React, { useRef, useState } from 'react';
import { GiCarWheel } from 'react-icons/gi';
import AiPanel from '../components/AiPanel';
import { gameAPI, type PredictResult } from '../utils/api';

/** AI SCAN — upload any car photo and let the fine-tuned model identify it.
    Trained on 2013-era Stanford Cars; honest "not confident" on anything else. */
const Scan: React.FC = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const res = await gameAPI.predictUpload(file);
      setResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Scan failed');
    }
    setBusy(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '8rem 2rem 4rem',
      maxWidth: '760px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '0.75rem',
          color: '#EF8A4C',
          letterSpacing: '0.3em',
          display: 'block',
          marginBottom: '0.5rem',
        }}>SHOW ME YOUR RIDE</span>
        <h2 style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          color: 'white',
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
        }}>
          <GiCarWheel color="#E14B57" />
          AI SCAN
        </h2>
        <p style={{
          fontFamily: "'Barlow', sans-serif",
          fontWeight: 300,
          color: 'rgba(255,255,255,0.5)',
          marginTop: '0.6rem',
          fontSize: '0.95rem',
        }}>
          Upload any car photo — the model calls make &amp; model with its confidence.
          Trained on 2013-era cars (196 classes); newer metal gets an honest "not confident".
        </p>
      </div>

      <div
        className="race-card"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        style={{
          borderRadius: '8px',
          borderStyle: 'dashed',
          minHeight: '240px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'none',
          overflow: 'hidden',
        }}
      >
        {preview ? (
          <img src={preview} alt="upload preview"
               style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain' }} />
        ) : (
          <span style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '0.8rem',
            letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.35)',
          }}>
            DROP A PHOTO / CLICK TO BROWSE
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {busy && (
        <div style={{
          textAlign: 'center',
          fontFamily: "'Bebas Neue', cursive",
          fontSize: '1.3rem',
          letterSpacing: '0.25em',
          color: 'rgba(255,255,255,0.4)',
        }}>
          ANALYZING…
        </div>
      )}
      {error && (
        <div style={{
          padding: '10px',
          background: 'rgba(225,75,87,0.1)',
          border: '1px solid rgba(225,75,87,0.3)',
          borderRadius: '4px',
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '0.75rem',
          color: '#EF8A4C',
        }}>⚠ {error}</div>
      )}
      {result && (
        <AiPanel top5={result.top5} isConfident={result.is_confident} message={result.message} />
      )}
    </div>
  );
};

export default Scan;
