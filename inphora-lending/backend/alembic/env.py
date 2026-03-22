import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add the backend directory to sys.path
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))

# Load environmental variables
from dotenv import load_dotenv
load_dotenv(override=False)  # Container env vars (Docker Compose) take priority over any baked-in .env file

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
import models
target_metadata = models.Base.metadata

# Setting the sqlalchemy url from environment or database.py
database_url = os.getenv("DATABASE_URL")
if not database_url:
    from database import DATABASE_URL
    database_url = DATABASE_URL

if database_url:
    # Use pymysql driver if not specified
    if database_url.startswith("mysql://"):
        database_url = database_url.replace("mysql://", "mysql+pymysql://")
    # Note: We do NOT use config.set_main_option("sqlalchemy.url", database_url) here
    # because it causes configparser interpolation errors if the password contains '%'.
    # Instead, we pass database_url directly to the context and engine.

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # Use the database_url variable directly to avoid configparser interpolation errors
    url = database_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    Uses the database_url resolved from environment variables (DB_HOST, DB_NAME,
    DB_USER, DB_PASSWORD) rather than the placeholder in alembic.ini, so that
    Docker Compose per-tenant env vars are respected.
    """
    from sqlalchemy import create_engine as _create_engine

    connectable = _create_engine(database_url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
