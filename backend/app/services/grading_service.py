from sqlalchemy.orm import Session
from app.models.submission import Submission, Answer, AnswerOption
from app.models.question import Question, QuestionOption
from app.utils.enums import QuestionType, SubmissionStatus


def auto_grade(db: Session, submission: Submission) -> Submission:
    """Auto-grade single_choice and multi_choice questions; skip text/image_upload."""
    total_score = 0.0
    for answer in submission.answers:
        question: Question = answer.question
        if question.type == QuestionType.single_choice:
            correct_ids = {o.id for o in question.options if o.is_correct}
            selected_ids = {ao.option_id for ao in answer.selected_options}
            if selected_ids == correct_ids:
                answer.score = float(question.points)
            else:
                answer.score = 0.0
            total_score += answer.score
        elif question.type == QuestionType.multi_choice:
            correct_ids = {o.id for o in question.options if o.is_correct}
            selected_ids = {ao.option_id for ao in answer.selected_options}
            if selected_ids == correct_ids:
                answer.score = float(question.points)
            else:
                answer.score = 0.0
            total_score += answer.score
        elif question.type == QuestionType.matching:
            # Check each matching pair
            # For simplicity: full points if all correct, 0 otherwise
            answer.score = None  # manual grading for matching
        else:
            answer.score = None  # text / image_upload = manual

    submission.total_score = total_score
    submission.status = SubmissionStatus.graded
    db.commit()
    db.refresh(submission)
    return submission
