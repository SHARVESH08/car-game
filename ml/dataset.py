"""Stanford Cars data access.

The original Stanford download URLs are dead; use the torchvision-compatible
Kaggle mirror `rickyyyyyyy/torchvision-stanford-cars` (see README). After
download, `data_root` must contain `stanford_cars/` with cars_train/,
cars_test/, devkit/ and cars_test_annos_withlabels.mat, loaded via
`StanfordCars(root=data_root, download=False)` (requires scipy).

Split policy (hard constraint — made once, seeded, before any training):
  - official test split (8,041 images) is FROZEN: evaluation + game only
  - validation = stratified 10% of the official train split, seed 42

Run as a script to emit the files the API needs:
    python -m ml.dataset --data-root <path> [--out-dir api]
writes classes.json (ml/), test_manifest.json and labels.json (api/).
"""

import argparse
import json
import random
from collections import defaultdict
from pathlib import Path

from torch.utils.data import Subset
from torchvision.datasets import StanfordCars

from ml.config import SEED, VAL_FRACTION, parse_class_name


def stratified_split(samples, val_fraction: float = VAL_FRACTION, seed: int = SEED):
    """samples: list of (path, target). Returns (train_idx, val_idx), deterministic."""
    by_class = defaultdict(list)
    for i, (_, target) in enumerate(samples):
        by_class[target].append(i)
    rng = random.Random(seed)
    train_idx, val_idx = [], []
    for target in sorted(by_class):
        idxs = sorted(by_class[target])
        rng.shuffle(idxs)
        n_val = max(1, round(len(idxs) * val_fraction))
        val_idx.extend(idxs[:n_val])
        train_idx.extend(idxs[n_val:])
    return sorted(train_idx), sorted(val_idx)


def load_splits(data_root, train_tf=None, eval_tf=None):
    """Returns (train, val, test, classes). val uses eval transforms."""
    train_aug = StanfordCars(root=data_root, split="train", download=False, transform=train_tf)
    train_eval = StanfordCars(root=data_root, split="train", download=False, transform=eval_tf)
    test = StanfordCars(root=data_root, split="test", download=False, transform=eval_tf)
    train_idx, val_idx = stratified_split(train_aug._samples)
    return (
        Subset(train_aug, train_idx),
        Subset(train_eval, val_idx),
        test,
        train_aug.classes,
    )


def write_metadata(data_root: str, out_dir: str = "api"):
    """Emit classes.json, api/labels.json and api/test_manifest.json."""
    data_root = Path(data_root)
    out_dir = Path(out_dir)
    test = StanfordCars(root=str(data_root), split="test", download=False)
    classes = test.classes

    Path("ml/classes.json").write_text(json.dumps(classes, indent=1))

    labels = [dict(idx=i, **parse_class_name(name)) for i, name in enumerate(classes)]
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "labels.json").write_text(json.dumps(labels, indent=1))

    manifest = [
        {"path": str(Path(p).relative_to(data_root)).replace("\\", "/"), "class_idx": t}
        for p, t in test._samples
    ]
    (out_dir / "test_manifest.json").write_text(json.dumps(manifest))
    print(f"classes: {len(classes)}  test images: {len(manifest)}")
    print(f"wrote ml/classes.json, {out_dir}/labels.json, {out_dir}/test_manifest.json")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-root", required=True, help="dir containing stanford_cars/")
    ap.add_argument("--out-dir", default="api")
    args = ap.parse_args()
    write_metadata(args.data_root, args.out_dir)
