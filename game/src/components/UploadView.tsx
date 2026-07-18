import { useRef, useState } from 'react';
import { predictUpload } from '../api';
import type { PredictResponse } from '../types';
import AiReveal from './AiReveal';

/** Upload-your-own-photo mode. The model refuses to bluff on OOD images. */
export default function UploadView() {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      setResult(await predictUpload(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="round">
      <div className="mode-hint">
        Upload any car photo. Trained on 2013-era cars (Stanford Cars, 196 classes) — newer
        models and non-cars get an honest "not confident".
      </div>

      <div
        className="dropzone"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        {preview ? (
          <img src={preview} alt="upload preview" />
        ) : (
          <span>DROP A PHOTO / CLICK TO BROWSE</span>
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

      {busy && <div className="photo-loading">ANALYZING…</div>}
      {error && <div className="error">{error}</div>}
      {result && (
        <AiReveal
          top5={result.top5}
          isConfident={result.is_confident}
          notConfidentMessage={result.message}
        />
      )}
    </div>
  );
}
