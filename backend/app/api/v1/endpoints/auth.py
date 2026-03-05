from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.user import UserPublic
from app.services import auth_service
from app.core.dependencies import get_current_user
from app.models.user import User
from app.utils.responses import ok

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    user = auth_service.register(db, data)
    return ok(
        data={"user": UserPublic.model_validate(user).model_dump()},
        message="Dang ky thanh cong",
        status_code=201,
    )


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    result = auth_service.login(db, data)
    return ok(
        data={
            "access_token": result["access_token"],
            "user": result["user"].model_dump(),
        },
        message="Dang nhap thanh cong",
    )


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return ok(
        data=UserPublic.model_validate(current_user).model_dump(),
        message="Lay thong tin thanh cong",
    )


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return ok(message="Dang xuat thanh cong")
