import io

from fastapi.testclient import TestClient
from PIL import Image

from api.main import NOT_CONFIDENT_MESSAGE, create_app
from tests.conftest import FakePredictor


def make_client(game_env, predictor=None):
    app = create_app(predictor=predictor or FakePredictor(),
                     round_store=game_env["round_store"])
    return TestClient(app)


def upload_bytes():
    buf = io.BytesIO()
    Image.new("RGB", (400, 300), (90, 90, 90)).save(buf, format="JPEG")
    return buf.getvalue()


def test_health(game_env):
    r = make_client(game_env).get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_round_flow_reveal_scores_both_sides(game_env):
    client = make_client(game_env, FakePredictor(confident=True, top1_idx=0))
    round_id = client.post("/round").json()["round_id"]

    img = client.get(f"/round/{round_id}/image")
    assert img.status_code == 200
    assert img.headers["content-type"] == "image/jpeg"

    r = client.post(f"/round/{round_id}/reveal",
                    json={"make": "Ferrari", "model": "458 Italia Coupe",
                          "mode": "classic", "streak": 2})
    assert r.status_code == 200
    body = r.json()
    assert body["truth"]["name"] in ("Ferrari 458 Italia Coupe 2012", "BMW M3 Coupe 2012")
    assert body["human"]["level"] in ("model", "make", "wrong")
    assert len(body["ai"]["top5"]) == 2
    assert isinstance(body["ai"]["points"], int)
    # truth is never exposed before reveal
    assert "truth" not in client.post("/round").json()


def test_reveal_unknown_round_404(game_env):
    r = make_client(game_env).post("/round/deadbeef/reveal", json={"make": "x", "model": "y"})
    assert r.status_code == 404


def test_upload_predict_confident(game_env):
    client = make_client(game_env, FakePredictor(confident=True))
    r = client.post("/predict", files={"file": ("car.jpg", upload_bytes(), "image/jpeg")})
    assert r.status_code == 200
    body = r.json()
    assert body["is_confident"] is True
    assert body["message"] is None
    assert body["top5"][0]["prob"] > 0.5


def test_upload_predict_ood_refusal(game_env):
    """A non-car / OOD image must produce the honest refusal message."""
    client = make_client(game_env, FakePredictor(confident=False))
    r = client.post("/predict", files={"file": ("cat.jpg", upload_bytes(), "image/jpeg")})
    body = r.json()
    assert body["is_confident"] is False
    assert body["message"] == NOT_CONFIDENT_MESSAGE


def test_upload_rejects_non_image(game_env):
    client = make_client(game_env)
    r = client.post("/predict", files={"file": ("x.jpg", b"this is not an image", "image/jpeg")})
    assert r.status_code == 400
