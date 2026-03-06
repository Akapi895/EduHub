from sqlalchemy import text, inspect
from app.db.base import Base
from app.db.session import engine
# Explicit model imports to register them with SQLAlchemy metadata
from app.models.user import User  # noqa: F401
from app.models.class_model import Class, ClassStudent, Chapter, ClassMaterial  # noqa: F401
from app.models.material import Material, Folder  # noqa: F401
from app.models.exam import Exam  # noqa: F401
from app.models.question import Question, QuestionOption, MatchingPair  # noqa: F401
from app.models.submission import Submission, Answer, AnswerOption  # noqa: F401
from app.models.message import Conversation, ConversationMember, Message  # noqa: F401


def _add_column_if_missing(conn, table: str, column: str, col_type: str, default=None):
    inspector = inspect(conn)
    cols = [c["name"] for c in inspector.get_columns(table)]
    if column not in cols:
        default_clause = f" DEFAULT {default}" if default is not None else ""
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}{default_clause}"))
        print(f"[DB] Added column {table}.{column}")


def _migrate(conn):
    """Add any missing columns for schema evolution."""
    _add_column_if_missing(conn, "exams", "allow_review", "BOOLEAN", 1)
    _add_column_if_missing(conn, "exams", "show_answers_policy", "VARCHAR", "'never'")


def create_tables() -> None:
    """Create all database tables based on SQLAlchemy models."""
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        _migrate(conn)
        conn.commit()
    print("[DB] All tables created successfully.")


if __name__ == "__main__":
    create_tables()
