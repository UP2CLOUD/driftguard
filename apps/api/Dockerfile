# ── Stage 1: Python deps ───────────────────────────────────────────────────
FROM python:3.12-slim AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_SYSTEM_PYTHON=1

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app
COPY pyproject.toml ./
COPY driftguard ./driftguard
# Install into a virtualenv so we can copy it cleanly
RUN uv pip install --system .

# ── Stage 2: Runtime tools ─────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Minimal system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates git unzip \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid 1000 --no-create-home appuser

# Copy uv (needed for optional package installs at runtime)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Terraform
ARG TF_VERSION=1.9.8
RUN curl -fsSL "https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip" -o /tmp/tf.zip \
    && unzip -d /usr/local/bin /tmp/tf.zip \
    && rm /tmp/tf.zip \
    && terraform version

# Infracost
RUN curl -fsSL https://github.com/infracost/infracost/releases/latest/download/infracost-linux-amd64.tar.gz \
    | tar xz -C /tmp \
    && mv /tmp/infracost-linux-amd64 /usr/local/bin/infracost \
    && infracost --version

# Copy installed Python packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

WORKDIR /app
COPY --from=builder /app /app
RUN chown -R appuser:appuser /app

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fs http://localhost:8000/api/v1/health || exit 1

EXPOSE 8000
CMD ["uvicorn", "driftguard.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "2", "--timeout-keep-alive", "30"]
