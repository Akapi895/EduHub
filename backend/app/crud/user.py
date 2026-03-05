from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserUpdate
from app.core.security import hash_password


def get_by_id(db: Session, user_id: str) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def create(db: Session, *, full_name: str, email: str, password: str, role: str) -> User:
    user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update(db: Session, *, user: User, data: UserUpdate) -> User:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, *, user: User, new_password: str) -> User:
    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user
