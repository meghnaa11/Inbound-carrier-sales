# Pin to Python 3.9.9; change if needed
ARG PYTHON_IMAGE=python:3.9.9-slim-bullseye

# ---- Base ----
FROM ${PYTHON_IMAGE} AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 10001 appuser

# ---- Builder (make wheels) ----
FROM ${PYTHON_IMAGE} AS builder
WORKDIR /wheels
COPY requirements.txt .
RUN python -m pip install --upgrade pip \
 && pip wheel --no-cache-dir --no-deps -r requirements.txt -w /wheels \
 && rm -f requirements.txt                    # <— remove this so final glob is safe

# ---- Final ----
FROM base AS final
# install deps system-wide as root, then drop privileges
USER root
COPY --from=builder /wheels /wheels
RUN python -m pip install --upgrade pip \
 && pip install --no-cache-dir /wheels/*.whl \
 && rm -rf /wheels
# app code
COPY --chown=appuser:appuser app ./app
COPY --chown=appuser:appuser requirements.txt .
# runtime env
ENV DB_PATH=/data/data.db \
    SEED_PATH=/app/app/seed.sql \
    PORT=8000 \
    UVICORN_WORKERS=2
RUN mkdir -p /data && chown -R appuser:appuser /data /app
USER appuser
EXPOSE 8000
ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000","--workers","2"]
