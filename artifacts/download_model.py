"""Download the released ONNX model and verify its sha256 against
artifacts/checksums.json (committed; the model file itself never is).

    python artifacts/download_model.py
"""

import hashlib
import json
import sys
import urllib.request
from pathlib import Path

# set after publishing a GitHub release with model.onnx attached
RELEASE_URL = "https://github.com/YOUR_USERNAME/car-game/releases/download/v1.0/model.onnx"

HERE = Path(__file__).parent
TARGET = HERE / "model.onnx"


def main():
    checksums = json.loads((HERE / "checksums.json").read_text())
    expected = checksums["model.onnx"]

    if TARGET.exists():
        actual = hashlib.sha256(TARGET.read_bytes()).hexdigest()
        if actual == expected:
            print(f"model.onnx already present and verified ({actual[:12]}...)")
            return
        print("existing model.onnx fails checksum — re-downloading")

    print(f"downloading {RELEASE_URL} ...")
    urllib.request.urlretrieve(RELEASE_URL, TARGET)
    actual = hashlib.sha256(TARGET.read_bytes()).hexdigest()
    if actual != expected:
        TARGET.unlink()
        sys.exit(f"CHECKSUM MISMATCH: expected {expected}, got {actual} — file removed")
    print(f"ok: {TARGET} ({TARGET.stat().st_size / 1e6:.1f} MB, sha256 {actual[:12]}...)")


if __name__ == "__main__":
    main()
