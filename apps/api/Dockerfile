# ── Stage 1: Python deps ───────────────────────────────────────────────────
FROM python:3.12-slim AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_SYSTEM_PYTHON=1

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app
COPY pyproject.toml ./
COPY alembic.ini ./
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
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh && chown -R appuser:appuser /app

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD curl -fs http://localhost:8000/api/v1/health || exit 1

EXPOSE 8000
# Run DB migrations before starting the server (start.sh applies `alembic
# upgrade head`, then exec's uvicorn). Previously the CMD invoked uvicorn
# directly, so migrations never ran on deploy and the live schema drifted
# behind the code.
CMD ["./start.sh"]
