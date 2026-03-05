"""File upload utilities.

Currently saves files to a local `uploads/` directory relative to where the
server is started.  Replace `save_upload_file` with cloud-storage logic (e.g.
Azure Blob Storage) when moving to production.
"""

import os
import uuid
from pathlib import Path

from fastapi import UploadFile, HTTPException

UPLOAD_DIR = Path("uploads")
ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "video/mp4", "video/webm",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
MAX_FILE_SIZE_MB = 50


def ensure_upload_dir() -> None:
    """Create the uploads directory if it doesn't exist."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def save_upload_file(file: UploadFile, sub_dir: str = "") -> str:
    """Save an uploaded file and return a URL-like path string.

    Args:
        file:    The FastAPI UploadFile object.
        sub_dir: Optional sub-directory under UPLOAD_DIR (e.g. "materials").

    Returns:
        A relative URL string like ``/uploads/materials/<uuid>_<filename>``.

    Raises:
        HTTPException 400 if the file type is not allowed or file is too large.
    """
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' is not allowed.",
        )

    dest_dir = UPLOAD_DIR / sub_dir if sub_dir else UPLOAD_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = f"{uuid.uuid4()}_{Path(file.filename or 'file').name}"
    dest_path = dest_dir / safe_filename

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds the {MAX_FILE_SIZE_MB}MB size limit.",
        )

    dest_path.write_bytes(contents)

    # Return a URL path that can be served as a static file
    rel = dest_path.as_posix()
    return f"/{rel}"
