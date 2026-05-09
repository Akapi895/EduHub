from sqlalchemy import and_
from sqlalchemy.orm import Session
from app.models.material import Material, Folder, MaterialView
from app.models.class_model import ClassMaterial, ClassStudent
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
    # Delete folder copies (materials with source_id) inside this folder — they were created
    # specifically for this folder and should be removed when the folder is deleted.
    # Keep original materials (source_id=None) but unlink them from the folder.
    folder_copy_ids = [
        r[0] for r in db.query(Material.id)
        .filter(Material.folder_id == folder.id, Material.source_id != None)  # noqa: E711
        .all()
    ]
    if folder_copy_ids:
        db.query(MaterialView).filter(MaterialView.material_id.in_(folder_copy_ids)).delete(
            synchronize_session=False,
        )
        db.query(ClassMaterial).filter(ClassMaterial.material_id.in_(folder_copy_ids)).delete(
            synchronize_session=False,
        )
        db.query(Material).filter(Material.id.in_(folder_copy_ids)).delete(synchronize_session=False)

    db.query(Material).filter(
        Material.folder_id == folder.id,
        Material.source_id == None,  # noqa: E711 — keep originals, just unlink
    ).update({Material.folder_id: None}, synchronize_session=False)

    db.delete(folder)
    db.commit()


# ---- Materials ----

def _build_query(db: Session, *, type_: str | None = None, subject: str | None = None,
                 grade: str | None = None, search: str | None = None,
                 is_system: bool | None = None, folder_id: str | None = None,
                 no_folder: bool = False,
                 exclude_folder_copies: bool = False,
                 created_by: str | None = None):
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
    elif no_folder:
        q = q.filter(Material.folder_id == None)  # noqa: E711
    if exclude_folder_copies:
        q = q.filter(~and_(Material.source_id != None, Material.folder_id != None))  # noqa: E711
    if created_by is not None:
        q = q.filter(Material.created_by == created_by)
    if search:
        q = q.filter(Material.title.ilike(f"%{search}%"))
    return q


def get_all(db: Session, *, type_: str | None = None, subject: str | None = None,
           grade: str | None = None, search: str | None = None,
           is_system: bool | None = None, folder_id: str | None = None,
           no_folder: bool = False,
           exclude_folder_copies: bool = False,
           created_by: str | None = None,
           skip: int = 0, limit: int = 50) -> list[Material]:
    q = _build_query(db, type_=type_, subject=subject, grade=grade, search=search,
                     is_system=is_system, folder_id=folder_id, no_folder=no_folder,
                     exclude_folder_copies=exclude_folder_copies,
                     created_by=created_by)
    return q.order_by(Material.created_at.desc()).offset(skip).limit(limit).all()


def count_all(db: Session, *, type_: str | None = None, subject: str | None = None,
              grade: str | None = None, search: str | None = None,
              is_system: bool | None = None, folder_id: str | None = None,
              no_folder: bool = False,
              exclude_folder_copies: bool = False,
              created_by: str | None = None) -> int:
    q = _build_query(db, type_=type_, subject=subject, grade=grade, search=search,
                     is_system=is_system, folder_id=folder_id, no_folder=no_folder,
                     exclude_folder_copies=exclude_folder_copies,
                     created_by=created_by)
    return q.count()


def get_student_materials(db: Session, student_id: str, *, type_: str | None = None,
                          subject: str | None = None, grade: str | None = None,
                          search: str | None = None,
                          skip: int = 0, limit: int = 50) -> tuple[list[Material], int]:
    """Return system materials + materials from classes the student is enrolled in."""
    enrolled_class_ids = [
        r[0] for r in db.query(ClassStudent.class_id)
        .filter(ClassStudent.student_id == student_id).all()
    ]
    enrolled_material_ids = [
        r[0] for r in db.query(ClassMaterial.material_id)
        .filter(ClassMaterial.class_id.in_(enrolled_class_ids)).distinct().all()
    ] if enrolled_class_ids else []

    q = db.query(Material)
    if enrolled_material_ids:
        q = q.filter((Material.is_system == True) | (Material.id.in_(enrolled_material_ids)))  # noqa: E712
    else:
        q = q.filter(Material.is_system == True)  # noqa: E712

    if type_:
        q = q.filter(Material.material_type == type_)
    if subject:
        q = q.filter(Material.subject == subject)
    if grade:
        q = q.filter(Material.grade == grade)
    if search:
        q = q.filter(Material.title.ilike(f"%{search}%"))

    total = q.count()
    items = q.order_by(Material.created_at.desc()).offset(skip).limit(limit).all()
    return items, total


def student_can_access(db: Session, student_id: str, material_id: str) -> bool:
    """Check if a student can access a material (system or in enrolled class)."""
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        return False
    if mat.is_system:
        return True
    enrolled = db.query(ClassStudent.class_id).filter(ClassStudent.student_id == student_id).subquery()
    return db.query(ClassMaterial).filter(
        ClassMaterial.material_id == material_id,
        ClassMaterial.class_id.in_(enrolled),
    ).first() is not None


def get_by_id(db: Session, material_id: str) -> Material | None:
    return db.query(Material).filter(Material.id == material_id).first()


def create(db: Session, *, data: MaterialCreate, created_by: str) -> Material:
    material = Material(**data.model_dump(), created_by=created_by)
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


def get_system_share(db: Session, *, source_id: str, shared_by: str) -> Material | None:
    return (
        db.query(Material)
        .filter(
            Material.source_id == source_id,
            Material.is_system == True,  # noqa: E712
            Material.shared_by == shared_by,
        )
        .first()
    )


def update(db: Session, *, material: Material, data: MaterialUpdate) -> Material:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(material, field, value)
    db.commit()
    db.refresh(material)
    return material


def copy_material(db: Session, *, source: Material, created_by: str,
                  folder_id: str | None = None, is_system: bool = False,
                  shared_by: str | None = None, commit: bool = True) -> Material:
    """Create a reference copy of a material, linking back via source_id."""
    m = Material(
        title=source.title,
        description=source.description,
        thumbnail_url=source.thumbnail_url,
        file_url=source.file_url,
        material_type=source.material_type,
        subject=source.subject,
        grade=source.grade,
        is_system=is_system,
        folder_id=folder_id,
        created_by=created_by,
        shared_by=shared_by,
        source_id=source.id,
    )
    db.add(m)
    if commit:
        db.commit()
        db.refresh(m)
    else:
        db.flush()
    return m


def detach_folder_copies(db: Session, *, material_id: str) -> None:
    """Remove source_id from copies that are in the root (no folder), keeping folder copies alive."""
    db.query(Material).filter(
        Material.source_id == material_id,
        Material.folder_id == None,  # noqa: E711 — only root-level copies
    ).update(
        {Material.source_id: None},
        synchronize_session=False,
    )


def delete_exact(db: Session, *, material: Material, preserve_descendants: bool = True) -> None:
    """Delete only the requested material and optionally keep derived copies alive."""
    if preserve_descendants:
        detach_folder_copies(db, material_id=material.id)
    db.query(MaterialView).filter(MaterialView.material_id == material.id).delete(synchronize_session=False)
    db.query(ClassMaterial).filter(ClassMaterial.material_id == material.id).delete(synchronize_session=False)
    db.delete(material)
    db.commit()


# ---- Material View Tracking ----

def record_view(db: Session, *, material_id: str, student_id: str, class_id: str | None = None) -> MaterialView:
    """Record that a student viewed a material (upsert — one view per student per material)."""
    existing = db.query(MaterialView).filter(
        MaterialView.material_id == material_id,
        MaterialView.student_id == student_id,
    ).first()
    if existing:
        return existing
    view = MaterialView(material_id=material_id, student_id=student_id, class_id=class_id)
    db.add(view)
    db.commit()
    db.refresh(view)
    return view


def get_material_views(db: Session, *, material_id: str, class_id: str | None = None) -> list[MaterialView]:
    q = db.query(MaterialView).filter(MaterialView.material_id == material_id)
    if class_id:
        q = q.filter(MaterialView.class_id == class_id)
    return q.all()
