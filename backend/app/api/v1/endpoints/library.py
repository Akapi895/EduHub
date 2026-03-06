from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialOut, FolderCreate, FolderOut
from app.crud import material as material_crud
from app.core.dependencies import get_current_user, require_teacher
from app.models.user import User
from app.models.material import Material
from app.utils.responses import ok

router = APIRouter(prefix="/library", tags=["Library"])


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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    materials = material_crud.get_all(db, type_=type, subject=subject, grade=grade,
                                      search=search, is_system=is_system, folder_id=folder_id)
    return ok(data=[MaterialOut.model_validate(m).model_dump() for m in materials])


@router.post("", status_code=201)
def create_material(
    data: MaterialCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    material = material_crud.create(db, data=data, created_by=teacher.id)
    return ok(data=MaterialOut.model_validate(material).model_dump(), status_code=201)


@router.get("/{material_id}")
def get_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = material_crud.get_by_id(db, material_id)
    if not m:
        raise HTTPException(status_code=404, detail="Material not found")
    return ok(data=MaterialOut.model_validate(m).model_dump())


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
    updated = material_crud.update(db, material=m, data=data)
    return ok(data=MaterialOut.model_validate(updated).model_dump())


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
