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
    slideshow = "slideshow"
    interactive_video = "interactive_video"
    branching = "branching"
    quiz = "quiz"
    hotspot_audio = "hotspot_audio"
    mini_game = "mini_game"
    vr_scene = "vr_scene"


class InteractiveBookTrigger(str, Enum):
    on_enter = "on_enter"
    timecode = "timecode"
    on_click = "on_click"
    on_choice = "on_choice"
    on_complete = "on_complete"

