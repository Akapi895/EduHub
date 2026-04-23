from copy import deepcopy
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher
from app.crud import interactive_book as interactive_book_crud
from app.crud import material as material_crud
from app.db.session import get_db
from app.models.interactive_book import InteractiveBook
from app.models.material import Material
from app.models.user import User
from app.schemas.material import (
    FolderCreate,
    FolderOut,
    MaterialCreate,
    MaterialFileAccessOut,
    MaterialOut,
    MaterialUpdate,
)
from app.utils.enums import InteractiveBookStatus, MaterialType
from app.utils.file_upload import build_material_access_urls, get_file_extension, infer_material_thumbnail_url
from app.utils.responses import ok

router = APIRouter(prefix="/library", tags=["Library"])


def _serialize(m: Material, db: Session) -> dict:
    data = MaterialOut.model_validate(m).model_dump()
    data["thumbnail_url"] = m.thumbnail_url or infer_material_thumbnail_url(
        m.file_url,
        material_type=m.material_type,
    )
    if m.shared_by:
        sharer = db.query(User).filter(User.id == m.shared_by).first()
        data["shared_by_name"] = sharer.full_name if sharer else None
    if m.interactive_book:
        data["interactive_status"] = m.interactive_book.status
        data["manifest_version"] = m.interactive_book.manifest_version
        data["entry_scene_id"] = m.interactive_book.entry_scene_id
        data["estimated_duration"] = m.interactive_book.estimated_duration
    return data


def _assert_material_access(db: Session, *, current_user: User, material: Material) -> None:
    if current_user.role == "student":
        if not material_crud.student_can_access(db, current_user.id, material.id):
            raise HTTPException(status_code=403, detail="Ban khong co quyen xem tai lieu nay")
        return

    if current_user.role == "teacher" and not material.is_system and material.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Ban khong co quyen xem tai lieu nay")


def _apply_material_snapshot(target: Material, source: Material, *, is_system: bool, shared_by: str | None) -> Material:
    target.title = source.title
    target.description = source.description
    target.thumbnail_url = source.thumbnail_url
    target.file_url = source.file_url
    target.material_type = source.material_type
    target.subject = source.subject
    target.grade = source.grade
    target.is_system = is_system
    target.shared_by = shared_by
    target.folder_id = None if is_system else target.folder_id
    if is_system:
        target.source_id = source.id
    return target


def _get_teacher_owned_shared_copy(
    db: Session,
    *,
    material: Material,
    teacher_id: str,
) -> Material | None:
    if material.is_system:
        return material if material.shared_by == teacher_id else None
    return material_crud.get_system_share(db, source_id=material.id, shared_by=teacher_id)


def _resolve_interactive_book(material: Material, *, error_detail: str = "Interactive book not found") -> InteractiveBook:
    interactive_book = material.interactive_book
    if not interactive_book:
        raise HTTPException(status_code=404, detail=error_detail)
    return interactive_book


def _build_shared_interactive_book_snapshot(source: InteractiveBook) -> dict:
    manifest = deepcopy(source.draft_manifest or source.published_manifest)
    if not manifest:
        raise HTTPException(status_code=400, detail="Sach tuong tac nay chua co noi dung de day len thu vien chung")
    return {
        "status": InteractiveBookStatus.published,
        "draft_manifest": manifest,
        "published_manifest": deepcopy(manifest),
        "manifest_version": source.manifest_version,
        "entry_scene_id": source.entry_scene_id or manifest.get("entry_scene_id"),
        "estimated_duration": source.estimated_duration,
        "published_at": datetime.now(),
    }


def _apply_material_autofill(data: MaterialCreate | MaterialUpdate) -> MaterialCreate | MaterialUpdate:
    if not data.file_url:
        return data

    explicit_thumbnail = "thumbnail_url" in data.model_fields_set
    if explicit_thumbnail and data.thumbnail_url is None and isinstance(data, MaterialUpdate):
        return data
    if data.thumbnail_url:
        return data

    material_type = data.material_type.value if isinstance(data.material_type, MaterialType) else data.material_type
    inferred_thumbnail = infer_material_thumbnail_url(data.file_url, material_type=material_type)
    if not inferred_thumbnail:
        return data

    return data.model_copy(update={"thumbnail_url": inferred_thumbnail})


def _build_download_name(material: Material) -> str | None:
    extension = get_file_extension(material.file_url)
    if not extension:
        return None
    safe_title = "".join(char if char.isalnum() or char in {"-", "_"} else "-" for char in material.title).strip("-")
    if not safe_title:
        safe_title = "material"
    return f"{safe_title}.{extension}"


# ---- Folders ----

@router.get("/folders")
def list_folders(
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    folders = material_crud.get_folders(db, created_by=teacher.id)
    result = []
    for folder in folders:
        data = FolderOut.model_validate(folder).model_dump()
        data["material_count"] = db.query(Material).filter(Material.folder_id == folder.id).count()
        result.append(data)
    return ok(data=result)


@router.post("/folders", status_code=201)
def create_folder(
    data: FolderCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    folder = material_crud.create_folder(db, data=data, created_by=teacher.id)
    payload = FolderOut.model_validate(folder).model_dump()
    payload["material_count"] = 0
    return ok(data=payload, status_code=201)


@router.get("/folders/{folder_id}")
def get_folder(
    folder_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    folder = material_crud.get_folder(db, folder_id)
    if not folder or folder.created_by != teacher.id:
        raise HTTPException(status_code=404, detail="Folder not found")
    payload = FolderOut.model_validate(folder).model_dump()
    payload["material_count"] = db.query(Material).filter(Material.folder_id == folder.id).count()
    return ok(data=payload)


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
            db,
            current_user.id,
            type_=type,
            subject=subject,
            grade=grade,
            search=search,
            skip=skip,
            limit=limit,
        )
    else:
        created_by = None if is_system else current_user.id
        items = material_crud.get_all(
            db,
            type_=type,
            subject=subject,
            grade=grade,
            search=search,
            is_system=is_system,
            folder_id=folder_id,
            no_folder=no_folder,
            exclude_folder_copies=exclude_folder_copies,
            created_by=created_by,
            skip=skip,
            limit=limit,
        )
        total = material_crud.count_all(
            db,
            type_=type,
            subject=subject,
            grade=grade,
            search=search,
            is_system=is_system,
            folder_id=folder_id,
            no_folder=no_folder,
            exclude_folder_copies=exclude_folder_copies,
            created_by=created_by,
        )
    data = [_serialize(item, db) for item in items]
    return ok(data={"items": data, "total": total, "skip": skip, "limit": limit})


@router.post("", status_code=201)
def create_material(
    data: MaterialCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    if data.material_type == MaterialType.interactive_book:
        raise HTTPException(status_code=400, detail="Hay dung endpoint /interactive-books de tao sach tuong tac")
    payload = _apply_material_autofill(data).model_copy(update={"is_system": False})
    material = material_crud.create(db, data=payload, created_by=teacher.id)
    return ok(data=_serialize(material, db), status_code=201)


@router.get("/{material_id}")
def get_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    material = material_crud.get_by_id(db, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    _assert_material_access(db, current_user=current_user, material=material)
    return ok(data=_serialize(material, db))


@router.get("/{material_id}/file-access")
def get_material_file_access(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    material = material_crud.get_by_id(db, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    if not material.file_url:
        raise HTTPException(status_code=404, detail="Tai lieu nay khong co tep dinh kem")

    _assert_material_access(db, current_user=current_user, material=material)
    payload = build_material_access_urls(
        material.file_url,
        material_type=material.material_type,
        download_name=_build_download_name(material),
    )
    payload["thumbnail_url"] = material.thumbnail_url or infer_material_thumbnail_url(
        material.file_url,
        material_type=material.material_type,
    )
    return ok(data=MaterialFileAccessOut.model_validate(payload).model_dump())


@router.put("/{material_id}")
def update_material(
    material_id: str,
    data: MaterialUpdate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    material = material_crud.get_by_id(db, material_id)
    if not material or material.created_by != teacher.id:
        raise HTTPException(status_code=404, detail="Material not found")
    if material.is_system:
        raise HTTPException(status_code=400, detail="Tai lieu trong thu vien chung chi duoc cap nhat tu ban ca nhan")
    if data.material_type == MaterialType.interactive_book:
        raise HTTPException(status_code=400, detail="Khong the doi mot tai lieu thuong thanh sach tuong tac")
    if data.folder_id is not None and material.file_url:
        existing = db.query(Material).filter(
            Material.created_by == teacher.id,
            Material.folder_id == data.folder_id,
            Material.file_url == material.file_url,
            Material.id != material.id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Tai lieu da ton tai trong thu muc nay")
    updated = material_crud.update(db, material=material, data=_apply_material_autofill(data))
    return ok(data=_serialize(updated, db))


@router.delete("/{material_id}")
def delete_material(
    material_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    material = material_crud.get_by_id(db, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    if material.is_system:
        raise HTTPException(status_code=400, detail="Hay dung thao tac go khoi thu vien chung cho tai lieu he thong")
    if material.created_by != teacher.id:
        raise HTTPException(status_code=403, detail="Ban khong co quyen xoa tai lieu nay")
    material_crud.delete_exact(db, material=material)
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
    material = material_crud.get_by_id(db, material_id)
    if not material or material.created_by != teacher.id:
        raise HTTPException(status_code=404, detail="Material not found")
    source_material = material
    if material.material_type == MaterialType.interactive_book and material.source_id:
        original_source = material_crud.get_by_id(db, material.source_id)
        if original_source and original_source.created_by == teacher.id:
            source_material = original_source

    if body.folder_id:
        duplicate_query = db.query(Material).filter(
            Material.created_by == teacher.id,
            Material.folder_id == body.folder_id,
        )
        if source_material.material_type == MaterialType.interactive_book:
            duplicate_query = duplicate_query.filter(
                Material.material_type == MaterialType.interactive_book,
                (Material.id == source_material.id) | (Material.source_id == source_material.id),
            )
        elif source_material.file_url:
            duplicate_query = duplicate_query.filter(Material.file_url == source_material.file_url)

        if duplicate_query.first():
            raise HTTPException(status_code=400, detail="Tai lieu da ton tai trong thu muc nay")

    if source_material.material_type == MaterialType.interactive_book:
        copy = material_crud.copy_material(
            db,
            source=source_material,
            created_by=teacher.id,
            folder_id=body.folder_id,
            commit=False,
        )
        source_book = _resolve_interactive_book(source_material)
        interactive_book_crud.clone_book(
            db,
            source=source_book,
            material_id=copy.id,
            created_by=teacher.id,
            commit=False,
        )
        db.commit()
        db.refresh(copy)
        return ok(data=_serialize(copy, db), status_code=201)

    copy = material_crud.copy_material(db, source=source_material, created_by=teacher.id, folder_id=body.folder_id)
    return ok(data=_serialize(copy, db), status_code=201)


@router.post("/{material_id}/share", status_code=201)
def share_material(
    material_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    material = material_crud.get_by_id(db, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    if material.is_system:
        raise HTTPException(status_code=400, detail="Tai lieu nay da nam trong thu vien chung")
    if material.created_by != teacher.id:
        raise HTTPException(status_code=403, detail="Ban khong co quyen day tai lieu nay len thu vien chung")

    source_book = None
    shared_book_snapshot = None
    if material.material_type == MaterialType.interactive_book:
        source_book = _resolve_interactive_book(material)
        shared_book_snapshot = _build_shared_interactive_book_snapshot(source_book)

    shared_copy = material_crud.get_system_share(db, source_id=material.id, shared_by=teacher.id)
    if shared_copy:
        _apply_material_snapshot(shared_copy, material, is_system=True, shared_by=teacher.id)
        if source_book:
            shared_book = shared_copy.interactive_book
            if shared_book:
                shared_book.status = shared_book_snapshot["status"]
                shared_book.draft_manifest = shared_book_snapshot["draft_manifest"]
                shared_book.published_manifest = shared_book_snapshot["published_manifest"]
                shared_book.manifest_version = shared_book_snapshot["manifest_version"]
                shared_book.entry_scene_id = shared_book_snapshot["entry_scene_id"]
                shared_book.estimated_duration = shared_book_snapshot["estimated_duration"]
                shared_book.published_at = shared_book_snapshot["published_at"]
            else:
                shared_book = interactive_book_crud.clone_book(
                    db,
                    source=source_book,
                    material_id=shared_copy.id,
                    created_by=teacher.id,
                    commit=False,
                )
                shared_book.status = shared_book_snapshot["status"]
                shared_book.draft_manifest = shared_book_snapshot["draft_manifest"]
                shared_book.published_manifest = shared_book_snapshot["published_manifest"]
                shared_book.manifest_version = shared_book_snapshot["manifest_version"]
                shared_book.entry_scene_id = shared_book_snapshot["entry_scene_id"]
                shared_book.estimated_duration = shared_book_snapshot["estimated_duration"]
                shared_book.published_at = shared_book_snapshot["published_at"]
        db.commit()
        db.refresh(shared_copy)
        return ok(data=_serialize(shared_copy, db), message="Da cap nhat ban chia se trong thu vien chung")

    copy = material_crud.copy_material(
        db,
        source=material,
        created_by=teacher.id,
        is_system=True,
        shared_by=teacher.id,
        commit=False,
    )
    if source_book:
        cloned_book = interactive_book_crud.clone_book(
            db,
            source=source_book,
            material_id=copy.id,
            created_by=teacher.id,
            commit=False,
        )
        cloned_book.status = shared_book_snapshot["status"]
        cloned_book.draft_manifest = shared_book_snapshot["draft_manifest"]
        cloned_book.published_manifest = shared_book_snapshot["published_manifest"]
        cloned_book.manifest_version = shared_book_snapshot["manifest_version"]
        cloned_book.entry_scene_id = shared_book_snapshot["entry_scene_id"]
        cloned_book.estimated_duration = shared_book_snapshot["estimated_duration"]
        cloned_book.published_at = shared_book_snapshot["published_at"]
    db.commit()
    db.refresh(copy)
    return ok(data=_serialize(copy, db), message="Da day tai lieu len thu vien chung", status_code=201)


@router.delete("/{material_id}/share")
def unshare_material(
    material_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    material = material_crud.get_by_id(db, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    shared_copy = _get_teacher_owned_shared_copy(db, material=material, teacher_id=teacher.id)
    if not shared_copy:
        if material.is_system:
            raise HTTPException(status_code=403, detail="Ban chi co the go cac tai lieu do chinh minh day len")
        raise HTTPException(status_code=404, detail="Tai lieu nay chua duoc day len thu vien chung")

    material_crud.delete_exact(db, material=shared_copy)
    return ok(message="Da go tai lieu khoi thu vien chung")


@router.post("/{material_id}/save", status_code=201)
def save_to_personal(
    material_id: str,
    body: _CopyBody,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    material = material_crud.get_by_id(db, material_id)
    if not material or not material.is_system:
        raise HTTPException(status_code=404, detail="System material not found")
    if material.shared_by == teacher.id:
        raise HTTPException(status_code=400, detail="Day la tai lieu ban da chia se, khong can luu lai")

    duplicate_query = db.query(Material).filter(
        Material.is_system == False,  # noqa: E712
        Material.created_by == teacher.id,
    )
    if material.source_id:
        duplicate_query = duplicate_query.filter((Material.source_id == material.id) | (Material.source_id == material.source_id))
    elif material.file_url:
        duplicate_query = duplicate_query.filter(Material.file_url == material.file_url)
    else:
        duplicate_query = duplicate_query.filter(
            Material.title == material.title,
            Material.material_type == material.material_type,
        )
    if body.folder_id:
        duplicate_query = duplicate_query.filter(Material.folder_id == body.folder_id)
    if duplicate_query.first():
        raise HTTPException(status_code=400, detail="Tai lieu nay da co trong thu vien ca nhan cua ban")

    copy = material_crud.copy_material(
        db,
        source=material,
        created_by=teacher.id,
        folder_id=body.folder_id,
        is_system=False,
        commit=False,
    )
    if material.material_type == MaterialType.interactive_book:
        source_book = _resolve_interactive_book(material)
        interactive_book_crud.clone_book(
            db,
            source=source_book,
            material_id=copy.id,
            created_by=teacher.id,
            commit=False,
        )
    db.commit()
    db.refresh(copy)
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
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can record views")
    material = material_crud.get_by_id(db, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    view = material_crud.record_view(
        db,
        material_id=material_id,
        student_id=current_user.id,
        class_id=body.class_id,
    )
    return ok(data={"material_id": view.material_id, "viewed_at": str(view.viewed_at)})
