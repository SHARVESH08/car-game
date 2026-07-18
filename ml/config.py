"""Shared constants for the training pipeline.

Everything that affects reproducibility lives here, in one place.
"""

SEED = 42
NUM_CLASSES = 196
IMG_SIZE = 224
RESIZE_SIZE = 256

# in22k pretraining transfers noticeably better to fine-grained tasks than
# in1k-only, and convnext_tiny stays fast enough for CPU ONNX inference.
BACKBONE = "convnext_tiny.fb_in22k_ft_in1k"

# ImageNet normalization (timm default for this backbone)
MEAN = (0.485, 0.456, 0.406)
STD = (0.229, 0.224, 0.225)

# fraction of the OFFICIAL TRAIN split held out for validation.
# The official test split is frozen and never touched during training.
VAL_FRACTION = 0.1

# Makes that are more than one word in Stanford Cars class names.
# Everything else: make = first token.
MULTI_WORD_MAKES = ("AM General", "Aston Martin", "Land Rover")


def parse_class_name(name: str) -> dict:
    """'Aston Martin V8 Vantage Convertible 2012' -> make/model/year.

    Stanford Cars class names are always '<make> <model...> <year>'.
    """
    name = name.strip()
    make = None
    for candidate in MULTI_WORD_MAKES:
        if name.startswith(candidate + " "):
            make = candidate
            break
    tokens = name.split()
    if make is None:
        make = tokens[0]
    year = int(tokens[-1])
    model = name[len(make):].rsplit(str(year), 1)[0].strip()
    return {"name": name, "make": make, "model": model, "year": year}
