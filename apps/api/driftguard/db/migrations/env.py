import asyncio
import os as _os
from logging.config import fileConfig

from alembic import context
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from driftguard.core.config import settings
from driftguard.db.models import Base

config = context.config

# Use DATABASE_URL env var if set (Render injects it); fall back to settings.
_raw_url = _os.environ.get("DATABASE_URL") or _os.environ.get("database_url") or settings.database_url
# Keep asyncpg driver — env.py uses async_engine_from_config; psycopg2 not installed
_async_url = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1) if "asyncpg" not in _raw_url else _raw_url
config.set_main_option("sqlalchemy.url", _async_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
