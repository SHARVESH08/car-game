"""Train/eval transforms. Train recipe: RandomResizedCrop + RandAugment +
RandomErasing; mixup lives in the training loop (needs the batch)."""

from torchvision import transforms

from ml.config import IMG_SIZE, RESIZE_SIZE, MEAN, STD


def train_transforms(img_size: int = IMG_SIZE):
    return transforms.Compose([
        transforms.RandomResizedCrop(img_size, scale=(0.65, 1.0), ratio=(0.75, 1.333)),
        transforms.RandomHorizontalFlip(),
        transforms.RandAugment(num_ops=2, magnitude=9),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
        transforms.RandomErasing(p=0.25, scale=(0.02, 0.2)),
    ])


def eval_transforms(img_size: int = IMG_SIZE, resize: int = RESIZE_SIZE):
    return transforms.Compose([
        transforms.Resize(resize),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
    ])
