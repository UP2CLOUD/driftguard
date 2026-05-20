from celery import Celery

from driftguard.core.config import settings

celery_app = Celery(
    "driftguard",
    broker=settings.celery_broker_url,
    backend=settings.celery_backend_url,
    include=["driftguard.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "driftguard.worker.tasks.run_analysis": {"queue": "analysis"},
        "driftguard.worker.tasks.send_notification": {"queue": "notifications"},
    },
    broker_transport_options={
        "visibility_timeout": 900,  # 15min — tf plan can be slow
        "retry_policy": {"timeout": 5.0},
    },
    beat_schedule={},
)
