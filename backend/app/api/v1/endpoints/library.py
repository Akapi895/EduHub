from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialOut
from app.crud import material as material_crud
from app.core.dependencies import get_current_user, require_teacher
from app.models.user import User
from app.utils.responses import ok

router = APIRouter(prefix="/library", tags=["Library"])


@router.get("")
def list_materials(
    type: str | None = Query(None),
    subject: str | None = Query(None),
    grade: str | None = Query(None),
    search: str | None = Query(None),
    is_system: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    materials = material_crud.get_all(db, type_=type, subject=subject, grade=grade,
                                      search=search, is_system=is_system)
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
