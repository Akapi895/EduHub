from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.crud import user as user_crud
from app.core.security import verify_password, create_access_token
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.user import UserPublic
from app.models.user import User


def register(db: Session, data: RegisterRequest) -> User:
    existing = user_crud.get_by_email(db, data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    return user_crud.create(
        db,
        full_name=data.full_name,
        email=data.email,
        password=data.password,
        role=data.role,
    )


def login(db: Session, data: LoginRequest) -> dict:
    user = user_crud.get_by_email(db, data.email)
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

    token = create_access_token(subject=user.id)
    return {
        "access_token": token,
        "user": UserPublic.model_validate(user),
    }
