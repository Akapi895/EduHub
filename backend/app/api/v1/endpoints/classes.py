from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.schemas.class_schema import (
    ClassCreate, ClassUpdate, ClassOut,
    JoinClassRequest, ChapterCreate, ChapterUpdate, ChapterOut, AddMaterialToClass,
)
from app.schemas.user import UserPublic
from app.crud import class_crud
from app.core.dependencies import get_current_user, require_teacher
from app.models.user import User
from app.models.class_model import Class, Chapter, ClassStudent, ClassMaterial
from app.models.exam import Exam
from app.utils.responses import ok


def _verify_class_access(db: Session, class_: object, user: User) -> None:
    """Raise 403 if user is neither the class teacher nor an enrolled student."""
    if user.role == "teacher" and class_.teacher_id == user.id:
        return
    if user.role == "student" and class_crud.is_member(db, class_id=class_.id, user_id=user.id):
        return
    raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập lớp học này")


def _class_with_count(db: Session, class_: object) -> dict:
    """Serialize a class and add student_count, material_count, exam_count, teacher_name."""
    data = ClassOut.model_validate(class_).model_dump()
    data["student_count"] = db.query(ClassStudent).filter(ClassStudent.class_id == class_.id).count()
    data["material_count"] = db.query(ClassMaterial).filter(ClassMaterial.class_id == class_.id).count()
    data["exam_count"] = db.query(Exam).filter(Exam.class_id == class_.id).count()
    if class_.teacher:
        data["teacher_name"] = class_.teacher.full_name
    return data


router = APIRouter(prefix="/classes", tags=["Classes"])


@router.get("")
def list_classes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    classes = class_crud.get_classes_for_user(db, current_user.id, current_user.role)
    if not classes:
        return ok(data=[])

    class_ids = [c.id for c in classes]

    # Batch count queries — one query each instead of N per class
    student_counts = dict(
        db.query(ClassStudent.class_id, func.count(ClassStudent.id))
        .filter(ClassStudent.class_id.in_(class_ids))
        .group_by(ClassStudent.class_id)
        .all()
    )
    material_counts = dict(
        db.query(ClassMaterial.class_id, func.count(ClassMaterial.id))
        .filter(ClassMaterial.class_id.in_(class_ids))
        .group_by(ClassMaterial.class_id)
        .all()
    )
    exam_counts = dict(
        db.query(Exam.class_id, func.count(Exam.id))
        .filter(Exam.class_id.in_(class_ids))
        .group_by(Exam.class_id)
        .all()
    )

    result = []
    for c in classes:
        data = ClassOut.model_validate(c).model_dump()
        data["student_count"] = student_counts.get(c.id, 0)
        data["material_count"] = material_counts.get(c.id, 0)
        data["exam_count"] = exam_counts.get(c.id, 0)
        data["teacher_name"] = c.teacher.full_name if c.teacher else None
        result.append(data)
    return ok(data=result)


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
    _verify_class_access(db, class_, current_user)
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
    _verify_class_access(db, class_, current_user)
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

@router.get("/{class_id}/chapters")
def list_chapters(
    class_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    class_ = class_crud.get_class(db, class_id)
    if not class_:
        raise HTTPException(status_code=404, detail="Class not found")
    _verify_class_access(db, class_, current_user)
    chapters = class_crud.get_chapters(db, class_id)
    result = []
    for ch in chapters:
        ch_data = ChapterOut.model_validate(ch).model_dump()
        # Include materials for this chapter
        from app.models.material import Material as MaterialModel
        mats = []
        for cm in ch.class_materials:
            mat = db.query(MaterialModel).filter(MaterialModel.id == cm.material_id).first()
            if mat:
                from app.schemas.material import MaterialOut
                mats.append(MaterialOut.model_validate(mat).model_dump())
        ch_data["materials"] = mats
        ch_data["class_material_ids"] = {cm.material_id: cm.id for cm in ch.class_materials}
        result.append(ch_data)
    return ok(data=result)


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
    if data.chapter_id and class_crud.is_material_in_chapter(db, chapter_id=data.chapter_id, material_id=data.material_id):
        raise HTTPException(status_code=400, detail="Tai lieu da ton tai trong chuong nay")
    cm = class_crud.add_material_to_class(db, class_id=class_id, material_id=data.material_id, chapter_id=data.chapter_id)
    return ok(data={"id": cm.id, "class_id": cm.class_id, "material_id": cm.material_id, "chapter_id": cm.chapter_id}, status_code=201)


@router.delete("/{class_id}/materials/{class_material_id}")
def remove_material(
    class_id: str,
    class_material_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    class_ = class_crud.get_class(db, class_id)
    if not class_ or class_.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Class not found")
    if not class_crud.remove_material_from_class(db, class_material_id=class_material_id):
        raise HTTPException(status_code=404, detail="Material not found in class")
    return ok(message="Da go tai lieu khoi lop")


@router.delete("/{class_id}/chapters/{chapter_id}")
def delete_chapter(
    class_id: str,
    chapter_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    class_ = class_crud.get_class(db, class_id)
    if not class_ or class_.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Class not found")
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id, Chapter.class_id == class_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    class_crud.delete_chapter(db, chapter=chapter)
    return ok(message="Da xoa chuong")


@router.get("/{class_id}/materials")
def get_class_materials(
    class_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    class_ = class_crud.get_class(db, class_id)
    if not class_:
        raise HTTPException(status_code=404, detail="Class not found")
    _verify_class_access(db, class_, current_user)
    mats = class_crud.get_class_materials(db, class_id)
    return ok(data=[{"id": m.id, "material_id": m.material_id, "chapter_id": m.chapter_id} for m in mats])
