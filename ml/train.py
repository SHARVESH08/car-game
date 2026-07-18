"""Fine-tune a pretrained backbone on Stanford Cars.

Two modes:
  linear_probe — freeze backbone, train only the head. Cheap baseline that
                 sets the bar before spending GPU hours.
  finetune     — full fine-tune with RandAugment, mixup, cosine LR + warmup,
                 label smoothing, AMP, early stopping.

Checkpointing: every epoch writes <out>/last.ckpt (full state: model,
optimizer, scheduler, scaler, epoch, best acc) so a Kaggle session cap never
loses a run. Resume with --resume auto. Best val model goes to <out>/best.pt.

Examples (Kaggle):
  python -m ml.train --data-root $DATA --mode linear_probe --epochs 5
  python -m ml.train --data-root $DATA --mode finetune --epochs 30 --resume auto
"""

import argparse
import csv
import math
import random
import time
from pathlib import Path

import numpy as np
import timm
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from ml.config import SEED, NUM_CLASSES, BACKBONE, IMG_SIZE
from ml.dataset import load_splits
from ml.transforms import train_transforms, eval_transforms


def set_seed(seed: int = SEED):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def build_model(backbone: str, mode: str):
    model = timm.create_model(
        backbone,
        pretrained=True,
        num_classes=NUM_CLASSES,
        drop_path_rate=0.1 if mode == "finetune" else 0.0,
    )
    if mode == "linear_probe":
        for p in model.parameters():
            p.requires_grad = False
        for p in model.get_classifier().parameters():
            p.requires_grad = True
    return model


def warmup_cosine(optimizer, warmup_epochs: int, total_epochs: int, min_factor: float = 1e-3):
    def factor(epoch):
        if epoch < warmup_epochs:
            return (epoch + 1) / warmup_epochs
        t = (epoch - warmup_epochs) / max(1, total_epochs - warmup_epochs)
        return min_factor + (1 - min_factor) * 0.5 * (1 + math.cos(math.pi * t))
    return torch.optim.lr_scheduler.LambdaLR(optimizer, factor)


def mixup_batch(x, y, alpha: float, rng: np.random.Generator):
    """Returns (mixed_x, y_a, y_b, lam). lam=1 -> unmixed."""
    lam = float(rng.beta(alpha, alpha)) if alpha > 0 else 1.0
    perm = torch.randperm(x.size(0), device=x.device)
    mixed = lam * x + (1 - lam) * x[perm]
    return mixed, y, y[perm], lam


@torch.no_grad()
def evaluate_split(model, loader, device):
    model.eval()
    correct = total = 0
    loss_sum = 0.0
    criterion = nn.CrossEntropyLoss()
    for x, y in loader:
        x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
        with torch.autocast(device_type=device.type, enabled=device.type == "cuda"):
            logits = model(x)
            loss_sum += criterion(logits, y).item() * y.size(0)
        correct += (logits.argmax(1) == y).sum().item()
        total += y.size(0)
    return loss_sum / total, 100.0 * correct / total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-root", required=True)
    ap.add_argument("--out-dir", default="runs/finetune")
    ap.add_argument("--mode", choices=["linear_probe", "finetune"], default="finetune")
    ap.add_argument("--backbone", default=BACKBONE)
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--batch-size", type=int, default=64)
    ap.add_argument("--lr", type=float, default=None, help="default: 1e-3 probe, 3e-4 finetune")
    ap.add_argument("--weight-decay", type=float, default=0.05)
    ap.add_argument("--warmup-epochs", type=int, default=2)
    ap.add_argument("--mixup-alpha", type=float, default=0.2, help="finetune only; 0 disables")
    ap.add_argument("--label-smoothing", type=float, default=0.1)
    ap.add_argument("--patience", type=int, default=6, help="early stop on val top-1")
    ap.add_argument("--num-workers", type=int, default=2)
    ap.add_argument("--resume", default=None, help="'auto' or path to last.ckpt")
    ap.add_argument("--init-from", default=None, help="best.pt to warm-start from (e.g. probe head)")
    args = ap.parse_args()

    set_seed()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    lr = args.lr or (1e-3 if args.mode == "linear_probe" else 3e-4)
    print(f"device={device} mode={args.mode} backbone={args.backbone} lr={lr}")

    train_ds, val_ds, _, classes = load_splits(
        args.data_root, train_tf=train_transforms(IMG_SIZE), eval_tf=eval_transforms(IMG_SIZE)
    )
    print(f"train={len(train_ds)} val={len(val_ds)} classes={len(classes)}")
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True,
                              num_workers=args.num_workers, pin_memory=True, drop_last=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False,
                            num_workers=args.num_workers, pin_memory=True)

    model = build_model(args.backbone, args.mode).to(device)
    if args.init_from:
        state = torch.load(args.init_from, map_location="cpu", weights_only=True)
        model.load_state_dict(state["model"] if "model" in state else state)
        print(f"warm-started from {args.init_from}")

    params = [p for p in model.parameters() if p.requires_grad]
    optimizer = torch.optim.AdamW(params, lr=lr, weight_decay=args.weight_decay)
    scheduler = warmup_cosine(optimizer, args.warmup_epochs, args.epochs)
    scaler = torch.amp.GradScaler(enabled=device.type == "cuda")
    criterion = nn.CrossEntropyLoss(label_smoothing=args.label_smoothing)
    mixup_rng = np.random.default_rng(SEED)

    start_epoch, best_acc, bad_epochs = 0, 0.0, 0
    resume_path = out / "last.ckpt" if args.resume == "auto" else args.resume
    if resume_path and Path(resume_path).exists():
        ckpt = torch.load(resume_path, map_location="cpu", weights_only=True)
        model.load_state_dict(ckpt["model"])
        optimizer.load_state_dict(ckpt["optimizer"])
        scheduler.load_state_dict(ckpt["scheduler"])
        scaler.load_state_dict(ckpt["scaler"])
        start_epoch = ckpt["epoch"] + 1
        best_acc = ckpt["best_acc"]
        bad_epochs = ckpt.get("bad_epochs", 0)
        print(f"resumed from {resume_path} at epoch {start_epoch} (best {best_acc:.2f}%)")

    history_path = out / "history.csv"
    if not history_path.exists():
        history_path.write_text("epoch,lr,train_loss,train_acc,val_loss,val_acc,seconds\n")

    use_mixup = args.mode == "finetune" and args.mixup_alpha > 0
    for epoch in range(start_epoch, args.epochs):
        model.train()
        t0 = time.time()
        cur_lr = optimizer.param_groups[0]["lr"]
        loss_sum = correct = total = 0
        for x, y in train_loader:
            x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            with torch.autocast(device_type=device.type, enabled=device.type == "cuda"):
                if use_mixup:
                    mx, ya, yb, lam = mixup_batch(x, y, args.mixup_alpha, mixup_rng)
                    logits = model(mx)
                    loss = lam * criterion(logits, ya) + (1 - lam) * criterion(logits, yb)
                else:
                    logits = model(x)
                    loss = criterion(logits, y)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(params, 5.0)
            scaler.step(optimizer)
            scaler.update()
            loss_sum += loss.item() * y.size(0)
            correct += (logits.argmax(1) == y).sum().item()  # approximate under mixup
            total += y.size(0)
        scheduler.step()

        train_loss, train_acc = loss_sum / total, 100.0 * correct / total
        val_loss, val_acc = evaluate_split(model, val_loader, device)
        secs = time.time() - t0
        print(f"epoch {epoch+1}/{args.epochs} lr={cur_lr:.2e} "
              f"train {train_loss:.3f}/{train_acc:.1f}% val {val_loss:.3f}/{val_acc:.2f}% "
              f"({secs:.0f}s)")
        with history_path.open("a") as f:
            csv.writer(f).writerow([epoch + 1, f"{cur_lr:.2e}", f"{train_loss:.4f}",
                                    f"{train_acc:.2f}", f"{val_loss:.4f}", f"{val_acc:.2f}",
                                    f"{secs:.0f}"])

        if val_acc > best_acc:
            best_acc, bad_epochs = val_acc, 0
            torch.save({"model": model.state_dict(), "backbone": args.backbone,
                        "classes": classes, "val_acc": val_acc, "epoch": epoch},
                       out / "best.pt")
            print(f"  new best ({val_acc:.2f}%) -> {out/'best.pt'}")
        else:
            bad_epochs += 1

        torch.save({"model": model.state_dict(), "optimizer": optimizer.state_dict(),
                    "scheduler": scheduler.state_dict(), "scaler": scaler.state_dict(),
                    "epoch": epoch, "best_acc": best_acc, "bad_epochs": bad_epochs,
                    "backbone": args.backbone}, out / "last.ckpt")

        if bad_epochs >= args.patience:
            print(f"early stop: no val improvement in {args.patience} epochs")
            break

    print(f"done. best val top-1: {best_acc:.2f}%  (test metrics come from ml/evaluate.py only)")


if __name__ == "__main__":
    main()
