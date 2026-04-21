"""File upload utilities — Cloudinary backend."""

import cloudinary
import cloudinary.uploader
from fastapi import UploadFile, HTTPException

from app.core.config import settings

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "video/mp4", "video/webm",
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave",
    "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/flac", "audio/x-flac",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
MAX_FILE_SIZE_MB = 50

# Configure Cloudinary once at import time
cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True,
)


async def save_upload_file(file: UploadFile, sub_dir: str = "") -> str:
    """Upload a file to Cloudinary and return the public URL.

    Args:
        file:    The FastAPI UploadFile object.
        sub_dir: Cloudinary folder (e.g. "materials", "avatars").

    Returns:
        The Cloudinary secure URL of the uploaded file.

    Raises:
        HTTPException 400 if the file type is not allowed or file is too large.
    """
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' is not allowed.",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds the {MAX_FILE_SIZE_MB}MB size limit.",
        )

    folder = f"eduhub/{sub_dir}" if sub_dir else "eduhub"

    # Determine resource_type based on content type
    resource_type = "auto"
    if file.content_type and (file.content_type.startswith("video/") or file.content_type.startswith("audio/")):
        resource_type = "video"

    try:
        result = cloudinary.uploader.upload(
            contents,
            folder=folder,
            resource_type=resource_type,
            use_filename=True,
            unique_filename=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    return result["secure_url"]
