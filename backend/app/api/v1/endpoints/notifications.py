from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.notification import NotificationOut
from app.crud import notification as noti_crud
from app.core.dependencies import get_current_user
from app.models.user import User
from app.utils.responses import ok

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = noti_crud.get_for_user(db, current_user.id, skip=skip, limit=limit)
    return ok(data=[NotificationOut.model_validate(n).model_dump() for n in items])


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = noti_crud.get_unread_count(db, current_user.id)
    return ok(data={"total": count})


@router.put("/{notification_id}/read")
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    noti = noti_crud.mark_as_read(db, notification_id, current_user.id)
    if not noti:
        raise HTTPException(status_code=404, detail="Notification not found")
    return ok(data=NotificationOut.model_validate(noti).model_dump())


@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = noti_crud.mark_all_as_read(db, current_user.id)
    return ok(message=f"Đã đánh dấu {count} thông báo đã đọc")
