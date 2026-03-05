from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.class_schema import (
    ClassCreate, ClassUpdate, ClassOut,
    JoinClassRequest, ChapterCreate, ChapterUpdate, ChapterOut, AddMaterialToClass,
)
from app.schemas.user import UserPublic
from app.crud import class_crud
from app.core.dependencies import get_current_user, require_teacher
from app.models.user import User
from app.models.class_model import Chapter, ClassStudent
from app.utils.responses import ok


def _class_with_count(db: Session, class_: object) -> dict:
    """Serialize a class and add student_count."""
    data = ClassOut.model_validate(class_).model_dump()
    data["student_count"] = db.query(ClassStudent).filter(ClassStudent.class_id == class_.id).count()
    return data


router = APIRouter(prefix="/classes", tags=["Classes"])
chapters_router = APIRouter(prefix="/chapters", tags=["Chapters"])


@router.get("")
def list_classes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    classes = class_crud.get_classes_for_user(db, current_user.id, current_user.role)
    return ok(data=[_class_with_count(db, c) for c in classes])


@router.post("", status_code=201)
def create_class(
    data: ClassCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    class_ = class_crud.create_class(db, teacher_id=teacher.id, data=data)
    return ok(data=_class_with_count(db, class_), status_code=201)


@router.get("/{class_id}")
def get_class(
    class_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    class_ = class_crud.get_class(db, class_id)
    if not class_:
        raise HTTPException(status_code=404, detail="Class not found")
    return ok(data=_class_with_count(db, class_))


@router.put("/{class_id}")
def update_class(
    class_id: str,
    data: ClassUpdate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    class_ = class_crud.get_class(db, class_id)
    if not class_ or class_.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Class not found")
    updated = class_crud.update_class(db, class_=class_, data=data)
    return ok(data=_class_with_count(db, updated))


@router.delete("/{class_id}")
def delete_class(
    class_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    class_ = class_crud.get_class(db, class_id)
    if not class_ or class_.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Class not found")
    class_crud.delete_class(db, class_=class_)
    return ok(message="Xoa lop thanh cong")


@router.post("/join")
def join_class(
    data: JoinClassRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can join classes")
    class_ = class_crud.get_by_join_code(db, data.join_code)
    if not class_:
        raise HTTPException(status_code=404, detail="Ma lop khong hop le")
    if class_crud.is_member(db, class_id=class_.id, user_id=current_user.id):
        raise HTTPException(status_code=400, detail="Ban da tham gia lop nay")
    class_crud.join_class(db, class_id=class_.id, student_id=current_user.id)
    return ok(data=_class_with_count(db, class_), message="Tham gia lop thanh cong")


@router.get("/{class_id}/students")
def get_students(
    class_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    class_ = class_crud.get_class(db, class_id)
    if not class_:
        raise HTTPException(status_code=404, detail="Class not found")
    students = [UserPublic.model_validate(m.student).model_dump() for m in class_.students]
    return ok(data=students)


@router.delete("/{class_id}/students/{student_id}")
def remove_student(
    class_id: str,
    student_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    class_ = class_crud.get_class(db, class_id)
    if not class_ or class_.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Class not found")
    if not class_crud.remove_student(db, class_id=class_id, student_id=student_id):
        raise HTTPException(status_code=404, detail="Student not in class")
    return ok(message="Da xoa hoc sinh khoi lop")


# Chapters -----------

@router.post("/{class_id}/chapters", status_code=201)
def create_chapter(
    class_id: str,
    data: ChapterCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    class_ = class_crud.get_class(db, class_id)
    if not class_ or class_.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Class not found")
    chapter = class_crud.create_chapter(db, class_id=class_id, data=data)
    return ok(data=ChapterOut.model_validate(chapter).model_dump(), status_code=201)


# Class Materials -----------

@router.post("/{class_id}/materials", status_code=201)
def add_material(
    class_id: str,
    data: AddMaterialToClass,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    class_ = class_crud.get_class(db, class_id)
    if not class_ or class_.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Class not found")
    cm = class_crud.add_material_to_class(db, class_id=class_id, material_id=data.material_id, chapter_id=data.chapter_id)
    return ok(data={"id": cm.id, "class_id": cm.class_id, "material_id": cm.material_id, "chapter_id": cm.chapter_id}, status_code=201)


@router.get("/{class_id}/materials")
def get_class_materials(
    class_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    class_ = class_crud.get_class(db, class_id)
    if not class_:
        raise HTTPException(status_code=404, detail="Class not found")
    mats = class_crud.get_class_materials(db, class_id)
    return ok(data=[{"id": m.id, "material_id": m.material_id, "chapter_id": m.chapter_id} for m in mats])


# ---- Standalone chapter routes: PUT/DELETE /chapters/{chapter_id} ----

def _get_chapter_or_404(db: Session, chapter_id: str) -> Chapter:
    ch = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return ch


@chapters_router.put("/{chapter_id}")
def update_chapter(
    chapter_id: str,
    data: ChapterUpdate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    ch = _get_chapter_or_404(db, chapter_id)
    # Verify teacher owns the class
    class_ = class_crud.get_class(db, ch.class_id)
    if not class_ or class_.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    ch = class_crud.update_chapter(db, chapter=ch, data=data)
    return ok(data=ChapterOut.model_validate(ch).model_dump())


@chapters_router.delete("/{chapter_id}", status_code=200)
def delete_chapter(
    chapter_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    ch = _get_chapter_or_404(db, chapter_id)
    class_ = class_crud.get_class(db, ch.class_id)
    if not class_ or class_.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    class_crud.delete_chapter(db, chapter=ch)
    return ok(message="Da xoa chuong")
