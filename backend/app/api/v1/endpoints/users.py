from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.user import UserPublic, UserUpdate
from app.schemas.auth import PasswordChangeRequest
from app.crud import user as user_crud
from app.core.dependencies import get_current_user
from app.core.security import verify_password
from app.models.user import User
from app.utils.responses import ok

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return ok(
        data=UserPublic.model_validate(current_user).model_dump(),
        message="Lay profile thanh cong",
    )


@router.put("/profile")
def update_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = user_crud.update(db, user=current_user, data=data)
    return ok(
        data=UserPublic.model_validate(updated).model_dump(),
        message="Cap nhat profile thanh cong",
    )


@router.put("/password")
def change_password(
    data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mat khau hien tai khong dung",
        )
    user_crud.change_password(db, user=current_user, new_password=data.new_password)
    return ok(message="Doi mat khau thanh cong")
