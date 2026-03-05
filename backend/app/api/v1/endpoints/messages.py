from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.message import ConversationCreate, MessageCreate, MessageOut, ConversationOut
from app.crud import message as message_crud
from app.crud import user as user_crud
from app.core.dependencies import get_current_user
from app.models.user import User
from app.utils.responses import ok

router = APIRouter(prefix="/conversations", tags=["Messaging"])


def _serialize_conv(conv, current_user_id: str, db: Session):
    """Build a conversation dict with participant info and last message."""
    other_member_ids = [m.user_id for m in conv.members if m.user_id != current_user_id]
    participant = None
    if other_member_ids:
        other_user = user_crud.get_by_id(db, other_member_ids[0])
        if other_user:
            participant = {
                "id": other_user.id,
                "full_name": other_user.full_name,
                "avatar_url": other_user.avatar_url,
                "role": other_user.role.value if hasattr(other_user.role, 'value') else other_user.role,
            }
    # Get last message
    messages = message_crud.get_messages(db, conv.id)
    last_msg = messages[-1] if messages else None
    unread = sum(1 for m in messages if not m.is_read and m.sender_id != current_user_id)
    return {
        "id": conv.id,
        "created_at": conv.created_at.isoformat(),
        "member_ids": [m.user_id for m in conv.members],
        "participant": participant,
        "last_message": last_msg.content if last_msg else None,
        "last_message_at": last_msg.created_at.isoformat() if last_msg else None,
        "unread_count": unread,
    }


@router.get("")
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    convs = message_crud.get_conversations_for_user(db, current_user.id)
    return ok(data=[_serialize_conv(c, current_user.id, db) for c in convs])


@router.post("", status_code=201)
def create_conversation(
    data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = message_crud.find_direct_conversation(db, current_user.id, data.user_id)
    if existing:
        return ok(data=_serialize_conv(existing, current_user.id, db))
    conv = message_crud.create_conversation(db, user1_id=current_user.id, user2_id=data.user_id)
    return ok(data=_serialize_conv(conv, current_user.id, db), status_code=201)


@router.get("/{conv_id}/messages")
def get_messages(
    conv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not message_crud.is_member(db, conv_id=conv_id, user_id=current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this conversation")
    messages = message_crud.get_messages(db, conv_id)
    return ok(data=[MessageOut.model_validate(m).model_dump() for m in messages])


@router.post("/{conv_id}/messages", status_code=201)
def send_message(
    conv_id: str,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not message_crud.is_member(db, conv_id=conv_id, user_id=current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this conversation")
    msg = message_crud.create_message(db, conv_id=conv_id, sender_id=current_user.id, data=data)
    return ok(data=MessageOut.model_validate(msg).model_dump(), status_code=201)
