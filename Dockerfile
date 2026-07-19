# CPU inference API. Build context = repo root.
# model.onnx is not in git: run `python artifacts/download_model.py` (or train)
# BEFORE building, so the model gets baked into the image.
FROM python:3.12-slim

WORKDIR /app

COPY api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY artifacts/model.onnx artifacts/checksums.json artifacts/
COPY api/ api/

# rounds need the dataset mounted at /data (see docker-compose.yml);
# /predict (upload mode) works without it
ENV DATA_ROOT=/data

EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
