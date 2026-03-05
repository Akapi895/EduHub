from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.message import ConversationCreate, MessageCreate, MessageOut, ConversationOut
from app.crud import message as message_crud
from app.core.dependencies import get_current_user
from app.models.user import User
from app.utils.responses import ok

router = APIRouter(prefix="/conversations", tags=["Messaging"])


def _serialize_conv(conv):
    return {
        "id": conv.id,
        "created_at": conv.created_at.isoformat(),
        "member_ids": [m.user_id for m in conv.members],
    }


@router.get("")
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    convs = message_crud.get_conversations_for_user(db, current_user.id)
    return ok(data=[_serialize_conv(c) for c in convs])


@router.post("", status_code=201)
def create_conversation(
    data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = message_crud.find_direct_conversation(db, current_user.id, data.user_id)
    if existing:
        return ok(data=_serialize_conv(existing))
    conv = message_crud.create_conversation(db, user1_id=current_user.id, user2_id=data.user_id)
    return ok(data=_serialize_conv(conv), status_code=201)


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
