from enum import Enum


class UserRole(str, Enum):
    teacher = "teacher"
    student = "student"
    admin = "admin"


class MaterialType(str, Enum):
    book = "book"
    exam = "exam"
    video = "video"
    reference = "reference"
    document = "document"
    interactive_book = "interactive_book"
    game_package = "game_package"


class ExamStatus(str, Enum):
    upcoming = "upcoming"
    open = "open"
    closed = "closed"


class QuestionType(str, Enum):
    single_choice = "single_choice"
    multi_choice = "multi_choice"
    text = "text"
    image_upload = "image_upload"
    matching = "matching"


class SubmissionStatus(str, Enum):
    in_progress = "in_progress"
    submitted = "submitted"
    graded = "graded"


class ContentPackageType(str, Enum):
    exam = "exam"
    game = "game"


class ContentPackageStatus(str, Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class DifficultyBand(str, Enum):
    recognition = "recognition"
    comprehension = "comprehension"
    application_basic = "application_basic"
    application_advanced = "application_advanced"


class TextInputVariant(str, Enum):
    short_text = "short_text"
    paragraph = "paragraph"


class TextGradingMode(str, Enum):
    exact_match = "exact_match"
    normalized_exact = "normalized_exact"
    keyword = "keyword"
    hybrid = "hybrid"
    manual = "manual"


class PackageAttemptStatus(str, Enum):
    in_progress = "in_progress"
    submitted = "submitted"
    graded = "graded"
    completed = "completed"
    abandoned = "abandoned"


class QuestionAttemptStatus(str, Enum):
    presented = "presented"
    answered = "answered"
    pending_manual = "pending_manual"
    graded = "graded"
    resolved = "resolved"


class QuestionSourceContext(str, Enum):
    exam_sequence = "exam_sequence"
    game_trigger = "game_trigger"


class GameModuleStatus(str, Enum):
    draft = "draft"
    active = "active"
    archived = "archived"


class InteractiveBookStatus(str, Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class InteractiveBookAttemptStatus(str, Enum):
    in_progress = "in_progress"
    completed = "completed"
    abandoned = "abandoned"


class InteractiveBookSceneType(str, Enum):
    timeline = "timeline"
    media = "media"
    slideshow = "slideshow"
    interactive_video = "interactive_video"
    branching = "branching"
    quiz = "quiz"
    hotspot_audio = "hotspot_audio"
    connect_the_dots = "connect_the_dots"
    mini_game = "mini_game"
    vr_scene = "vr_scene"


class InteractiveBookTrigger(str, Enum):
    on_enter = "on_enter"
    timecode = "timecode"
    on_click = "on_click"
    on_choice = "on_choice"
    on_complete = "on_complete"

