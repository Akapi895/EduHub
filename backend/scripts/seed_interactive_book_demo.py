from __future__ import annotations

import math
import random
import struct
import sys
import wave
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterable

from alembic import command
from alembic.config import Config
from sqlalchemy.orm import Session


BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.core.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.crud import user as user_crud  # noqa: E402
from app.db import init_db as _init_db  # noqa: F401,E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.interactive_book import (  # noqa: E402
    InteractiveBook,
    InteractiveBookAction,
    InteractiveBookAttempt,
    InteractiveBookEvent,
    InteractiveBookMedia,
    InteractiveBookQuiz,
    InteractiveBookQuizOption,
    InteractiveBookScene,
    InteractiveBookSceneElement,
    InteractiveBookTransition,
    InteractiveBookVideoInteraction,
    InteractiveBookVideoOption,
)
from app.models.material import Material  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services import interactive_book_service  # noqa: E402
from app.utils.enums import InteractiveBookStatus, MaterialType, UserRole  # noqa: E402


TEACHER_EMAIL = "demo.teacher@example.com"
STUDENT_EMAIL = "demo.student@example.com"
SEEDED_PASSWORD = "TestPass123!"
BOOK_TITLE = "Mock Demo - Sách tương tác Cậu bé thông minh"
BOOK_DESCRIPTION = (
    "Bộ mock để kiểm thử trình phát sách tương tác với slideshow, hotspot, video timecode, "
    "quiz và branching. Nội dung được phỏng tác từ đề xuất 'Cậu bé thông minh'."
)
BOOK_SUBJECT = "Tiếng Việt"
BOOK_GRADE = "3"

STATIC_ROOT = PROJECT_ROOT / "frontend" / "public" / "mock" / "interactive-books" / "cau-be-thong-minh"
AUDIO_ROOT = STATIC_ROOT / "audio"
STATIC_BASE_URL = "/mock/interactive-books/cau-be-thong-minh"

MOCK_IMAGE_URLS = {
    "timeline_map": f"{STATIC_BASE_URL}/event-map.svg",
    "intro_card": f"{STATIC_BASE_URL}/01-gioi-thieu.svg",
    "quan_card": f"{STATIC_BASE_URL}/02-quan-hoi.svg",
    "buffalo_card": f"{STATIC_BASE_URL}/03-trau-duc-de.svg",
    "sparrow_card": f"{STATIC_BASE_URL}/04-chim-se.svg",
    "thread_card": f"{STATIC_BASE_URL}/05-soi-chi.svg",
    "intro_poster": f"{STATIC_BASE_URL}/video-intro-poster.svg",
    "quan_hotspot": f"{STATIC_BASE_URL}/quiz-quan-hoi.svg",
    "buffalo_poster": f"{STATIC_BASE_URL}/buffalo-poster.svg",
    "buffalo_success": f"{STATIC_BASE_URL}/buffalo-success.svg",
    "sparrow_branching": f"{STATIC_BASE_URL}/sparrow-branching.svg",
    "thread_shell": f"{STATIC_BASE_URL}/thread-shell.svg",
}

REMOTE_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"


def ensure_schema() -> None:
    alembic_config = Config(str(BACKEND_ROOT / "alembic.ini"))
    alembic_config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    alembic_config.set_main_option("sqlalchemy.url", settings.normalized_database_url)
    command.upgrade(alembic_config, "head")


def write_text_file(path: Path, content: str) -> None:
    normalized = content.strip() + "\n"
    if path.exists():
        try:
            if path.read_text(encoding="utf-8") == normalized:
                return
        except OSError:
            pass
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(normalized, encoding="utf-8")


def card_svg(*, title: str, subtitle: str, accent: str, accent_soft: str, badge: str) -> str:
    return f"""
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" fill="none">
  <defs>
    <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="55%" stop-color="{accent_soft}" />
      <stop offset="100%" stop-color="#fde68a" />
    </linearGradient>
    <linearGradient id="hill" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="#bbf7d0" />
      <stop offset="100%" stop-color="#86efac" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" rx="36" fill="url(#sky)" />
  <circle cx="1060" cy="132" r="64" fill="#fff7ed" opacity="0.92" />
  <path d="M0 530C110 468 220 448 332 470C438 492 522 548 632 560C760 574 862 508 972 486C1086 462 1178 476 1280 534V720H0V530Z" fill="url(#hill)" />
  <path d="M0 590C112 560 230 550 352 570C496 594 620 650 764 650C898 650 1048 594 1168 582C1208 578 1245 580 1280 588V720H0V590Z" fill="#4ade80" opacity="0.5" />
  <g opacity="0.28">
    <path d="M160 112L212 148L170 196" stroke="{accent}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M1080 188L1138 226L1090 278" stroke="{accent}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M958 86L992 106L966 138" stroke="{accent}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
  </g>
  <rect x="92" y="88" width="226" height="58" rx="29" fill="{accent}" />
  <text x="205" y="124" fill="white" font-size="24" font-weight="700" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">{badge}</text>
  <rect x="88" y="152" width="1104" height="370" rx="40" fill="white" opacity="0.88" />
  <text x="116" y="248" fill="#0f172a" font-size="60" font-weight="700" font-family="Segoe UI, Arial, sans-serif">{title}</text>
  <text x="116" y="314" fill="#334155" font-size="28" font-weight="500" font-family="Segoe UI, Arial, sans-serif">{subtitle}</text>
  <g transform="translate(824 208)">
    <rect width="272" height="186" rx="28" fill="{accent_soft}" />
    <circle cx="84" cy="78" r="42" fill="{accent}" opacity="0.85" />
    <rect x="132" y="46" width="96" height="20" rx="10" fill="white" opacity="0.8" />
    <rect x="132" y="82" width="74" height="16" rx="8" fill="white" opacity="0.7" />
    <rect x="132" y="116" width="108" height="16" rx="8" fill="white" opacity="0.7" />
    <path d="M22 150C50 126 96 126 126 150C156 174 214 174 248 148" stroke="{accent}" stroke-width="12" stroke-linecap="round" />
  </g>
  <rect x="112" y="560" width="400" height="82" rx="28" fill="white" opacity="0.8" />
  <text x="144" y="610" fill="#334155" font-size="24" font-weight="600" font-family="Segoe UI, Arial, sans-serif">Mock asset để kiểm thử player, preview và thẻ thư viện.</text>
</svg>
"""


def event_map_svg() -> str:
    cards = [
        (120, 120, 286, 182, "#0ea5e9", "Giới thiệu chung", "Video mở đầu"),
        (496, 120, 286, 182, "#f97316", "Quan hỏi", "Quiz câu đố"),
        (872, 120, 286, 182, "#84cc16", "Ba con trâu đực đẻ", "Video có timecode"),
        (250, 396, 286, 182, "#ec4899", "Con chim sẻ", "Nhánh lựa chọn"),
        (742, 396, 286, 182, "#8b5cf6", "Sợi chỉ", "Quiz vỏ ốc"),
    ]
    card_markup = []
    for x, y, w, h, color, title, subtitle in cards:
        card_markup.append(
            f"""
  <g>
    <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="28" fill="white" opacity="0.94" />
    <rect x="{x + 22}" y="{y + 22}" width="{w - 44}" height="18" rx="9" fill="{color}" opacity="0.92" />
    <text x="{x + 28}" y="{y + 92}" fill="#0f172a" font-size="34" font-weight="700" font-family="Segoe UI, Arial, sans-serif">{title}</text>
    <text x="{x + 28}" y="{y + 136}" fill="#475569" font-size="24" font-weight="500" font-family="Segoe UI, Arial, sans-serif">{subtitle}</text>
    <circle cx="{x + w - 42}" cy="{y + h - 40}" r="18" fill="{color}" opacity="0.9" />
  </g>
"""
        )
    return (
        """
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#eff6ff" />
      <stop offset="100%" stop-color="#fef3c7" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" rx="36" fill="url(#bg)" />
  <path d="M0 562C154 508 294 500 426 536C578 578 734 650 886 630C1036 610 1140 544 1280 540V720H0V562Z" fill="#bbf7d0" opacity="0.8" />
  <text x="640" y="70" fill="#0f172a" font-size="40" font-weight="700" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">Bấm vào từng ô để mở một nhánh truyện</text>
  <text x="640" y="104" fill="#475569" font-size="22" font-weight="500" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">Hotspot đã đặt đúng vị trí với 5 sự kiện của mock flow</text>
"""
        + "".join(card_markup)
        + """
  <rect x="380" y="630" width="520" height="48" rx="24" fill="white" opacity="0.84" />
  <text x="640" y="661" fill="#334155" font-size="22" font-weight="600" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">Sau mỗi nhánh, bấm 'Cảnh tiếp theo' hoặc 'Tổng quan' để thử nhanh nhánh khác.</text>
</svg>
"""
    )


def create_mock_assets() -> None:
    write_text_file(
        STATIC_ROOT / "01-gioi-thieu.svg",
        card_svg(
            title="Giới thiệu chung",
            subtitle="Cánh đồng, diều bay và lời mở đầu về cậu bé thông minh.",
            accent="#0ea5e9",
            accent_soft="#dbeafe",
            badge="Cảnh 1",
        ),
    )
    write_text_file(
        STATIC_ROOT / "02-quan-hoi.svg",
        card_svg(
            title="Quan hỏi",
            subtitle="Bấm vào viên quan, nghe câu hỏi rồi trả lời trắc nghiệm.",
            accent="#f97316",
            accent_soft="#ffedd5",
            badge="Cảnh 2",
        ),
    )
    write_text_file(
        STATIC_ROOT / "03-trau-duc-de.svg",
        card_svg(
            title="Ba con trâu đực đẻ",
            subtitle="Video dừng tại timecode và yêu cầu học sinh chọn hướng xử lý.",
            accent="#84cc16",
            accent_soft="#ecfccb",
            badge="Cảnh 3",
        ),
    )
    write_text_file(
        STATIC_ROOT / "04-chim-se.svg",
        card_svg(
            title="Con chim sẻ",
            subtitle="So sánh các cách đối đáp trước bài toán phi lý của nhà vua.",
            accent="#ec4899",
            accent_soft="#fce7f3",
            badge="Cảnh 4",
        ),
    )
    write_text_file(
        STATIC_ROOT / "05-soi-chi.svg",
        card_svg(
            title="Sợi chỉ qua vỏ ốc",
            subtitle="Quiz mô phỏng mẹo dùng kiến để đưa sợi chỉ đi xuyên qua vỏ ốc.",
            accent="#8b5cf6",
            accent_soft="#ede9fe",
            badge="Cảnh 5",
        ),
    )
    write_text_file(
        STATIC_ROOT / "video-intro-poster.svg",
        card_svg(
            title="Video giới thiệu",
            subtitle="Poster dùng cho cảnh mở đầu, tự phát khi vào scene.",
            accent="#0284c7",
            accent_soft="#e0f2fe",
            badge="Áp phích",
        ),
    )
    write_text_file(
        STATIC_ROOT / "quiz-quan-hoi.svg",
        card_svg(
            title="Quan hỏi: trỏ vào viên quan",
            subtitle="Mock hình nền có điểm bấm để kích hoạt âm thanh rồi mở quiz.",
            accent="#ea580c",
            accent_soft="#ffedd5",
            badge="Điểm chạm",
        ),
    )
    write_text_file(
        STATIC_ROOT / "buffalo-poster.svg",
        card_svg(
            title="Video branching",
            subtitle="Cảnh vua giao bài toán ba con trâu đực đẻ, có lựa chọn giữa video.",
            accent="#65a30d",
            accent_soft="#ecfccb",
            badge="Video",
        ),
    )
    write_text_file(
        STATIC_ROOT / "buffalo-success.svg",
        card_svg(
            title="Vượt ải ba con trâu đực",
            subtitle="Cảnh thành công sau khi học sinh chọn đúng trong video branching.",
            accent="#16a34a",
            accent_soft="#dcfce7",
            badge="Thành công",
        ),
    )
    write_text_file(
        STATIC_ROOT / "sparrow-branching.svg",
        card_svg(
            title="Con chim sẻ",
            subtitle="Ba cách xử lý khác nhau, một cách đúng và hai cách sai có retry.",
            accent="#db2777",
            accent_soft="#fce7f3",
            badge="Nhánh",
        ),
    )
    write_text_file(
        STATIC_ROOT / "thread-shell.svg",
        card_svg(
            title="Vỏ ốc và sợi chỉ",
            subtitle="Quiz tổng hợp để học sinh chọn cách đưa sợi chỉ qua vỏ ốc.",
            accent="#7c3aed",
            accent_soft="#ede9fe",
            badge="Câu hỏi",
        ),
    )
    write_text_file(STATIC_ROOT / "event-map.svg", event_map_svg())

    AUDIO_ROOT.mkdir(parents=True, exist_ok=True)
    write_wave_file(AUDIO_ROOT / "field-breeze.wav", duration_seconds=8.0, base_frequency=196.0, overtone=247.0, noise_level=0.14, decay=0.1)
    write_wave_file(AUDIO_ROOT / "story-flute.wav", duration_seconds=7.0, base_frequency=523.25, overtone=659.25, noise_level=0.02, decay=0.2, pulse=True)
    write_wave_file(AUDIO_ROOT / "hotspot-chime.wav", duration_seconds=0.9, base_frequency=880.0, overtone=1320.0, noise_level=0.0, decay=1.8)
    write_wave_file(AUDIO_ROOT / "correct-chime.wav", duration_seconds=0.8, base_frequency=1046.5, overtone=1318.5, noise_level=0.0, decay=2.4)
    write_wave_file(AUDIO_ROOT / "wrong-explain.wav", duration_seconds=1.2, base_frequency=220.0, overtone=196.0, noise_level=0.03, decay=1.2)


def write_wave_file(
    path: Path,
    *,
    duration_seconds: float,
    base_frequency: float,
    overtone: float,
    noise_level: float,
    decay: float,
    pulse: bool = False,
) -> None:
    if path.exists():
        return
    sample_rate = 44_100
    total_frames = int(duration_seconds * sample_rate)
    path.parent.mkdir(parents=True, exist_ok=True)
    rng = random.Random(42 + int(base_frequency))

    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        frames = bytearray()
        for frame_index in range(total_frames):
            t = frame_index / sample_rate
            envelope = math.exp(-decay * t)
            if pulse:
                envelope *= 0.6 + 0.4 * math.sin(2 * math.pi * 0.7 * t)

            sample = 0.56 * math.sin(2 * math.pi * base_frequency * t)
            sample += 0.28 * math.sin(2 * math.pi * overtone * t)
            sample += noise_level * (rng.random() * 2 - 1)
            sample *= envelope

            clamped = max(-1.0, min(1.0, sample))
            frames.extend(struct.pack("<h", int(clamped * 32767)))

        wav_file.writeframes(frames)
def ensure_user(
    db: Session,
    *,
    email: str,
    full_name: str,
    role: UserRole,
    password: str,
) -> tuple[User, bool]:
    user = user_crud.get_by_email(db, email)
    created = False
    if not user:
        user = user_crud.create(
            db,
            full_name=full_name,
            email=email,
            password=password,
            role=role,
        )
        created = True
    else:
        user.full_name = full_name
        user.role = role
        user.password_hash = hash_password(password)
        user.is_active = True
        db.commit()
        db.refresh(user)
    return user, created


def _find_existing_book_material(db: Session, teacher_id: str) -> Material | None:
    return (
        db.query(Material)
        .filter(
            Material.created_by == teacher_id,
            Material.material_type == MaterialType.interactive_book,
            Material.title == BOOK_TITLE,
        )
        .first()
    )


def cleanup_duplicate_mock_materials(db: Session, keep_teacher_id: str) -> int:
    duplicates = (
        db.query(Material)
        .filter(
            Material.title == BOOK_TITLE,
            Material.material_type == MaterialType.interactive_book,
            Material.created_by != keep_teacher_id,
        )
        .all()
    )
    removed = 0
    for material in duplicates:
        db.delete(material)
        removed += 1
    if removed:
        db.commit()
    return removed


def _clear_book_attempts(db: Session, interactive_book_id: str) -> int:
    attempt_ids = [
        attempt_id
        for (attempt_id,) in db.query(InteractiveBookAttempt.id)
        .filter(InteractiveBookAttempt.interactive_book_id == interactive_book_id)
        .all()
    ]
    if not attempt_ids:
        return 0
    db.query(InteractiveBookEvent).filter(InteractiveBookEvent.attempt_id.in_(attempt_ids)).delete(synchronize_session=False)
    deleted = (
        db.query(InteractiveBookAttempt)
        .filter(InteractiveBookAttempt.id.in_(attempt_ids))
        .delete(synchronize_session=False)
    )
    return deleted


def _clear_structured_engine(db: Session, interactive_book_id: str) -> None:
    scene_ids = [
        scene_id
        for (scene_id,) in db.query(InteractiveBookScene.id)
        .filter(InteractiveBookScene.interactive_book_id == interactive_book_id)
        .all()
    ]
    quiz_ids = [
        quiz_id
        for (quiz_id,) in db.query(InteractiveBookQuiz.id)
        .filter(InteractiveBookQuiz.interactive_book_id == interactive_book_id)
        .all()
    ]
    video_interaction_ids = [
        interaction_id
        for (interaction_id,) in db.query(InteractiveBookVideoInteraction.id)
        .filter(InteractiveBookVideoInteraction.scene_id.in_(scene_ids))
        .all()
    ] if scene_ids else []

    if video_interaction_ids:
        db.query(InteractiveBookVideoOption).filter(
            InteractiveBookVideoOption.interaction_id.in_(video_interaction_ids),
        ).delete(synchronize_session=False)
    if scene_ids:
        db.query(InteractiveBookVideoInteraction).filter(
            InteractiveBookVideoInteraction.scene_id.in_(scene_ids),
        ).delete(synchronize_session=False)
        db.query(InteractiveBookTransition).filter(
            InteractiveBookTransition.scene_id.in_(scene_ids),
        ).delete(synchronize_session=False)
        db.query(InteractiveBookSceneElement).filter(
            InteractiveBookSceneElement.scene_id.in_(scene_ids),
        ).delete(synchronize_session=False)
        db.query(InteractiveBookScene).filter(
            InteractiveBookScene.id.in_(scene_ids),
        ).delete(synchronize_session=False)
    if quiz_ids:
        db.query(InteractiveBookQuizOption).filter(
            InteractiveBookQuizOption.quiz_id.in_(quiz_ids),
        ).delete(synchronize_session=False)
        db.query(InteractiveBookQuiz).filter(
            InteractiveBookQuiz.id.in_(quiz_ids),
        ).delete(synchronize_session=False)

    db.query(InteractiveBookAction).filter(
        InteractiveBookAction.interactive_book_id == interactive_book_id,
    ).delete(synchronize_session=False)
    db.query(InteractiveBookMedia).filter(
        InteractiveBookMedia.interactive_book_id == interactive_book_id,
    ).delete(synchronize_session=False)
    db.flush()


def _seed_structured_story_engine(db: Session, interactive_book: InteractiveBook) -> None:
    media_items = [
        InteractiveBookMedia(
            interactive_book_id=interactive_book.id,
            media_key="timeline-map",
            media_type="image",
            url=MOCK_IMAGE_URLS["timeline_map"],
            order_index=1,
            metadata_json={"label": "Timeline 5 sự kiện"},
        ),
        InteractiveBookMedia(
            interactive_book_id=interactive_book.id,
            media_key="intro-video-poster",
            media_type="image",
            url=MOCK_IMAGE_URLS["intro_poster"],
            order_index=2,
            metadata_json={"label": "Poster giới thiệu"},
        ),
        InteractiveBookMedia(
            interactive_book_id=interactive_book.id,
            media_key="intro-video",
            media_type="video",
            url=REMOTE_VIDEO_URL,
            order_index=3,
            metadata_json={"label": "Video giới thiệu"},
        ),
        InteractiveBookMedia(
            interactive_book_id=interactive_book.id,
            media_key="quan-hotspot-poster",
            media_type="image",
            url=MOCK_IMAGE_URLS["quan_hotspot"],
            order_index=4,
            metadata_json={"label": "Quan hỏi"},
        ),
        InteractiveBookMedia(
            interactive_book_id=interactive_book.id,
            media_key="buffalo-video-poster",
            media_type="image",
            url=MOCK_IMAGE_URLS["buffalo_poster"],
            order_index=5,
            metadata_json={"label": "Poster ba con trâu đực đẻ"},
        ),
        InteractiveBookMedia(
            interactive_book_id=interactive_book.id,
            media_key="buffalo-video",
            media_type="video",
            url=REMOTE_VIDEO_URL,
            order_index=6,
            metadata_json={"label": "Video branching"},
        ),
        InteractiveBookMedia(
            interactive_book_id=interactive_book.id,
            media_key="sparrow-branching-poster",
            media_type="image",
            url=MOCK_IMAGE_URLS["sparrow_branching"],
            order_index=7,
            metadata_json={"label": "Con chim sẻ"},
        ),
        InteractiveBookMedia(
            interactive_book_id=interactive_book.id,
            media_key="thread-shell-poster",
            media_type="image",
            url=MOCK_IMAGE_URLS["thread_shell"],
            order_index=8,
            metadata_json={"label": "Sợi chỉ qua vỏ ốc"},
        ),
        InteractiveBookMedia(
            interactive_book_id=interactive_book.id,
            media_key="buffalo-success-image",
            media_type="image",
            url=MOCK_IMAGE_URLS["buffalo_success"],
            order_index=9,
            metadata_json={"label": "Vượt ải thành công"},
        ),
    ]
    db.add_all(media_items)
    db.flush()
    media_by_key = {media.media_key: media for media in media_items if media.media_key}

    actions = [
        InteractiveBookAction(
            interactive_book_id=interactive_book.id,
            action_key="play-quan-riddle",
            action_type="play_audio",
            config_json={
                "audio_url": "/mock/interactive-books/cau-be-thong-minh/audio/hotspot-chime.wav",
                "subtitle": "Theo bạn, một ngày trâu của ta cày được mấy đường?",
                "follow_up_interaction_id": "quan-quiz",
                "show_after_audio": True,
            },
            order_index=1,
        ),
        InteractiveBookAction(
            interactive_book_id=interactive_book.id,
            action_key="play-correct-chime",
            action_type="play_audio",
            config_json={"audio_url": "/mock/interactive-books/cau-be-thong-minh/audio/correct-chime.wav"},
            order_index=2,
        ),
        InteractiveBookAction(
            interactive_book_id=interactive_book.id,
            action_key="play-wrong-explain",
            action_type="play_audio",
            config_json={"audio_url": "/mock/interactive-books/cau-be-thong-minh/audio/wrong-explain.wav"},
            order_index=3,
        ),
    ]
    db.add_all(actions)
    db.flush()
    actions_by_key = {action.action_key: action for action in actions if action.action_key}

    quizzes = [
        InteractiveBookQuiz(
            interactive_book_id=interactive_book.id,
            quiz_key="quan-hotspot-quiz",
            question="Theo bạn, một ngày trâu của cậu bé cày được mấy đường?",
            quiz_type="multiple_choice",
            config_json={"subtitle": "Trả lời sau khi nghe câu hỏi của viên quan."},
            order_index=1,
        ),
        InteractiveBookQuiz(
            interactive_book_id=interactive_book.id,
            quiz_key="sparrow-branch-quiz",
            question="Nếu em là cậu bé, em sẽ xử lý con chim sẻ thế nào?",
            quiz_type="multiple_choice",
            config_json={"subtitle": "Đây là tình huống branching theo proposal."},
            order_index=2,
        ),
        InteractiveBookQuiz(
            interactive_book_id=interactive_book.id,
            quiz_key="thread-quiz",
            question="Làm sao đưa sợi chỉ qua vỏ ốc?",
            quiz_type="multiple_choice",
            config_json={"subtitle": "Mục này thay cho mê cung trực quan trong proposal."},
            order_index=3,
        ),
    ]
    db.add_all(quizzes)
    db.flush()
    quizzes_by_key = {quiz.quiz_key: quiz for quiz in quizzes if quiz.quiz_key}

    db.add_all(
        [
            InteractiveBookQuizOption(
                quiz_id=quizzes_by_key["quan-hotspot-quiz"].id,
                option_key="quan-3",
                content="3 đường",
                is_correct=True,
                order_index=1,
                feedback="Đúng. Cậu bé đồng tình và mời bạn đi tiếp.",
                feedback_audio_url=actions_by_key["play-correct-chime"].config_json["audio_url"],
                score_delta=1,
            ),
            InteractiveBookQuizOption(
                quiz_id=quizzes_by_key["quan-hotspot-quiz"].id,
                option_key="quan-5",
                content="5 đường",
                is_correct=False,
                order_index=2,
                feedback="Chưa đúng. Hãy chọn lại sau khi nghe kỹ câu hỏi.",
                feedback_audio_url=actions_by_key["play-wrong-explain"].config_json["audio_url"],
                retry=True,
            ),
            InteractiveBookQuizOption(
                quiz_id=quizzes_by_key["quan-hotspot-quiz"].id,
                option_key="quan-7",
                content="7 đường",
                is_correct=False,
                order_index=3,
                feedback="Quá vội vàng. Thử lại.",
                feedback_audio_url=actions_by_key["play-wrong-explain"].config_json["audio_url"],
                retry=True,
            ),
            InteractiveBookQuizOption(
                quiz_id=quizzes_by_key["sparrow-branch-quiz"].id,
                option_key="sparrow-feast",
                content="Làm thịt chim rồi chia ba mâm cỗ bé xíu",
                is_correct=True,
                order_index=1,
                feedback="Đúng với flow mock: dùng chính sự phi lý để đối lại đề bài phi lý.",
                feedback_audio_url=actions_by_key["play-correct-chime"].config_json["audio_url"],
                score_delta=1,
            ),
            InteractiveBookQuizOption(
                quiz_id=quizzes_by_key["sparrow-branch-quiz"].id,
                option_key="sparrow-raise",
                content="Nhốt chim lại, cho ăn thóc và mời vua đến nghe hót",
                is_correct=False,
                order_index=2,
                feedback="Phương án này ổn về tình cảm, nhưng không giải đúng thử thách.",
                feedback_audio_url=actions_by_key["play-wrong-explain"].config_json["audio_url"],
                retry=True,
            ),
            InteractiveBookQuizOption(
                quiz_id=quizzes_by_key["sparrow-branch-quiz"].id,
                option_key="sparrow-protest",
                content="Nói rằng một con chim không thể bày ra ba mâm cỗ",
                is_correct=False,
                order_index=3,
                feedback="Đã nhìn ra sự vô lý, nhưng cần một đối đáp sắc hơn.",
                feedback_audio_url=actions_by_key["play-wrong-explain"].config_json["audio_url"],
                retry=True,
            ),
            InteractiveBookQuizOption(
                quiz_id=quizzes_by_key["thread-quiz"].id,
                option_key="thread-ant",
                content="Buộc sợi chỉ vào chân kiến để kiến bò qua vỏ ốc",
                is_correct=True,
                order_index=1,
                feedback="Chính xác. Đây là mẹo thông minh dùng sức vật nhỏ.",
                feedback_audio_url=actions_by_key["play-correct-chime"].config_json["audio_url"],
                score_delta=2,
            ),
            InteractiveBookQuizOption(
                quiz_id=quizzes_by_key["thread-quiz"].id,
                option_key="thread-force",
                content="Đẩy thẳng sợi chỉ vào trong vỏ ốc",
                is_correct=False,
                order_index=2,
                feedback="Cách này khó thực hiện với vỏ ốc xoắn.",
                feedback_audio_url=actions_by_key["play-wrong-explain"].config_json["audio_url"],
                retry=True,
            ),
            InteractiveBookQuizOption(
                quiz_id=quizzes_by_key["thread-quiz"].id,
                option_key="thread-break",
                content="Đập vỏ ốc ra để xong nhanh",
                is_correct=False,
                order_index=3,
                feedback="Nếu đập vỏ ốc thì câu đố không còn ý nghĩa.",
                feedback_audio_url=actions_by_key["play-wrong-explain"].config_json["audio_url"],
                retry=True,
            ),
        ],
    )
    db.flush()

    scenes = [
        InteractiveBookScene(
            interactive_book_id=interactive_book.id,
            scene_key="timeline",
            title="5 sự kiện chính",
            scene_type="timeline",
            order_index=0,
            background_media_id=media_by_key["timeline-map"].id,
            auto_play=False,
            content_json={
                "text": "Timeline sự kiện theo proposal. Mỗi thẻ đại diện cho một scene và được sắp xếp bằng order_index trong DB.",
                "background_audio_url": "/mock/interactive-books/cau-be-thong-minh/audio/story-flute.wav",
                "mode": "ordered_scenes",
            },
        ),
        InteractiveBookScene(
            interactive_book_id=interactive_book.id,
            scene_key="intro-video",
            title="Giới thiệu chung",
            scene_type="interactive_video",
            order_index=1,
            background_media_id=media_by_key["intro-video-poster"].id,
            auto_play=True,
            content_json={
                "text": "Video mở đầu tự động phát khi vào scene, đúng theo mapping bước 2.1 trong proposal.",
                "timeline_summary": "Video giới thiệu cậu bé và bối cảnh đồng quê.",
                "background_audio_url": "/mock/interactive-books/cau-be-thong-minh/audio/field-breeze.wav",
            },
        ),
        InteractiveBookScene(
            interactive_book_id=interactive_book.id,
            scene_key="quan-hotspot",
            title="Quan hỏi: Trâu một ngày cày được mấy đường?",
            scene_type="hotspot_audio",
            order_index=2,
            background_media_id=media_by_key["quan-hotspot-poster"].id,
            content_json={
                "text": "Scene hotspot → phát âm thanh → hiện quiz. Đây là điểm lệch lớn của bản cũ và đã được sửa trong runtime mới.",
                "timeline_summary": "Ảnh + hotspot + âm thanh + câu hỏi trắc nghiệm.",
                "background_audio_url": "/mock/interactive-books/cau-be-thong-minh/audio/field-breeze.wav",
            },
        ),
        InteractiveBookScene(
            interactive_book_id=interactive_book.id,
            scene_key="buffalo-video",
            title="Ba con trâu đực đẻ",
            scene_type="interactive_video",
            order_index=3,
            background_media_id=media_by_key["buffalo-video-poster"].id,
            auto_play=False,
            content_json={
                "text": "Video branching dừng ở timestamp để học sinh chọn hướng đi tiếp.",
                "timeline_summary": "Video rẽ nhánh tại timecode.",
            },
        ),
        InteractiveBookScene(
            interactive_book_id=interactive_book.id,
            scene_key="sparrow-branch",
            title="Con chim sẻ",
            scene_type="branching",
            order_index=4,
            background_media_id=media_by_key["sparrow-branching-poster"].id,
            content_json={
                "text": "Scene branching tái dùng quiz engine để so sánh các cách xử lý.",
                "timeline_summary": "Lựa chọn hành động và nhận phản hồi ngay.",
            },
        ),
        InteractiveBookScene(
            interactive_book_id=interactive_book.id,
            scene_key="thread-quiz",
            title="Sợi chỉ qua vỏ ốc",
            scene_type="quiz",
            order_index=5,
            background_media_id=media_by_key["thread-shell-poster"].id,
            content_json={
                "text": "Scene quiz/puzzle mô phỏng bài toán sợi chỉ theo proposal.",
                "timeline_summary": "Quiz trực quan cho bài toán sợi chỉ.",
                "background_audio_url": "/mock/interactive-books/cau-be-thong-minh/audio/story-flute.wav",
            },
        ),
        InteractiveBookScene(
            interactive_book_id=interactive_book.id,
            scene_key="buffalo-success",
            title="Vượt ải ba con trâu đực",
            scene_type="slideshow",
            order_index=6,
            background_media_id=media_by_key["buffalo-success-image"].id,
            content_json={
                "text": "Nhánh thành công sau khi chọn đúng trong video branching.",
                "images": [MOCK_IMAGE_URLS["buffalo_card"], MOCK_IMAGE_URLS["buffalo_success"]],
                "timeline_exclude": True,
            },
        ),
    ]
    db.add_all(scenes)
    db.flush()
    scenes_by_key = {scene.scene_key: scene for scene in scenes}

    db.add_all(
        [
            InteractiveBookSceneElement(
                scene_id=scenes_by_key["intro-video"].id,
                element_key="intro-video-element",
                element_type="video",
                media_id=media_by_key["intro-video"].id,
                order_index=1,
                config_json={},
            ),
            InteractiveBookSceneElement(
                scene_id=scenes_by_key["quan-hotspot"].id,
                element_key="quan-hotspot-element",
                element_type="hotspot",
                action_id=actions_by_key["play-quan-riddle"].id,
                order_index=1,
                config_json={
                    "interaction_id": "quan-hotspot",
                    "prompt": "Bấm vào viên quan để nghe câu hỏi",
                    "x": 47,
                    "y": 46,
                    "subtitle": "Sau khi âm thanh kết thúc, một quiz sẽ hiện ra.",
                    "show_after_audio": True,
                    "follow_up_interaction_id": "quan-quiz",
                    "audio_url": actions_by_key["play-quan-riddle"].config_json["audio_url"],
                },
            ),
            InteractiveBookSceneElement(
                scene_id=scenes_by_key["quan-hotspot"].id,
                element_key="quan-quiz-element",
                element_type="quiz",
                quiz_id=quizzes_by_key["quan-hotspot-quiz"].id,
                order_index=2,
                config_json={
                    "interaction_id": "quan-quiz",
                    "trigger": "on_complete",
                    "interaction_type": "multiple_choice",
                    "subtitle": "Quiz chỉ mở sau khi hotspot audio chạy xong.",
                    "success_audio_url": actions_by_key["play-correct-chime"].config_json["audio_url"],
                    "error_audio_url": actions_by_key["play-wrong-explain"].config_json["audio_url"],
                },
            ),
            InteractiveBookSceneElement(
                scene_id=scenes_by_key["buffalo-video"].id,
                element_key="buffalo-video-element",
                element_type="video",
                media_id=media_by_key["buffalo-video"].id,
                order_index=1,
                config_json={},
            ),
            InteractiveBookSceneElement(
                scene_id=scenes_by_key["sparrow-branch"].id,
                element_key="sparrow-quiz-element",
                element_type="quiz",
                quiz_id=quizzes_by_key["sparrow-branch-quiz"].id,
                order_index=1,
                config_json={
                    "interaction_id": "sparrow-branching",
                    "trigger": "on_enter",
                    "interaction_type": "branching_prompt",
                    "subtitle": "Branching scene theo proposal.",
                    "success_audio_url": actions_by_key["play-correct-chime"].config_json["audio_url"],
                    "error_audio_url": actions_by_key["play-wrong-explain"].config_json["audio_url"],
                },
            ),
            InteractiveBookSceneElement(
                scene_id=scenes_by_key["thread-quiz"].id,
                element_key="thread-quiz-element",
                element_type="quiz",
                quiz_id=quizzes_by_key["thread-quiz"].id,
                order_index=1,
                config_json={
                    "interaction_id": "thread-quiz",
                    "trigger": "on_enter",
                    "interaction_type": "multiple_choice",
                    "subtitle": "Quiz thay cho mê cung vỏ ốc.",
                    "success_audio_url": actions_by_key["play-correct-chime"].config_json["audio_url"],
                    "error_audio_url": actions_by_key["play-wrong-explain"].config_json["audio_url"],
                },
            ),
        ],
    )
    db.flush()

    db.add_all(
        [
            InteractiveBookTransition(
                scene_id=scenes_by_key["intro-video"].id,
                trigger_type="default_next",
                next_scene_key="quan-hotspot",
                order_index=1,
            ),
            InteractiveBookTransition(
                scene_id=scenes_by_key["quan-hotspot"].id,
                trigger_type="default_next",
                next_scene_key="buffalo-video",
                order_index=1,
            ),
            InteractiveBookTransition(
                scene_id=scenes_by_key["sparrow-branch"].id,
                trigger_type="default_next",
                next_scene_key="thread-quiz",
                order_index=1,
            ),
            InteractiveBookTransition(
                scene_id=scenes_by_key["thread-quiz"].id,
                trigger_type="default_next",
                next_scene_key="timeline",
                order_index=1,
            ),
            InteractiveBookTransition(
                scene_id=scenes_by_key["buffalo-success"].id,
                trigger_type="default_next",
                next_scene_key="sparrow-branch",
                order_index=1,
            ),
        ],
    )
    db.flush()

    video_interaction = InteractiveBookVideoInteraction(
        scene_id=scenes_by_key["buffalo-video"].id,
        interaction_key="buffalo-choice",
        timestamp=2.5,
        prompt="Nếu em là cậu bé, em sẽ xử lý thế nào?",
        config_json={
            "interaction_type": "choose_path",
            "subtitle": "Video dừng tại timecode rồi cho học sinh chọn hướng đi tiếp.",
            "success_audio_url": actions_by_key["play-correct-chime"].config_json["audio_url"],
            "error_audio_url": actions_by_key["play-wrong-explain"].config_json["audio_url"],
        },
        order_index=1,
    )
    db.add(video_interaction)
    db.flush()
    db.add_all(
        [
            InteractiveBookVideoOption(
                interaction_id=video_interaction.id,
                option_key="buffalo-cry",
                label="Khóc lóc xin vua rút lệnh",
                is_correct=False,
                retry=True,
                order_index=1,
                feedback="Sai. Chỉ khóc lóc thì bài toán vẫn chưa được giải.",
                feedback_audio_url=actions_by_key["play-wrong-explain"].config_json["audio_url"],
            ),
            InteractiveBookVideoOption(
                interaction_id=video_interaction.id,
                option_key="buffalo-think",
                label="Bình tĩnh xem đây là câu đố để tìm cách đối đáp",
                next_scene_key="buffalo-success",
                is_correct=True,
                retry=False,
                order_index=2,
                feedback="Đúng. Video branching chuyển sang scene tiếp theo.",
                feedback_audio_url=actions_by_key["play-correct-chime"].config_json["audio_url"],
                score_delta=2,
            ),
        ],
    )
    db.flush()


def ensure_interactive_book(db: Session, *, teacher: User) -> tuple[Material, InteractiveBook, bool, int]:
    thumbnail_url = MOCK_IMAGE_URLS["timeline_map"]
    material = _find_existing_book_material(db, teacher.id)
    created = False

    if not material:
        material = Material(
            title=BOOK_TITLE,
            description=BOOK_DESCRIPTION,
            thumbnail_url=thumbnail_url,
            file_url=None,
            material_type=MaterialType.interactive_book,
            subject=BOOK_SUBJECT,
            grade=BOOK_GRADE,
            is_system=True,
            created_by=teacher.id,
        )
        db.add(material)
        db.flush()
        created = True
    else:
        material.title = BOOK_TITLE
        material.description = BOOK_DESCRIPTION
        material.thumbnail_url = thumbnail_url
        material.file_url = None
        material.material_type = MaterialType.interactive_book
        material.subject = BOOK_SUBJECT
        material.grade = BOOK_GRADE
        material.is_system = True

    interactive_book = material.interactive_book
    if not interactive_book:
        interactive_book = InteractiveBook(
            material_id=material.id,
            created_by=teacher.id,
        )
        db.add(interactive_book)
        db.flush()

    deleted_attempts = _clear_book_attempts(db, interactive_book.id)
    _clear_structured_engine(db, interactive_book.id)
    _seed_structured_story_engine(db, interactive_book)
    interactive_book.entry_scene_id = "timeline"

    db.flush()
    db.expire(interactive_book, ["scenes", "media_assets", "quizzes", "actions", "material"])
    generated_manifest = interactive_book_service._build_manifest_from_structured_engine(interactive_book)
    interactive_book.status = InteractiveBookStatus.published
    interactive_book.draft_manifest = generated_manifest
    interactive_book.published_manifest = generated_manifest
    interactive_book.manifest_version = 1
    interactive_book.entry_scene_id = generated_manifest["entry_scene_id"]
    interactive_book.estimated_duration = 15
    interactive_book.created_by = teacher.id
    interactive_book.published_at = datetime.now(UTC)

    db.commit()
    db.refresh(material)
    db.refresh(interactive_book)
    return material, interactive_book, created, deleted_attempts


def print_summary(
    *,
    teacher_created: bool,
    student_created: bool,
    book_created: bool,
    cleared_attempts: int,
    removed_duplicates: int,
    material_id: str,
) -> None:
    lines: Iterable[str] = [
        "",
        "Interactive book mock seed completed.",
        f"Teacher account: {TEACHER_EMAIL} / {SEEDED_PASSWORD} ({'created' if teacher_created else 'updated'})",
        f"Student account: {STUDENT_EMAIL} / {SEEDED_PASSWORD} ({'created' if student_created else 'updated'})",
        f"Interactive book: {BOOK_TITLE} ({'created' if book_created else 'updated'})",
        f"Material id: {material_id}",
        f"Cleared old attempts: {cleared_attempts}",
        f"Removed duplicate mock books: {removed_duplicates}",
        "",
        "Mock assets were written to:",
        f"  {STATIC_ROOT}",
        "",
        "Suggested test URLs after starting the app:",
        "  Teacher library: http://127.0.0.1:5173/teacher/library",
        "  Student library: http://127.0.0.1:5173/student/library",
        "  Teacher editor direct route: http://127.0.0.1:5173/teacher/interactive-books/" + material_id,
        "  Student player direct route: http://127.0.0.1:5173/student/interactive-books/" + material_id,
        "",
    ]


def main() -> int:
    ensure_schema()
    create_mock_assets()

    db = SessionLocal()
    try:
        teacher, teacher_created = ensure_user(
            db,
            email=TEACHER_EMAIL,
            full_name="Demo Teacher",
            role=UserRole.teacher,
            password=SEEDED_PASSWORD,
        )
        student, student_created = ensure_user(
            db,
            email=STUDENT_EMAIL,
            full_name="Demo Student",
            role=UserRole.student,
            password=SEEDED_PASSWORD,
        )
        removed_duplicates = cleanup_duplicate_mock_materials(db, teacher.id)
        material, _, book_created, cleared_attempts = ensure_interactive_book(
            db,
            teacher=teacher,
        )
        print_summary(
            teacher_created=teacher_created,
            student_created=student_created,
            book_created=book_created,
            cleared_attempts=cleared_attempts,
            removed_duplicates=removed_duplicates,
            material_id=material.id,
        )
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
