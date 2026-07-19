"""ONNX CPU inference: preprocessing, calibrated softmax, OOD guard.

The pure functions (softmax / entropy / is_confident) are separated from the
Predictor class so they are testable without a model file.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image

IMG_SIZE = 224
RESIZE_SIZE = 256
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# fallbacks if model_meta.json (written by ml/evaluate.py) is absent
DEFAULT_META = {"temperature": 1.0, "ood_max_prob": 0.35, "ood_entropy": 2.5}


def softmax(logits: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    z = logits.astype(np.float64) / temperature
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)


def entropy(probs: np.ndarray) -> float:
    p = np.clip(probs, 1e-12, 1.0)
    return float(-(p * np.log(p)).sum())


def is_confident(max_prob: float, ent: float, meta: dict) -> bool:
    """OOD guard: refuse when top-1 prob is below or entropy above the
    thresholds calibrated on the in-distribution test set."""
    return max_prob >= meta["ood_max_prob"] and ent <= meta["ood_entropy"]


def preprocess(image: Image.Image) -> np.ndarray:
    """Resize shorter side to 256, center-crop 224, normalize. Matches
    ml/transforms.eval_transforms exactly (parity matters)."""
    image = image.convert("RGB")
    w, h = image.size
    scale = RESIZE_SIZE / min(w, h)
    image = image.resize((round(w * scale), round(h * scale)), Image.BILINEAR)
    w, h = image.size
    left, top = (w - IMG_SIZE) // 2, (h - IMG_SIZE) // 2
    image = image.crop((left, top, left + IMG_SIZE, top + IMG_SIZE))
    x = np.asarray(image, dtype=np.float32) / 255.0
    x = (x - MEAN) / STD
    return x.transpose(2, 0, 1)[None]  # NCHW


@dataclass
class Prediction:
    top5: list = field(default_factory=list)  # [{idx,name,make,model,year,prob}]
    max_prob: float = 0.0
    entropy: float = 0.0
    is_confident: bool = False


class Predictor:
    def __init__(self, onnx_path: str, labels_path: str, meta_path: str | None = None):
        import onnxruntime as ort  # imported here so tests can fake the Predictor

        # Spin-wait threads suffer a ~2s wakeup penalty on Windows after the
        # process idles (measured). Game requests arrive seconds apart, so
        # disable spinning: idle-then-predict drops from ~2s to ~0.3s.
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 4
        opts.add_session_config_entry("session.intra_op.allow_spinning", "0")
        self.session = ort.InferenceSession(str(onnx_path), opts,
                                            providers=["CPUExecutionProvider"])
        self.labels = json.loads(Path(labels_path).read_text())
        self.meta = dict(DEFAULT_META)
        if meta_path and Path(meta_path).exists():
            self.meta.update(json.loads(Path(meta_path).read_text()))

    def predict(self, image: Image.Image) -> Prediction:
        x = preprocess(image)
        logits = self.session.run(None, {"image": x})[0][0]
        probs = softmax(logits, self.meta["temperature"])
        ent = entropy(probs)
        top_idx = np.argsort(probs)[::-1][:5]
        top5 = [{**self.labels[int(i)], "prob": round(float(probs[i]), 4)} for i in top_idx]
        max_prob = float(probs[top_idx[0]])
        return Prediction(
            top5=top5,
            max_prob=max_prob,
            entropy=round(ent, 4),
            is_confident=is_confident(max_prob, ent, self.meta),
        )
