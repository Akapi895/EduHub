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

