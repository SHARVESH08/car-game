import numpy as np
from PIL import Image

from api.inference import DEFAULT_META, entropy, is_confident, preprocess, softmax


def test_softmax_sums_to_one_and_orders():
    logits = np.array([1.0, 3.0, 2.0])
    p = softmax(logits)
    assert abs(p.sum() - 1.0) < 1e-9
    assert p.argmax() == 1


def test_temperature_flattens_distribution():
    logits = np.array([5.0, 0.0, 0.0])
    sharp = softmax(logits, temperature=1.0)
    flat = softmax(logits, temperature=3.0)
    assert flat.max() < sharp.max()
    assert entropy(flat) > entropy(sharp)


def test_entropy_bounds():
    n = 196
    uniform = np.full(n, 1.0 / n)
    onehot = np.zeros(n)
    onehot[0] = 1.0
    assert entropy(onehot) < 1e-6
    assert abs(entropy(uniform) - np.log(n)) < 1e-6


def test_ood_guard_refuses_uncertain():
    meta = {"ood_max_prob": 0.35, "ood_entropy": 2.5}
    assert is_confident(0.9, 0.5, meta)
    assert not is_confident(0.2, 0.5, meta)     # low confidence
    assert not is_confident(0.9, 3.0, meta)     # high entropy
    assert not is_confident(0.1, 5.0, meta)     # both


def test_default_meta_has_thresholds():
    assert {"temperature", "ood_max_prob", "ood_entropy"} <= DEFAULT_META.keys()


def test_preprocess_shape_and_range():
    img = Image.new("RGB", (640, 480), (128, 128, 128))
    x = preprocess(img)
    assert x.shape == (1, 3, 224, 224)
    assert x.dtype == np.float32
    # gray 0.5 normalized stays within a few std of 0
    assert np.all(np.abs(x) < 3)


def test_preprocess_handles_tall_and_tiny_images():
    assert preprocess(Image.new("RGB", (300, 900))).shape == (1, 3, 224, 224)
    assert preprocess(Image.new("L", (50, 40))).shape == (1, 3, 224, 224)
