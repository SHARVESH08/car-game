# Beat the Model — Car Detection + Guessing Game

A two-part ML showcase: a fine-tuned ConvNeXt that identifies a car's make and
model from a photo, and a web game where you compete against it. Full ML
lifecycle in one repo: **data → training → evaluation → ONNX export → CPU
serving → game**. Training runs on free Kaggle GPU; inference is CPU-only ONNX.
$0/month runtime, no LLM anywhere.

```
ml/  (train on Kaggle GPU, export ONNX)  →  api/  (FastAPI + onnxruntime CPU)  →  game/  (Vite + React)
```

## The task

Fine-grained classification on **Stanford Cars**: 196 classes of
make/model/year (e.g. *"Aston Martin V8 Vantage Convertible 2012"*), 8,144
train / 8,041 test images. Fine-grained means the hard part is separating
near-identical siblings — same car, different year, or same body across trims —
not cars from non-cars.

The original Stanford download URLs are dead
([pytorch/vision#7545](https://github.com/pytorch/vision/issues/7545)); the
pipeline uses the torchvision-compatible Kaggle mirror
[`rickyyyyyyy/torchvision-stanford-cars`](https://www.kaggle.com/datasets/rickyyyyyyy/torchvision-stanford-cars)
loaded via `StanfordCars(root, download=False)`.

## Recipe

| | |
|---|---|
| Backbone | `convnext_tiny.fb_in22k_ft_in1k` (timm) — in22k pretraining transfers better to fine-grained tasks than in1k-only; still fast on CPU at 224px |
| Baseline | linear probe (frozen backbone) — sets the bar cheaply before spending GPU hours |
| Fine-tune | full unfreeze, AdamW lr 3e-4, wd 0.05, cosine schedule + 2-epoch warmup, RandAugment, mixup α=0.2, label smoothing 0.1, drop-path 0.1, AMP, early stopping |
| Splits | official test split **frozen** before any training; val = seeded stratified 10% of official train |
| Calibration | temperature scaling fitted on val, ECE reported before/after |
| Export | ONNX opset 17 + torch↔ONNX parity check + CPU latency benchmark |

**Test-set isolation is absolute.** The split is made once, seeded
(`ml/dataset.py`, seed 42). Published metrics come only from `ml/evaluate.py`
on the frozen test set. Game rounds are served exclusively from the test
manifest — the model never replays training images.

## Results

> **PENDING** — this table is filled in from `ml/results/metrics.json` after
> the Kaggle run. Numbers below must match `python -m ml.evaluate` output
> exactly; anything else is a bug.

| Metric | Linear probe | Fine-tune |
|---|---|---|
| Top-1 accuracy | *(pending)* | *(pending)* |
| Top-5 accuracy | *(pending)* | *(pending)* |
| Make-level accuracy | — | *(pending)* |
| ECE (raw → temperature-scaled) | — | *(pending)* |
| CPU latency (ONNX, 1 image) | — | *(pending)* |

`ml/evaluate.py` also emits per-make accuracy, the most-confused class pairs
(expect same-model-different-year pairs to dominate), and reliability bins.

## Honest limitations

- **The dataset is 2013-era.** A 2024 Tesla or any modern car is
  out-of-distribution by construction. The upload mode says so instead of
  bluffing: if calibrated top-1 probability or entropy crosses thresholds set
  from the in-distribution test data (5th/95th percentiles), the API returns
  *"not confident — best guesses"* rather than a confident wrong answer.
- Classification only — no detection/segmentation, one dominant car per image
  assumed.
- Confidence shown in the game is temperature-calibrated, but calibration is
  measured in-distribution; OOD confidence is a heuristic guard, not a
  guarantee.

## Running everything

### 1. Train (Kaggle, free GPU)

Open `ml/notebook/kaggle_train.ipynb` on Kaggle (GPU + internet on), set
`REPO_URL`, run all cells. Session caps are safe: every epoch checkpoints to
`last.ckpt` and `--resume auto` picks up where it stopped. The final cell
bundles `best.pt`, `model.onnx`, metrics, and metadata into
`/kaggle/working/handoff/` for download.

Back on your machine, drop the handoff files in place:
`artifacts/model.onnx`, `api/model_meta.json`, `api/labels.json`,
`ml/results/`, `artifacts/checksums.json`.

### 2. Local data (for game rounds)

Download the same Kaggle mirror locally (only test images are served, but the
mirror ships as one bundle), then generate the manifest:

```bash
pip install -r ml/requirements.txt
python -m ml.dataset --data-root /path/to/data   # dir containing stanford_cars/
```

### 3. API

```bash
pip install -r api/requirements.txt
DATA_ROOT=/path/to/data uvicorn api.main:app --port 8000
```

Endpoints: `POST /round` → `GET /round/{id}/image` → `POST /round/{id}/reveal`
(truth stays server-side until reveal), `POST /predict` (upload mode, OOD
guard), `GET /labels`, `GET /health`.

### 4. Game

```bash
cd game && npm install && npm run dev   # http://localhost:5173
```

Modes: Classic (1×), Silhouette (1.5×), Detail zoom (1.5×), Speed round
(10s, 2×), plus upload-your-own-photo. Scoring: exact model 100, right make
40, streak bonus up to +50. The AI scores the same base points from its top-1,
no multipliers — it always sees the full image, which is why handicapped modes
pay the human more. Session-local scoreboard: you vs the model, with streaks.

Deploy: the frontend is static (`npm run build`, works on Vercel free tier)
with `VITE_API_URL` pointing at wherever the API lives.

### 5. Tests

```bash
pip install pytest httpx
python -m pytest
```

Covers scoring rules, label parsing (multi-word makes like "AM General"),
softmax/entropy/OOD-guard math, preprocessing shapes, and the full API round
flow including the OOD refusal path (ONNX predictor faked; no model file
needed).

## Model file discipline

Weights are never committed. `artifacts/checksums.json` (committed) pins the
sha256; `python artifacts/download_model.py` fetches the released
`model.onnx` and verifies it.

## Repo layout

```
ml/          dataset.py, transforms.py, train.py, evaluate.py, export_onnx.py, notebook/
api/         main.py, inference.py, scoring.py, rounds.py (+ labels.json, model_meta.json generated)
game/        Vite + React + TS frontend
artifacts/   .gitignored weights/onnx + download_model.py + checksums.json
tests/       pytest suite
NOTES.md     working memory: findings, gotchas, confusion patterns
```
