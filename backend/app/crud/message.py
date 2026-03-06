from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.message import Conversation, ConversationMember, Message
from app.schemas.message import MessageCreate


def get_conversations_for_user(db: Session, user_id: str) -> list[Conversation]:
    memberships = db.query(ConversationMember).filter(ConversationMember.user_id == user_id).all()
    conv_ids = [m.conversation_id for m in memberships]
    return db.query(Conversation).filter(Conversation.id.in_(conv_ids)).all()


def get_unread_count(db: Session, conv_id: str, user_id: str) -> int:
    """Count unread messages in a conversation using SQL aggregate."""
    return db.query(func.count(Message.id)).filter(
        Message.conversation_id == conv_id,
        Message.sender_id != user_id,
        Message.is_read == False,
    ).scalar() or 0


def get_last_message(db: Session, conv_id: str) -> Message | None:
    """Get the last message in a conversation using SQL ORDER + LIMIT."""
    return db.query(Message).filter(
        Message.conversation_id == conv_id,
    ).order_by(Message.created_at.desc()).first()


def get_total_unread_count(db: Session, user_id: str) -> int:
    """Count total unread messages across all conversations for a user."""
    conv_ids = [m.conversation_id for m in
                db.query(ConversationMember.conversation_id).filter(
                    ConversationMember.user_id == user_id).all()]
    if not conv_ids:
        return 0
    return db.query(func.count(Message.id)).filter(
        Message.conversation_id.in_(conv_ids),
        Message.sender_id != user_id,
        Message.is_read == False,
    ).scalar() or 0


def get_conversation(db: Session, conv_id: str) -> Conversation | None:
    return db.query(Conversation).filter(Conversation.id == conv_id).first()


def find_direct_conversation(db: Session, user1_id: str, user2_id: str) -> Conversation | None:
    """Find existing 1:1 conversation between two users."""
    user1_convs = {m.conversation_id for m in db.query(ConversationMember).filter(
        ConversationMember.user_id == user1_id).all()}
    user2_convs = {m.conversation_id for m in db.query(ConversationMember).filter(
        ConversationMember.user_id == user2_id).all()}
    common = user1_convs & user2_convs
    if common:
        return db.query(Conversation).filter(Conversation.id.in_(common)).first()
    return None


def create_conversation(db: Session, *, user1_id: str, user2_id: str) -> Conversation:
    conv = Conversation()
    db.add(conv)
    db.flush()
    db.add(ConversationMember(conversation_id=conv.id, user_id=user1_id))
    db.add(ConversationMember(conversation_id=conv.id, user_id=user2_id))
    db.commit()
    db.refresh(conv)
    return conv


def get_messages(db: Session, conv_id: str) -> list[Message]:
    return db.query(Message).filter(Message.conversation_id == conv_id).order_by(Message.created_at).all()


def create_message(db: Session, *, conv_id: str, sender_id: str, data: MessageCreate) -> Message:
    msg = Message(conversation_id=conv_id, sender_id=sender_id,
                  content=data.content, file_url=data.file_url)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def mark_as_read(db: Session, *, conv_id: str, reader_id: str) -> int:
    """Mark all messages in a conversation as read (except own messages)."""
    count = db.query(Message).filter(
        Message.conversation_id == conv_id,
        Message.sender_id != reader_id,
        Message.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return count


def is_member(db: Session, *, conv_id: str, user_id: str) -> bool:
    return db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv_id,
        ConversationMember.user_id == user_id,
    ).first() is not None
