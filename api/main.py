"""FastAPI serving: /round game loop, /predict upload mode, /labels.

Config via env (all optional, defaults suit local dev from repo root):
  MODEL_PATH     artifacts/model.onnx
  LABELS_PATH    api/labels.json
  META_PATH      api/model_meta.json
  DATA_ROOT      path containing stanford_cars/ (for test-set round images)
  MANIFEST_PATH  api/test_manifest.json
  GAME_ORIGINS   comma-separated CORS origins (default http://localhost:5173)

Run:  uvicorn api.main:app --port 8000
"""

import io
import json
import os
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel

from api.inference import Predictor
from api.rounds import RoundStore
from api.scoring import score_ai, score_human

NOT_CONFIDENT_MESSAGE = (
    "Not confident — this doesn't look like one of the 196 cars I was trained on. "
    "Best guesses:"
)


class GuessRequest(BaseModel):
    make: str | None = None
    model: str | None = None
    mode: str = "classic"
    streak: int = 0
    timed_out: bool = False


def create_app(predictor=None, round_store=None) -> FastAPI:
    """Factory: tests inject fakes; production lazily builds from env."""
    app = FastAPI(title="Car Model Detection API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.environ.get("GAME_ORIGINS", "http://localhost:5173").split(","),
        allow_methods=["*"],
        allow_headers=["*"],
    )
    state = {"predictor": predictor, "rounds": round_store}

    def get_predictor() -> Predictor:
        if state["predictor"] is None:
            model_path = os.environ.get("MODEL_PATH", "artifacts/model.onnx")
            if not Path(model_path).exists():
                raise HTTPException(503, f"model not found at {model_path} — "
                                         "run artifacts/download_model.py or train first")
            state["predictor"] = Predictor(
                model_path,
                os.environ.get("LABELS_PATH", "api/labels.json"),
                os.environ.get("META_PATH", "api/model_meta.json"),
            )
        return state["predictor"]

    def get_rounds() -> RoundStore:
        if state["rounds"] is None:
            data_root = os.environ.get("DATA_ROOT", "")
            manifest = os.environ.get("MANIFEST_PATH", "api/test_manifest.json")
            if not data_root or not Path(manifest).exists():
                raise HTTPException(503, "test images unavailable — set DATA_ROOT and "
                                         "generate api/test_manifest.json (python -m ml.dataset)")
            labels = json.loads(Path(os.environ.get("LABELS_PATH", "api/labels.json")).read_text())
            state["rounds"] = RoundStore(data_root, manifest, labels)
        return state["rounds"]

    @app.get("/health")
    def health():
        return {"status": "ok",
                "model_loaded": state["predictor"] is not None,
                "rounds_loaded": state["rounds"] is not None}

    @app.get("/labels")
    def labels():
        path = Path(os.environ.get("LABELS_PATH", "api/labels.json"))
        if not path.exists():
            raise HTTPException(503, "labels.json missing — run python -m ml.dataset")
        return json.loads(path.read_text())

    @app.post("/round")
    def new_round():
        return get_rounds().new_round()

    @app.get("/round/{round_id}/image")
    def round_image(round_id: str):
        path = get_rounds().image_path(round_id)
        if path is None or not path.exists():
            raise HTTPException(404, "unknown or expired round")
        return FileResponse(path, media_type="image/jpeg")

    @app.post("/round/{round_id}/reveal")
    def reveal(round_id: str, guess: GuessRequest):
        rounds = get_rounds()
        truth = rounds.truth(round_id)
        image_path = rounds.image_path(round_id)
        if truth is None or image_path is None:
            raise HTTPException(404, "unknown or expired round")
        prediction = get_predictor().predict(Image.open(image_path))
        return {
            "truth": truth,
            "human": score_human(truth, guess.make, guess.model,
                                 guess.mode, guess.streak, guess.timed_out),
            "ai": {**score_ai(truth, prediction.top5[0]),
                   "top5": prediction.top5,
                   "is_confident": prediction.is_confident},
        }

    @app.post("/predict")
    async def predict(file: UploadFile = File(...)):
        raw = await file.read()
        if len(raw) > 10 * 1024 * 1024:
            raise HTTPException(413, "image too large (max 10 MB)")
        try:
            image = Image.open(io.BytesIO(raw))
            image.load()
        except (UnidentifiedImageError, OSError):
            raise HTTPException(400, "not a readable image")
        p = get_predictor().predict(image)
        return {
            "top5": p.top5,
            "max_prob": p.max_prob,
            "entropy": p.entropy,
            "is_confident": p.is_confident,
            "message": None if p.is_confident else NOT_CONFIDENT_MESSAGE,
        }

    return app


app = create_app()
