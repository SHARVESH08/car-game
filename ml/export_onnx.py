"""Export best.pt to ONNX, verify torch/ONNX parity, benchmark CPU latency,
and write sha256 checksums for the release artifact.

    python -m ml.export_onnx --checkpoint runs/finetune/best.pt
"""

import argparse
import hashlib
import json
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
import timm
import torch

from ml.config import NUM_CLASSES, IMG_SIZE


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--checkpoint", default="runs/finetune/best.pt")
    ap.add_argument("--out", default="artifacts/model.onnx")
    ap.add_argument("--opset", type=int, default=17)
    args = ap.parse_args()

    ckpt = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
    model = timm.create_model(ckpt["backbone"], pretrained=False, num_classes=NUM_CLASSES)
    model.load_state_dict(ckpt["model"])
    model.eval()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    dummy = torch.randn(1, 3, IMG_SIZE, IMG_SIZE)
    torch.onnx.export(
        model, dummy, str(out),
        input_names=["image"], output_names=["logits"],
        dynamic_axes={"image": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=args.opset,
        external_data=False,  # single self-contained file (fits well under 2GB)
    )
    sidecar = out.with_suffix(".onnx.data")
    if sidecar.exists():
        raise SystemExit("export still wrote external data — model not self-contained")
    print(f"exported {out} ({out.stat().st_size / 1e6:.1f} MB)")

    # --- parity: torch vs onnxruntime on random inputs ---
    sess = ort.InferenceSession(str(out), providers=["CPUExecutionProvider"])
    rng = np.random.default_rng(0)
    max_diff, top1_match = 0.0, 0
    n_checks = 8
    for _ in range(n_checks):
        x = rng.standard_normal((1, 3, IMG_SIZE, IMG_SIZE), dtype=np.float32)
        with torch.no_grad():
            ref = model(torch.from_numpy(x)).numpy()
        got = sess.run(None, {"image": x})[0]
        max_diff = max(max_diff, float(np.abs(ref - got).max()))
        top1_match += int(ref.argmax() == got.argmax())
    assert max_diff < 1e-2, f"parity FAILED: max logit diff {max_diff}"
    assert top1_match == n_checks, "parity FAILED: top-1 mismatch"
    print(f"parity OK: max logit diff {max_diff:.2e}, top-1 match {top1_match}/{n_checks}")

    # --- CPU latency ---
    x = rng.standard_normal((1, 3, IMG_SIZE, IMG_SIZE), dtype=np.float32)
    for _ in range(3):
        sess.run(None, {"image": x})
    times = []
    for _ in range(20):
        t0 = time.perf_counter()
        sess.run(None, {"image": x})
        times.append(time.perf_counter() - t0)
    print(f"CPU latency: mean {np.mean(times)*1000:.0f} ms, p95 {np.percentile(times, 95)*1000:.0f} ms")

    sha = hashlib.sha256(out.read_bytes()).hexdigest()
    checksums_path = Path("artifacts/checksums.json")
    checksums = json.loads(checksums_path.read_text()) if checksums_path.exists() else {}
    checksums[out.name] = sha
    checksums_path.write_text(json.dumps(checksums, indent=2))
    print(f"sha256 {sha}\nwrote artifacts/checksums.json")


if __name__ == "__main__":
    main()
