from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

connect_args = settings.database_connect_args

# Use a larger connection pool for PostgreSQL
pool_kwargs = {}
if not settings.normalized_database_url.startswith("sqlite"):
    pool_kwargs = {"pool_size": 10, "max_overflow": 20, "pool_pre_ping": True}

engine = create_engine(
    settings.normalized_database_url,
    connect_args=connect_args,
    echo=settings.debug,
    **pool_kwargs,
)

# Enable SQLite foreign key enforcement so ON DELETE CASCADE works
if settings.normalized_database_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency: yields a DB session and ensures it's closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
