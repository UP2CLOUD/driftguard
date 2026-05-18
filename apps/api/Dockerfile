FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_SYSTEM_PYTHON=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates git unzip \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid 1000 --no-create-home appuser

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ARG TF_VERSION=1.9.8
RUN curl -fsSL "https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip" -o /tmp/tf.zip \
    && unzip -d /usr/local/bin /tmp/tf.zip \
    && rm /tmp/tf.zip \
    && terraform version

RUN curl -fsSL https://github.com/infracost/infracost/releases/latest/download/infracost-linux-amd64.tar.gz \
    | tar xz -C /tmp \
    && mv /tmp/infracost-linux-amd64 /usr/local/bin/infracost \
    && infracost --version

WORKDIR /app
COPY pyproject.toml ./
COPY driftguard ./driftguard
RUN uv pip install --system . \
    && chown -R appuser:appuser /app

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fs http://localhost:8000/api/v1/health || exit 1

EXPOSE 8000
CMD ["uvicorn", "driftguard.main:app", "--host", "0.0.0.0", "--port", "8000"]
