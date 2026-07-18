"""Evaluate a trained checkpoint on the FROZEN official test split.

This script is the only source of published metrics. It produces:
  ml/results/metrics.json        top-1, top-5, per-make accuracy
  ml/results/confusion_pairs.json  most-confused class pairs
  ml/results/calibration.json    ECE before/after temperature scaling, bins
  api/model_meta.json            temperature + OOD thresholds for serving

Temperature is fitted on the VALIDATION split (never test), then calibration
is measured on test. OOD thresholds are percentiles of the calibrated test
distribution: an upload scoring below them is "not confident".

    python -m ml.evaluate --data-root <path> --checkpoint runs/finetune/best.pt
"""

import argparse
import json
from collections import Counter
from pathlib import Path

import numpy as np
import timm
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader

from ml.config import NUM_CLASSES, IMG_SIZE, parse_class_name
from ml.dataset import load_splits
from ml.transforms import eval_transforms


@torch.no_grad()
def collect_logits(model, loader, device):
    model.eval()
    logits_all, labels_all = [], []
    for x, y in loader:
        x = x.to(device, non_blocking=True)
        with torch.autocast(device_type=device.type, enabled=device.type == "cuda"):
            logits_all.append(model(x).float().cpu())
        labels_all.append(y)
    return torch.cat(logits_all), torch.cat(labels_all)


def fit_temperature(logits, labels):
    """Single-parameter temperature scaling, fitted on validation NLL."""
    log_t = torch.zeros(1, requires_grad=True)
    opt = torch.optim.LBFGS([log_t], lr=0.1, max_iter=50)

    def closure():
        opt.zero_grad()
        loss = F.cross_entropy(logits / log_t.exp(), labels)
        loss.backward()
        return loss

    opt.step(closure)
    return float(log_t.exp().detach())


def expected_calibration_error(probs, labels, n_bins=15):
    conf, pred = probs.max(1)
    correct = pred.eq(labels).float()
    bins = torch.linspace(0, 1, n_bins + 1)
    ece, bin_stats = 0.0, []
    for lo, hi in zip(bins[:-1], bins[1:]):
        mask = (conf > lo) & (conf <= hi)
        if mask.sum() == 0:
            continue
        acc, avg_conf, frac = correct[mask].mean(), conf[mask].mean(), mask.float().mean()
        ece += float(frac * (avg_conf - acc).abs())
        bin_stats.append({"bin": [round(float(lo), 3), round(float(hi), 3)],
                          "count": int(mask.sum()), "accuracy": round(float(acc), 4),
                          "confidence": round(float(avg_conf), 4)})
    return ece, bin_stats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-root", required=True)
    ap.add_argument("--checkpoint", default="runs/finetune/best.pt")
    ap.add_argument("--out-dir", default="ml/results")
    ap.add_argument("--batch-size", type=int, default=64)
    ap.add_argument("--num-workers", type=int, default=2)
    args = ap.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)

    ckpt = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
    backbone = ckpt["backbone"]
    model = timm.create_model(backbone, pretrained=False, num_classes=NUM_CLASSES)
    model.load_state_dict(ckpt["model"])
    model.to(device)

    _, val_ds, test_ds, classes = load_splits(
        args.data_root, train_tf=eval_transforms(IMG_SIZE), eval_tf=eval_transforms(IMG_SIZE)
    )
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, num_workers=args.num_workers)
    test_loader = DataLoader(test_ds, batch_size=args.batch_size, num_workers=args.num_workers)

    print("collecting validation logits (temperature fit) ...")
    val_logits, val_labels = collect_logits(model, val_loader, device)
    temperature = fit_temperature(val_logits, val_labels)
    print(f"fitted temperature: {temperature:.3f}")

    print("collecting test logits ...")
    logits, labels = collect_logits(model, test_loader, device)

    # --- accuracy ---
    top5 = logits.topk(5, dim=1).indices
    top1_correct = top5[:, 0].eq(labels)
    top1 = float(top1_correct.float().mean())
    top5_acc = float(top5.eq(labels.unsqueeze(1)).any(1).float().mean())

    # --- per-make ---
    makes = [parse_class_name(c)["make"] for c in classes]
    make_hit, make_tot = Counter(), Counter()
    for pred, true, ok in zip(top5[:, 0].tolist(), labels.tolist(), top1_correct.tolist()):
        make_tot[makes[true]] += 1
        if ok:
            make_hit[makes[true]] += 1
    per_make = {m: {"accuracy": round(make_hit[m] / make_tot[m], 4), "n": make_tot[m]}
                for m in sorted(make_tot)}
    # make-level accuracy: predicted make matches true make even if model/year wrong
    make_level = float(np.mean([makes[p] == makes[t]
                                for p, t in zip(top5[:, 0].tolist(), labels.tolist())]))

    # --- confusion pairs ---
    pair_counts = Counter()
    for pred, true in zip(top5[:, 0].tolist(), labels.tolist()):
        if pred != true:
            pair_counts[(true, pred)] += 1
    confusion_pairs = [
        {"true": classes[t], "predicted": classes[p], "count": n,
         "true_n": int(labels.eq(t).sum())}
        for (t, p), n in pair_counts.most_common(25)
    ]

    # --- calibration (on calibrated probs) ---
    probs_raw = F.softmax(logits, dim=1)
    probs_cal = F.softmax(logits / temperature, dim=1)
    ece_raw, _ = expected_calibration_error(probs_raw, labels)
    ece_cal, bins = expected_calibration_error(probs_cal, labels)

    # --- OOD thresholds from calibrated in-distribution test stats ---
    max_prob = probs_cal.max(1).values.numpy()
    entropy = -(probs_cal * probs_cal.clamp_min(1e-12).log()).sum(1).numpy()
    ood_max_prob = float(np.percentile(max_prob, 5))     # below 5th pct of ID -> suspicious
    ood_entropy = float(np.percentile(entropy, 95))      # above 95th pct of ID -> suspicious

    metrics = {
        "checkpoint": str(args.checkpoint),
        "backbone": backbone,
        "test_images": int(labels.numel()),
        "top1_accuracy": round(top1, 4),
        "top5_accuracy": round(top5_acc, 4),
        "make_level_accuracy": round(make_level, 4),
        "temperature": round(temperature, 4),
        "ece_before_temperature": round(ece_raw, 4),
        "ece_after_temperature": round(ece_cal, 4),
    }
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2))
    (out / "per_make.json").write_text(json.dumps(per_make, indent=2))
    (out / "confusion_pairs.json").write_text(json.dumps(confusion_pairs, indent=2))
    (out / "calibration.json").write_text(json.dumps(
        {"ece_raw": ece_raw, "ece_calibrated": ece_cal, "bins": bins}, indent=2))

    meta = {
        "backbone": backbone,
        "img_size": IMG_SIZE,
        "temperature": round(temperature, 4),
        "ood_max_prob": round(ood_max_prob, 4),
        "ood_entropy": round(ood_entropy, 4),
        "test_top1": round(top1, 4),
        "test_top5": round(top5_acc, 4),
    }
    Path("api/model_meta.json").write_text(json.dumps(meta, indent=2))

    print("\n================ FROZEN TEST SET ================")
    print(f"images            : {labels.numel()}")
    print(f"top-1 accuracy    : {top1*100:.2f}%")
    print(f"top-5 accuracy    : {top5_acc*100:.2f}%")
    print(f"make-level acc    : {make_level*100:.2f}%")
    print(f"ECE raw -> calib  : {ece_raw:.4f} -> {ece_cal:.4f} (T={temperature:.3f})")
    print(f"OOD thresholds    : max_prob<{ood_max_prob:.3f} or entropy>{ood_entropy:.3f}")
    print("\nmost confused pairs:")
    for cp in confusion_pairs[:8]:
        print(f"  {cp['true']}  ->  {cp['predicted']}  ({cp['count']}/{cp['true_n']})")
    print(f"\nwrote {out}/  and api/model_meta.json")


if __name__ == "__main__":
    main()
