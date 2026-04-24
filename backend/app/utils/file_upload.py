"""File upload utilities for Cloudinary-backed assets."""

from dataclasses import dataclass
import logging
from pathlib import PurePosixPath
import re
from urllib.parse import urlsplit

import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url, private_download_url
from fastapi import HTTPException, UploadFile

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
CLOUDINARY_HOST = "res.cloudinary.com"

IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
VIDEO_EXTENSIONS = {"mp4", "webm"}
AUDIO_EXTENSIONS = {"mp3", "wav", "ogg", "m4a", "aac", "flac"}
SIGNED_DOWNLOAD_EXTENSIONS = {"pdf", "docx", "pptx", "xlsx"}
ALLOWED_FILE_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS | AUDIO_EXTENSIONS | SIGNED_DOWNLOAD_EXTENSIONS
SAFE_SUB_DIR_PATTERN = re.compile(r"^[a-z0-9]+(?:[a-z0-9/_-]*[a-z0-9])?$")

logger = logging.getLogger(__name__)


cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True,
)


@dataclass(frozen=True)
class UploadedAssetInfo:
    url: str
    resource_type: str
    content_type: str | None
    file_extension: str | None
    thumbnail_url: str | None


@dataclass(frozen=True)
class ParsedCloudinaryAsset:
    resource_type: str
    version: int | None
    public_id: str
    download_public_id: str
    format: str | None


def get_file_extension(file_url: str | None) -> str | None:
    if not file_url:
        return None
    path = urlsplit(file_url).path
    suffix = PurePosixPath(path).suffix.lower().lstrip(".")
    return suffix or None


def infer_file_preview_kind(file_url: str | None, *, material_type: str | None = None) -> str:
    extension = get_file_extension(file_url)
    if material_type == "video" or extension in VIDEO_EXTENSIONS:
        return "video"
    if extension in IMAGE_EXTENSIONS:
        return "image"
    if extension in AUDIO_EXTENSIONS:
        return "audio"
    if extension == "pdf":
        return "pdf"
    return "none"


def _requires_signed_delivery(file_url: str | None) -> bool:
    return get_file_extension(file_url) in SIGNED_DOWNLOAD_EXTENSIONS


def _infer_resource_type(file: UploadFile) -> str:
    content_type = (file.content_type or "").lower()
    extension = get_file_extension(file.filename or "")
    if content_type.startswith("video/") or content_type.startswith("audio/"):
        return "video"
    if content_type == "application/pdf" or extension == "pdf":
        # Keep PDFs as image assets so Cloudinary can render page thumbnails.
        return "image"
    if content_type.startswith("image/") or extension in IMAGE_EXTENSIONS:
        return "image"
    return "raw"


def normalize_upload_sub_dir(sub_dir: str | None) -> str:
    normalized = (sub_dir or "").strip().strip("/")
    if not normalized:
        return ""
    if ".." in normalized or len(normalized) > 64 or not SAFE_SUB_DIR_PATTERN.fullmatch(normalized):
        raise HTTPException(status_code=400, detail="Upload target is not allowed.")
    return normalized


def parse_cloudinary_asset_url(file_url: str | None) -> ParsedCloudinaryAsset | None:
    if not file_url:
        return None

    parsed = urlsplit(file_url)
    if parsed.netloc != CLOUDINARY_HOST:
        return None

    segments = [segment for segment in parsed.path.split("/") if segment]
    if len(segments) < 5 or "upload" not in segments:
        return None

    resource_type = segments[1]
    upload_index = segments.index("upload")
    version_index = next(
        (index for index in range(upload_index + 1, len(segments)) if re.fullmatch(r"v\d+", segments[index])),
        None,
    )
    if version_index is None or version_index >= len(segments) - 1:
        return None

    public_path = "/".join(segments[version_index + 1:])
    extension = get_file_extension(public_path)
    if resource_type in {"image", "video"} and extension:
        public_id = public_path[: -(len(extension) + 1)]
        download_public_id = public_id
    else:
        public_id = public_path
        download_public_id = public_path

    return ParsedCloudinaryAsset(
        resource_type=resource_type,
        version=int(segments[version_index][1:]),
        public_id=public_id,
        download_public_id=download_public_id,
        format=extension,
    )


def infer_material_thumbnail_url(file_url: str | None, *, material_type: str | None = None) -> str | None:
    preview_kind = infer_file_preview_kind(file_url, material_type=material_type)
    if preview_kind == "image":
        return file_url
    if preview_kind != "pdf":
        return None

    parsed_asset = parse_cloudinary_asset_url(file_url)
    if not parsed_asset or parsed_asset.resource_type != "image":
        return None

    generated_url, _ = cloudinary_url(
        parsed_asset.public_id,
        resource_type="image",
        format="jpg",
        page=1,
        version=parsed_asset.version,
        secure=True,
    )
    return generated_url


def build_material_access_urls(
    file_url: str | None,
    *,
    material_type: str | None = None,
    download_name: str | None = None,
) -> dict[str, str | None]:
    if not file_url:
        return {"preview_kind": "none", "preview_url": None, "download_url": None}

    preview_kind = infer_file_preview_kind(file_url, material_type=material_type)
    preview_url = file_url if preview_kind != "none" else None
    download_url = file_url

    if _requires_signed_delivery(file_url):
        parsed_asset = parse_cloudinary_asset_url(file_url)
        if parsed_asset and parsed_asset.format:
            shared_options = {
                "resource_type": parsed_asset.resource_type,
                "type": "upload",
            }
            inline_url = private_download_url(
                parsed_asset.download_public_id,
                parsed_asset.format,
                **shared_options,
            )
            if preview_kind == "pdf":
                preview_url = inline_url
            download_url = private_download_url(
                parsed_asset.download_public_id,
                parsed_asset.format,
                attachment=download_name,
                **shared_options,
            )

    return {
        "preview_kind": preview_kind,
        "preview_url": preview_url,
        "download_url": download_url,
    }


async def save_upload_file(file: UploadFile, sub_dir: str = "") -> UploadedAssetInfo:
    """Upload a file to Cloudinary and return normalized metadata."""
    content_type = (file.content_type or "").lower()
    extension = get_file_extension(file.filename or "")
    normalized_sub_dir = normalize_upload_sub_dir(sub_dir)

    if not extension or extension not in ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="File extension is not allowed.",
        )

    if content_type and content_type not in ALLOWED_MIME_TYPES:
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

    folder = f"eduhub/{normalized_sub_dir}" if normalized_sub_dir else "eduhub"
    resource_type = _infer_resource_type(file)

    try:
        result = cloudinary.uploader.upload(
            contents,
            folder=folder,
            resource_type=resource_type,
            use_filename=True,
            unique_filename=True,
        )
    except Exception as exc:
        logger.exception(
            "Cloudinary upload failed for sub_dir=%s filename=%s",
            normalized_sub_dir,
            file.filename,
        )
        raise HTTPException(status_code=500, detail="Upload failed.") from exc

    file_url = result["secure_url"]
    return UploadedAssetInfo(
        url=file_url,
        resource_type=result.get("resource_type", resource_type),
        content_type=file.content_type,
        file_extension=get_file_extension(file.filename or file_url),
        thumbnail_url=infer_material_thumbnail_url(file_url),
    )
