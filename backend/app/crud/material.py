from sqlalchemy.orm import Session
from app.models.material import Material, Folder
from app.schemas.material import MaterialCreate, MaterialUpdate, FolderCreate


# ---- Folders ----

def get_folders(db: Session, *, created_by: str) -> list[Folder]:
    return db.query(Folder).filter(Folder.created_by == created_by).order_by(Folder.created_at.desc()).all()


def get_folder(db: Session, folder_id: str) -> Folder | None:
    return db.query(Folder).filter(Folder.id == folder_id).first()


def create_folder(db: Session, *, data: FolderCreate, created_by: str) -> Folder:
    folder = Folder(name=data.name, created_by=created_by)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


def delete_folder(db: Session, *, folder: Folder) -> None:
    # Unlink materials from folder (don't delete them)
    db.query(Material).filter(Material.folder_id == folder.id).update({Material.folder_id: None})
    db.delete(folder)
    db.commit()


# ---- Materials ----

def get_all(db: Session, *, type_: str | None = None, subject: str | None = None,
           grade: str | None = None, search: str | None = None,
           is_system: bool | None = None, folder_id: str | None = None) -> list[Material]:
    q = db.query(Material)
    if type_:
        q = q.filter(Material.material_type == type_)
    if subject:
        q = q.filter(Material.subject == subject)
    if grade:
        q = q.filter(Material.grade == grade)
    if is_system is not None:
        q = q.filter(Material.is_system == is_system)
    if folder_id is not None:
        q = q.filter(Material.folder_id == folder_id)
    if search:
        q = q.filter(Material.title.ilike(f"%{search}%"))
    return q.order_by(Material.created_at.desc()).all()


def get_by_id(db: Session, material_id: str) -> Material | None:
    return db.query(Material).filter(Material.id == material_id).first()


def create(db: Session, *, data: MaterialCreate, created_by: str) -> Material:
    material = Material(**data.model_dump(), created_by=created_by)
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


def update(db: Session, *, material: Material, data: MaterialUpdate) -> Material:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(material, field, value)
    db.commit()
    db.refresh(material)
    return material


def delete(db: Session, *, material: Material) -> None:
    db.delete(material)
    db.commit()
