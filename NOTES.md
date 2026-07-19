# NOTES — working memory

## Data
- Original Stanford Cars URLs are dead (pytorch/vision#7545). Using Kaggle
  mirror `rickyyyyyyy/torchvision-stanford-cars` — torchvision-compatible
  layout, load with `StanfordCars(root, download=False)`. Needs `scipy` for
  the .mat annotation files.
- Split policy: official test (8,041) frozen forever; val = stratified 10% of
  official train, seed 42, made in `ml/dataset.py` before any training.
- Class name parsing: `<make> <model...> <year>`. Multi-word makes are exactly
  AM General, Aston Martin, Land Rover. "Rolls-Royce" and "smart" are single
  tokens. "Ram C/V Cargo Van Minivan 2012" has a slash in the model — don't
  use class names as file paths.

## Training
- Backbone `convnext_tiny.fb_in22k_ft_in1k`: in22k pretraining chosen for
  fine-grained transfer; ~28M params, CPU-friendly at 224.
- Train-acc under mixup is approximate (compared against unmixed labels) —
  trust val only.
- Kaggle batch-run gotchas (cost two wasted runs): (1) the API assigns a P100
  by default, and current torch builds dropped Pascal support -> instant
  "CUDA error: no kernel image is available" — pin
  `"machine_shape": "NvidiaTeslaT4"` in kernel-metadata.json. (2) `!`-prefixed
  notebook commands don't stop the run on failure, and the batch .log comes
  back empty — tee every stage's output to files under /kaggle/working/logs/
  or failures are undiagnosable.
- Checkpoint every epoch (`last.ckpt`, full optimizer/scheduler/scaler state);
  `--resume auto` survives Kaggle session caps. Kaggle `/kaggle/working` is
  NOT persisted unless you save a notebook version — download `runs/` before
  a session dies mid-training.
- Run results (Kaggle T4, 2026-07-19): probe 57.36% val after 5 epochs
  (~50s/epoch); fine-tune best val 91.24% at epoch 19, early-stopped at 25
  (~54s/epoch — far faster than the 2-4h estimate). Test top-1 90.55%.
- Train-acc looks low (~50%) in logs — that's the mixup effect, not a bug.

## Evaluation
- Temperature fitted on val (never test); ECE reported raw vs scaled.
- Fitted T=0.679 (<1): mixup + label smoothing made the model UNDERconfident;
  calibration sharpens. ECE 0.124 -> 0.021. OOD thresholds from calibrated
  test dist: max_prob<0.523 or entropy>1.789. Verified: pure-noise image ->
  max_prob 0.137, refused.
- OOD thresholds = 5th percentile of calibrated max-prob / 95th percentile of
  entropy on in-distribution test. Heuristic, not a guarantee — revisit with a
  real OOD sample set (e.g. random ImageNet images) if uploads misbehave.
- (fill in after run: top confusion pairs — expect same-model-different-year)

## Export / serving
- ONNX opset 17, dynamic batch. Parity gate: max logit diff < 1e-2 and top-1
  must match on 8 random inputs. Actual: 1.6e-05, 8/8. CPU latency 74ms mean.
- onnxruntime on Windows: the default spin-wait intra-op pool has a ~2s wakeup
  penalty after the process idles a few seconds (measured: 50ms back-to-back,
  2.0-2.5s after any 2s+ idle). Game traffic is inherently idle-gapped ->
  `session.intra_op.allow_spinning=0` + 4 threads: idle-predict ~0.3-0.5s.
  Benchmarks that only measure back-to-back loops (like export_onnx's 74ms)
  hide this completely.
- torch>=2.9 gotchas: torch.onnx.export needs `onnxscript` installed (Kaggle
  export cell died on this — exported locally instead); new exporter writes
  weights to a `model.onnx.data` sidecar unless `external_data=False`; on
  Windows its ✅-emoji progress prints crash cp1252 consoles — run with
  PYTHONUTF8=1.
- `api/inference.preprocess` must mirror `ml/transforms.eval_transforms`
  (resize-256 shorter side → center-crop 224 → imagenet norm). PIL BILINEAR vs
  torchvision default interpolation is a known tiny mismatch source — if
  parity-on-real-images ever looks off, check interpolation first.

## Docker
- Image = python:3.12-slim + api/ + model baked in. Rounds need the dataset
  volume at /data; /predict works without it.
- Docker Desktop on Windows: right after `docker run`, the port-forward proxy
  intermittently returns 500s that NEVER appear in uvicorn's access log —
  it's the proxy, not the app (20/20 clean once settled). Doesn't exist on
  Linux hosts.

## v2 dataset (modern cars) — research notes
- Car-1000 (arXiv 2503.12385) verified real: github.com/toggle1995/Car-1000,
  Google Drive download available. 140k images, 1000 models, 166 makers,
  through ~2024 (nothing public is labeled through 2026). Source is Chinese
  forum DongCheDi — FIRST CHECK whether class_info.json names are English.
  Fallback: DVM-CAR (public, UK market, <=2020, CC BY-NC, 300x300 images).
- Merge plan: unified make/model/year labels.json, dedupe near-identical
  classes across sources, per-source frozen test sets (publish Stanford and
  modern numbers separately), weighted sampler for imbalance.

## Game
- True silhouette (`brightness(0)`) only works on white-background renders —
  on real photos it's a black rectangle. Silhouette mode instead uses
  `grayscale(1) brightness(0.45) contrast(6)`, which crushes photos to
  near-silhouette. Tune if too easy/hard.
- AI always sees the full image; handicapped modes (silhouette/detail 1.5×,
  speed 2×) pay the human more instead. Stated in the round-view hint.
- Truth label never leaves the server before /reveal — devtools can't spoil.
