import json

import pytest
from PIL import Image

from api.inference import Prediction
from api.rounds import RoundStore

LABELS = [
    {"idx": 0, "name": "Ferrari 458 Italia Coupe 2012", "make": "Ferrari",
     "model": "458 Italia Coupe", "year": 2012},
    {"idx": 1, "name": "BMW M3 Coupe 2012", "make": "BMW", "model": "M3 Coupe", "year": 2012},
]


class FakePredictor:
    """Deterministic stand-in for the ONNX predictor."""

    def __init__(self, confident=True, top1_idx=0):
        self.confident = confident
        self.top1_idx = top1_idx

    def predict(self, image):
        top1 = {**LABELS[self.top1_idx], "prob": 0.91 if self.confident else 0.12}
        other = {**LABELS[1 - self.top1_idx], "prob": 0.05}
        return Prediction(top5=[top1, other], max_prob=top1["prob"],
                          entropy=0.4 if self.confident else 4.2,
                          is_confident=self.confident)


@pytest.fixture
def game_env(tmp_path):
    """Fake data root with two test images + manifest + labels."""
    img_dir = tmp_path / "stanford_cars" / "cars_test"
    img_dir.mkdir(parents=True)
    manifest = []
    for i, color in enumerate([(200, 30, 30), (30, 30, 200)]):
        p = img_dir / f"{i:05d}.jpg"
        Image.new("RGB", (320, 240), color).save(p)
        manifest.append({"path": f"stanford_cars/cars_test/{i:05d}.jpg", "class_idx": i})
    manifest_path = tmp_path / "test_manifest.json"
    manifest_path.write_text(json.dumps(manifest))
    labels_path = tmp_path / "labels.json"
    labels_path.write_text(json.dumps(LABELS))
    return {
        "data_root": tmp_path,
        "manifest_path": manifest_path,
        "labels_path": labels_path,
        "round_store": RoundStore(str(tmp_path), str(manifest_path), LABELS, seed=7),
    }
