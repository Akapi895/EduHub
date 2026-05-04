import logging
from sqlalchemy import text, inspect
from app.db.base import Base
from app.db.session import SessionLocal, engine
# Explicit model imports to register them with SQLAlchemy metadata
from app.models.user import User  # noqa: F401
from app.models.class_model import Class, ClassStudent, Chapter, ClassMaterial  # noqa: F401
from app.models.material import Material, Folder, MaterialView  # noqa: F401
from app.models.content_package import (  # noqa: F401
    ContentPackage,
    ContentPackageAccessRule,
    ContentPackageAssignment,
    ContentPackagePublication,
    ExamPackageConfig,
    GamePackageConfig,
)
from app.models.question_bank import (  # noqa: F401
    QuestionBank,
    QuestionBankItem,
    QuestionItemAsset,
    QuestionItemMatchingLeftItem,
    QuestionItemMatchingRightItem,
    QuestionItemOption,
    QuestionItemTextAcceptedAnswer,
    QuestionItemTextConfig,
    QuestionItemTextKeyword,
)
from app.models.package_attempt import (  # noqa: F401
    GameLeaderboardEntry,
    PackageAttempt,
    PackageQuestionAttempt,
    QuestionAttemptMatchingAnswer,
    QuestionAttemptSelectedOption,
    QuestionAttemptTextAnswer,
    QuestionAttemptUploadedAsset,
)
from app.models.game_module import GameModule, GameModuleTriggerMapping, GameRuntimeEvent  # noqa: F401
from app.models.game_card import GameCardPair  # noqa: F401
from app.models.message import Conversation, ConversationMember, Message  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.interactive_book import (  # noqa: F401
    InteractiveBook,
    InteractiveBookAttempt,
    InteractiveBookEvent,
)
from app.services.game_seed_service import ensure_default_game_modules

logger = logging.getLogger(__name__)


def _add_column_if_missing(conn, table: str, column: str, col_type: str, default=None):
    inspector = inspect(conn)
    cols = [c["name"] for c in inspector.get_columns(table)]
    if column not in cols:
        default_clause = f" DEFAULT {default}" if default is not None else ""
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}{default_clause}"))
        logger.info("Added missing column %s.%s", table, column)


def _migrate(conn):
    """Add any missing columns for schema evolution."""
    _add_column_if_missing(conn, "library_materials", "shared_by", "VARCHAR")
    _add_column_if_missing(conn, "library_materials", "source_id", "VARCHAR")


def create_tables(*, run_legacy_migrations: bool = False) -> None:
    """Dev bootstrap helper: create all known tables from SQLAlchemy metadata."""
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        ensure_default_game_modules(db)
    if run_legacy_migrations:
        with engine.connect() as conn:
            _migrate(conn)
            conn.commit()
    logger.info("Database tables are ready.")


if __name__ == "__main__":
    create_tables(run_legacy_migrations=True)
