"""OpenTelemetry tracing bootstrap.

Sentry lives in driftguard.services.analytics. This module owns distributed
tracing only. init_telemetry is a graceful no-op unless an OTLP endpoint is set.
"""

from __future__ import annotations

import structlog

from driftguard.core.config import settings

log = structlog.get_logger(__name__)


def init_telemetry(app) -> None:
    if not settings.otel_exporter_otlp_endpoint:
        log.info("otel.disabled", reason="no_endpoint")
        return

    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    resource = Resource.create(
        {
            "service.name": settings.otel_service_name,
            "deployment.environment": settings.environment,
            "service.version": settings.release or "dev",
        }
    )
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=f"{settings.otel_exporter_otlp_endpoint}/v1/traces"))
    )
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)

    try:
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

        HTTPXClientInstrumentor().instrument()
    except Exception as exc:  # noqa: BLE001
        log.debug("otel.httpx.skip", error=str(exc))

    try:
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

        from driftguard.core.db import engine

        SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)
    except Exception as exc:  # noqa: BLE001
        log.debug("otel.sqlalchemy.skip", error=str(exc))

    log.info("otel.enabled", endpoint=settings.otel_exporter_otlp_endpoint)
