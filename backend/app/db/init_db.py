from app.db.base import Base
from app.db.session import engine
# Explicit model imports to register them with SQLAlchemy metadata
from app.models.user import User  # noqa: F401
from app.models.class_model import Class, ClassStudent, Chapter, ClassMaterial  # noqa: F401
from app.models.material import Material  # noqa: F401
from app.models.exam import Exam  # noqa: F401
from app.models.question import Question, QuestionOption, MatchingPair  # noqa: F401
from app.models.submission import Submission, Answer, AnswerOption  # noqa: F401
from app.models.message import Conversation, ConversationMember, Message  # noqa: F401


def create_tables() -> None:
    """Create all database tables based on SQLAlchemy models."""
    Base.metadata.create_all(bind=engine)
    print("[DB] All tables created successfully.")


if __name__ == "__main__":
    create_tables()
