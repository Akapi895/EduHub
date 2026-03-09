from sqlalchemy.orm import Session
from app.models.notification import Notification


def create(
    db: Session,
    *,
    user_id: str,
    type: str,
    title: str,
    content: str,
    link: str | None = None,
) -> Notification:
    noti = Notification(
        user_id=user_id,
        type=type,
        title=title,
        content=content,
        link=link,
    )
    db.add(noti)
    db.commit()
    db.refresh(noti)
    return noti


def create_bulk(
    db: Session,
    *,
    user_ids: list[str],
    type: str,
    title: str,
    content: str,
    link: str | None = None,
) -> list[Notification]:
    """Create the same notification for multiple users in one commit."""
    notis = []
    for uid in user_ids:
        noti = Notification(
            user_id=uid,
            type=type,
            title=title,
            content=content,
            link=link,
        )
        db.add(noti)
        notis.append(noti)
    db.commit()
    for n in notis:
        db.refresh(n)
    return notis


def get_for_user(
    db: Session,
    user_id: str,
    *,
    skip: int = 0,
    limit: int = 30,
) -> list[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_unread_count(db: Session, user_id: str) -> int:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
        .count()
    )


def mark_as_read(db: Session, notification_id: str, user_id: str) -> Notification | None:
    noti = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if noti:
        noti.is_read = True
        db.commit()
        db.refresh(noti)
    return noti


def mark_all_as_read(db: Session, user_id: str) -> int:
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
        .update({"is_read": True})
    )
    db.commit()
    return count
