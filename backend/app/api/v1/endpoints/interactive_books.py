from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_student, require_teacher
from app.crud import interactive_book as interactive_book_crud
from app.db.session import get_db
from app.models.user import User
from app.schemas.interactive_book import (
    InteractiveBookCheckpointRequest,
    InteractiveBookCompleteRequest,
    InteractiveBookCreateRequest,
    InteractiveBookDraftUpdateRequest,
    InteractiveBookEventsBatchRequest,
    InteractiveBookStartRequest,
)
from app.services import interactive_book_service
from app.utils.responses import ok

router = APIRouter(tags=["Interactive Books"])


@router.post("/interactive-books", status_code=201)
def create_interactive_book(
    data: InteractiveBookCreateRequest,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    payload = interactive_book_service.create_interactive_book(db, teacher=teacher, data=data)
    return ok(data=payload, message="Da tao sach tuong tac", status_code=201)


@router.put("/interactive-books/{material_id}/draft")
def update_interactive_book_draft(
    material_id: str,
    data: InteractiveBookDraftUpdateRequest,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    payload = interactive_book_service.update_draft(
        db,
        material_id=material_id,
        teacher=teacher,
        data=data,
    )
    return ok(data=payload, message="Da cap nhat ban nhap")


@router.post("/interactive-books/{material_id}/publish")
def publish_interactive_book(
    material_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    payload = interactive_book_service.publish_book(db, material_id=material_id, teacher=teacher)
    return ok(data=payload, message="Da publish sach tuong tac")


@router.get("/interactive-books/{material_id}")
def get_interactive_book(
    material_id: str,
    view: Literal["published", "draft"] = Query("published"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    material, interactive_book, manifest = interactive_book_service.get_accessible_book(
        db,
        material_id=material_id,
        current_user=current_user,
        view=view,
    )
    return ok(
        data={
            "material": interactive_book_service._serialize_material(material),
            "interactive_book": interactive_book_service._serialize_book(interactive_book),
            "manifest": manifest,
            "view": view,
        },
    )


@router.get("/interactive-books/{material_id}/report")
def get_interactive_book_report(
    material_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    payload = interactive_book_service.get_teacher_report(
        db,
        material_id=material_id,
        teacher=teacher,
    )
    return ok(data=payload)


@router.post("/interactive-books/{material_id}/attempts/start")
def start_interactive_book_attempt(
    material_id: str,
    data: InteractiveBookStartRequest,
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
):
    payload = interactive_book_service.start_attempt(
        db,
        material_id=material_id,
        student=student,
        class_id=data.class_id,
    )
    return ok(data=payload, message="Da san sang vao sach")


@router.patch("/interactive-book-attempts/{attempt_id}/checkpoint")
def save_interactive_book_checkpoint(
    attempt_id: str,
    data: InteractiveBookCheckpointRequest,
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
):
    payload = interactive_book_service.save_checkpoint(
        db,
        attempt_id=attempt_id,
        student=student,
        data=data,
    )
    return ok(data=payload, message="Da luu tien trinh")


@router.post("/interactive-book-attempts/{attempt_id}/events/batch")
def log_interactive_book_events(
    attempt_id: str,
    data: InteractiveBookEventsBatchRequest,
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
):
    attempt = interactive_book_crud.get_attempt(db, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.student_id != student.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    events = interactive_book_crud.create_events(
        db,
        attempt_id=attempt_id,
        events=[event.model_dump(mode="json") for event in data.events],
    )
    return ok(data={"count": len(events)}, message="Da ghi nhan su kien")


@router.post("/interactive-book-attempts/{attempt_id}/complete")
def complete_interactive_book_attempt(
    attempt_id: str,
    data: InteractiveBookCompleteRequest,
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
):
    payload = interactive_book_service.complete_attempt(
        db,
        attempt_id=attempt_id,
        student=student,
        data=data,
    )
    return ok(data=payload, message="Da hoan thanh sach")
