from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.dependencies import get_current_user
from app.models.user import User
from app.utils.file_upload import normalize_upload_sub_dir, save_upload_file
from app.utils.responses import ok

router = APIRouter(prefix="/upload", tags=["Upload"])

COMMON_UPLOAD_SUBDIRS = {"avatars"}
TEACHER_UPLOAD_SUBDIRS = COMMON_UPLOAD_SUBDIRS | {
    "materials",
    "thumbnails",
    "interactive-books",
    "card-pairs",
    "game-assets",
    "backgrounds",
    "card-backs",
}
STUDENT_UPLOAD_SUBDIRS = COMMON_UPLOAD_SUBDIRS | {"exam-answers"}


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    sub_dir: str = "materials",
    current_user: User = Depends(get_current_user),
):
    normalized_sub_dir = normalize_upload_sub_dir(sub_dir)
    allowed_subdirs = TEACHER_UPLOAD_SUBDIRS if current_user.role == "teacher" else STUDENT_UPLOAD_SUBDIRS
    if normalized_sub_dir not in allowed_subdirs:
        raise HTTPException(status_code=403, detail="Ban khong co quyen upload vao vi tri nay")

    upload_info = await save_upload_file(file, sub_dir=normalized_sub_dir)
    return ok(
        data={
            "url": upload_info.url,
            "resource_type": upload_info.resource_type,
            "content_type": upload_info.content_type,
            "file_extension": upload_info.file_extension,
            "thumbnail_url": upload_info.thumbnail_url,
        },
        message="Upload thanh cong",
        status_code=201,
    )
