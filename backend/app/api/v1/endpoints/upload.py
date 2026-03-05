from fastapi import APIRouter, Depends, UploadFile, File

from app.core.dependencies import get_current_user
from app.models.user import User
from app.utils.file_upload import save_upload_file
from app.utils.responses import ok

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    sub_dir: str = "materials",
    current_user: User = Depends(get_current_user),
):
    url = await save_upload_file(file, sub_dir=sub_dir)
    return ok(data={"url": url}, message="Upload thanh cong", status_code=201)
