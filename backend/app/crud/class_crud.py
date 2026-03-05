import random
import string
from sqlalchemy.orm import Session
from app.models.class_model import Class, ClassStudent, Chapter, ClassMaterial
from app.schemas.class_schema import ClassCreate, ClassUpdate, ChapterCreate, ChapterUpdate


def _gen_join_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def get_classes_for_user(db: Session, user_id: str, role: str) -> list[Class]:
    if role == "teacher":
        return db.query(Class).filter(Class.teacher_id == user_id).all()
    # student: get enrolled classes
    memberships = db.query(ClassStudent).filter(ClassStudent.student_id == user_id).all()
    class_ids = [m.class_id for m in memberships]
    return db.query(Class).filter(Class.id.in_(class_ids)).all()


def get_class(db: Session, class_id: str) -> Class | None:
    return db.query(Class).filter(Class.id == class_id).first()


def create_class(db: Session, *, teacher_id: str, data: ClassCreate) -> Class:
    # Ensure unique join code
    while True:
        code = _gen_join_code()
        if not db.query(Class).filter(Class.join_code == code).first():
            break
    class_ = Class(**data.model_dump(), teacher_id=teacher_id, join_code=code)
    db.add(class_)
    db.commit()
    db.refresh(class_)
    return class_


def update_class(db: Session, *, class_: Class, data: ClassUpdate) -> Class:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(class_, field, value)
    db.commit()
    db.refresh(class_)
    return class_


def delete_class(db: Session, *, class_: Class) -> None:
    db.delete(class_)
    db.commit()


def get_by_join_code(db: Session, join_code: str) -> Class | None:
    return db.query(Class).filter(Class.join_code == join_code).first()


def join_class(db: Session, *, class_id: str, student_id: str) -> ClassStudent:
    membership = ClassStudent(class_id=class_id, student_id=student_id)
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


def remove_student(db: Session, *, class_id: str, student_id: str) -> bool:
    m = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id, ClassStudent.student_id == student_id
    ).first()
    if not m:
        return False
    db.delete(m)
    db.commit()
    return True


def is_member(db: Session, *, class_id: str, user_id: str) -> bool:
    return db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id, ClassStudent.student_id == user_id
    ).first() is not None


# Chapters -----------

def get_chapters(db: Session, class_id: str) -> list[Chapter]:
    return db.query(Chapter).filter(Chapter.class_id == class_id).order_by(Chapter.order_index).all()


def create_chapter(db: Session, *, class_id: str, data: ChapterCreate) -> Chapter:
    chapter = Chapter(**data.model_dump(), class_id=class_id)
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter


def update_chapter(db: Session, *, chapter: Chapter, data: ChapterUpdate) -> Chapter:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(chapter, field, value)
    db.commit()
    db.refresh(chapter)
    return chapter


def delete_chapter(db: Session, *, chapter: Chapter) -> None:
    db.delete(chapter)
    db.commit()


# Class Materials -----------

def add_material_to_class(db: Session, *, class_id: str, material_id: str, chapter_id: str | None) -> ClassMaterial:
    cm = ClassMaterial(class_id=class_id, material_id=material_id, chapter_id=chapter_id)
    db.add(cm)
    db.commit()
    db.refresh(cm)
    return cm


def get_class_materials(db: Session, class_id: str) -> list[ClassMaterial]:
    return db.query(ClassMaterial).filter(ClassMaterial.class_id == class_id).all()
