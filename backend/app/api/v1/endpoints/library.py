from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialOut, FolderCreate, FolderOut
from app.crud import material as material_crud
from app.core.dependencies import get_current_user, require_teacher
from app.models.user import User
from app.models.material import Material
from app.utils.responses import ok
from app.utils.enums import MaterialType

router = APIRouter(prefix="/library", tags=["Library"])


def _serialize(m: Material, db: Session) -> dict:
    d = MaterialOut.model_validate(m).model_dump()
    if m.shared_by:
        sharer = db.query(User).filter(User.id == m.shared_by).first()
        d["shared_by_name"] = sharer.full_name if sharer else None
    if m.interactive_book:
        d["interactive_status"] = m.interactive_book.status
        d["manifest_version"] = m.interactive_book.manifest_version
        d["entry_scene_id"] = m.interactive_book.entry_scene_id
        d["estimated_duration"] = m.interactive_book.estimated_duration
    return d


# ---- Folders ----

@router.get("/folders")
def list_folders(
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    folders = material_crud.get_folders(db, created_by=teacher.id)
    result = []
    for f in folders:
        d = FolderOut.model_validate(f).model_dump()
        d["material_count"] = db.query(Material).filter(Material.folder_id == f.id).count()
        result.append(d)
    return ok(data=result)


@router.post("/folders", status_code=201)
def create_folder(
    data: FolderCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    folder = material_crud.create_folder(db, data=data, created_by=teacher.id)
    d = FolderOut.model_validate(folder).model_dump()
    d["material_count"] = 0
    return ok(data=d, status_code=201)


@router.get("/folders/{folder_id}")
def get_folder(
    folder_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    folder = material_crud.get_folder(db, folder_id)
    if not folder or folder.created_by != teacher.id:
        raise HTTPException(status_code=404, detail="Folder not found")
    d = FolderOut.model_validate(folder).model_dump()
    d["material_count"] = db.query(Material).filter(Material.folder_id == folder.id).count()
    return ok(data=d)


@router.delete("/folders/{folder_id}")
def delete_folder(
    folder_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    folder = material_crud.get_folder(db, folder_id)
    if not folder or folder.created_by != teacher.id:
        raise HTTPException(status_code=404, detail="Folder not found")
    material_crud.delete_folder(db, folder=folder)
    return ok(message="Da xoa thu muc")


# ---- Materials ----

@router.get("")
def list_materials(
    type: str | None = Query(None),
    subject: str | None = Query(None),
    grade: str | None = Query(None),
    search: str | None = Query(None),
    is_system: bool | None = Query(None),
    folder_id: str | None = Query(None),
    no_folder: bool = Query(False),
    exclude_folder_copies: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "student":
        items, total = material_crud.get_student_materials(
            db, current_user.id,
            type_=type, subject=subject, grade=grade, search=search,
            skip=skip, limit=limit,
        )
    else:
        # Teacher: system materials or own personal materials
        created_by = None if is_system else current_user.id
        items = material_crud.get_all(
            db, type_=type, subject=subject, grade=grade,
            search=search, is_system=is_system, folder_id=folder_id,
            no_folder=no_folder, exclude_folder_copies=exclude_folder_copies,
            created_by=created_by, skip=skip, limit=limit,
        )
        total = material_crud.count_all(
            db, type_=type, subject=subject, grade=grade,
            search=search, is_system=is_system, folder_id=folder_id,
            no_folder=no_folder, exclude_folder_copies=exclude_folder_copies,
            created_by=created_by,
        )
    data = [_serialize(m, db) for m in items]
    return ok(data={"items": data, "total": total, "skip": skip, "limit": limit})


@router.post("", status_code=201)
def create_material(
    data: MaterialCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    if data.material_type == MaterialType.interactive_book:
        raise HTTPException(status_code=400, detail="Hay dung endpoint /interactive-books de tao sach tuong tac")
    material = material_crud.create(db, data=data, created_by=teacher.id)
    return ok(data=_serialize(material, db), status_code=201)


@router.get("/{material_id}")
def get_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = material_crud.get_by_id(db, material_id)
    if not m:
        raise HTTPException(status_code=404, detail="Material not found")
    # Access control: teachers can see own + system; students: system + enrolled class materials
    if current_user.role == "student":
        if not material_crud.student_can_access(db, current_user.id, material_id):
            raise HTTPException(status_code=403, detail="Bạn không có quyền xem tài liệu này")
    elif current_user.role == "teacher":
        if not m.is_system and m.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền xem tài liệu này")
    return ok(data=_serialize(m, db))


@router.put("/{material_id}")
def update_material(
    material_id: str,
    data: MaterialUpdate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    m = material_crud.get_by_id(db, material_id)
    if not m or m.created_by != teacher.id:
        raise HTTPException(status_code=404, detail="Material not found")
    if data.material_type == MaterialType.interactive_book:
        raise HTTPException(status_code=400, detail="Khong the doi mot tai lieu thuong thanh sach tuong tac")
    # If moving to a folder, check for duplicate
    if data.folder_id is not None and m.file_url:
        existing = db.query(Material).filter(
            Material.created_by == teacher.id,
            Material.folder_id == data.folder_id,
            Material.file_url == m.file_url,
            Material.id != m.id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Tai lieu da ton tai trong thu muc nay")
    updated = material_crud.update(db, material=m, data=data)
    return ok(data=_serialize(updated, db))


@router.delete("/{material_id}")
def delete_material(
    material_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    m = material_crud.get_by_id(db, material_id)
    if not m or m.created_by != teacher.id:
        raise HTTPException(status_code=404, detail="Material not found")
    material_crud.delete(db, material=m)
    return ok(message="Da xoa tai lieu")


# ---- Copy / Share / Save ----

class _CopyBody(BaseModel):
    folder_id: str | None = None


@router.post("/{material_id}/copy", status_code=201)
def copy_material(
    material_id: str,
    body: _CopyBody,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    """Copy an own material into a folder (personal duplicate)."""
    m = material_crud.get_by_id(db, material_id)
    if not m or m.created_by != teacher.id:
        raise HTTPException(status_code=404, detail="Material not found")
    if m.material_type == MaterialType.interactive_book:
        raise HTTPException(status_code=400, detail="V1 chua ho tro sao chep sach tuong tac")
    # Prevent duplicate in target folder
    if m.file_url and body.folder_id:
        existing = db.query(Material).filter(
            Material.created_by == teacher.id,
            Material.folder_id == body.folder_id,
            Material.file_url == m.file_url,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Tai lieu da ton tai trong thu muc nay")
    copy = material_crud.copy_material(
        db, source=m, created_by=teacher.id, folder_id=body.folder_id,
    )
    return ok(data=_serialize(copy, db), status_code=201)


@router.post("/{material_id}/share", status_code=201)
def share_material(
    material_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    """Copy personal material to system library with shared_by tracking."""
    m = material_crud.get_by_id(db, material_id)
    if not m or m.created_by != teacher.id:
        raise HTTPException(status_code=404, detail="Material not found")
    if m.material_type == MaterialType.interactive_book:
        raise HTTPException(status_code=400, detail="V1 chua ho tro chia se sach tuong tac")
    if m.is_system:
        raise HTTPException(status_code=400, detail="Material is already in system library")
    # Prevent duplicate share: same file already shared by this teacher
    if m.file_url:
        existing = db.query(Material).filter(
            Material.is_system == True,  # noqa: E712
            Material.shared_by == teacher.id,
            Material.file_url == m.file_url,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ban da chia se tai lieu nay roi")
    copy = material_crud.copy_material(
        db, source=m, created_by=teacher.id,
        is_system=True, shared_by=teacher.id,
    )
    return ok(data=_serialize(copy, db), status_code=201)


@router.post("/{material_id}/save", status_code=201)
def save_to_personal(
    material_id: str,
    body: _CopyBody,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    """Save a system material to the teacher's personal library."""
    m = material_crud.get_by_id(db, material_id)
    if not m or not m.is_system:
        raise HTTPException(status_code=404, detail="System material not found")
    if m.material_type == MaterialType.interactive_book:
        raise HTTPException(status_code=400, detail="V1 chua ho tro luu ban sao sach tuong tac")
    # Prevent saving own shared material back
    if m.shared_by == teacher.id:
        raise HTTPException(status_code=400, detail="Day la tai lieu ban da chia se, khong can luu lai")
    # Prevent duplicate save: same file already in personal library (global or in target folder)
    if m.file_url:
        dup_q = db.query(Material).filter(
            Material.is_system == False,  # noqa: E712
            Material.created_by == teacher.id,
            Material.file_url == m.file_url,
        )
        if body.folder_id:
            dup_q = dup_q.filter(Material.folder_id == body.folder_id)
        if dup_q.first():
            raise HTTPException(status_code=400, detail="Tai lieu nay da co trong thu vien ca nhan cua ban")
    copy = material_crud.copy_material(
        db, source=m, created_by=teacher.id,
        folder_id=body.folder_id, is_system=False,
    )
    return ok(data=_serialize(copy, db), status_code=201)


# ---- Material View Tracking ----

class _ViewBody(BaseModel):
    class_id: str | None = None


@router.post("/{material_id}/view")
def record_material_view(
    material_id: str,
    body: _ViewBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record that a student viewed a material."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can record views")
    m = material_crud.get_by_id(db, material_id)
    if not m:
        raise HTTPException(status_code=404, detail="Material not found")
    view = material_crud.record_view(
        db, material_id=material_id, student_id=current_user.id,
        class_id=body.class_id,
    )
    return ok(data={"material_id": view.material_id, "viewed_at": str(view.viewed_at)})
