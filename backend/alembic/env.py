from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

from app.core.config import settings
from app.db.base import Base

# Import all models so they are registered with Base.metadata
from app.models.user import User  # noqa: F401
from app.models.class_model import Class, ClassStudent, Chapter, ClassMaterial  # noqa: F401
from app.models.material import Material, Folder, MaterialView  # noqa: F401
from app.models.exam import Exam  # noqa: F401
from app.models.question import Question, QuestionOption, MatchingPair  # noqa: F401
from app.models.submission import Submission, Answer, AnswerOption  # noqa: F401
from app.models.message import Conversation, ConversationMember, Message  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.interactive_book import (  # noqa: F401
    InteractiveBook,
    InteractiveBookAttempt,
    InteractiveBookEvent,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override sqlalchemy.url with the value from app settings
config.set_main_option("sqlalchemy.url", settings.normalized_database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
