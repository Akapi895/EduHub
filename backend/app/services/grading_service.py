from sqlalchemy.orm import Session
from app.models.submission import Submission, Answer, AnswerOption
from app.models.question import Question, QuestionOption
from app.utils.enums import QuestionType, SubmissionStatus
import json


def auto_grade(db: Session, submission: Submission) -> Submission:
    """Auto-grade single_choice, multi_choice, and matching questions; skip text/image_upload."""
    total_score = 0.0
    has_manual = False

    for answer in submission.answers:
        question: Question = answer.question

        if question.type == QuestionType.single_choice:
            correct_ids = {o.id for o in question.options if o.is_correct}
            selected_ids = {ao.option_id for ao in answer.selected_options}
            scored = float(question.points) if (selected_ids == correct_ids and len(selected_ids) > 0) else 0.0
            answer.score = scored
            total_score += scored

        elif question.type == QuestionType.multi_choice:
            correct_ids = {o.id for o in question.options if o.is_correct}
            selected_ids = {ao.option_id for ao in answer.selected_options}
            scored = float(question.points) if (selected_ids == correct_ids and len(selected_ids) > 0) else 0.0
            answer.score = scored
            total_score += scored

        elif question.type == QuestionType.matching:
            # Auto-grade matching: compare student answers with correct pairs
            try:
                student_answers = json.loads(answer.text_answer or '[]')
            except (json.JSONDecodeError, TypeError):
                student_answers = []

            pairs = question.matching_pairs
            correct_count = 0
            total_pairs = len(pairs)

            for idx, pair in enumerate(pairs):
                student_val = student_answers[idx] if idx < len(student_answers) else ''
                if student_val == pair.right_text:
                    correct_count += 1

            scored = float(question.points) if (total_pairs > 0 and correct_count == total_pairs) else 0.0
            answer.score = scored
            total_score += scored

        else:
            # text / image_upload = manual grading needed
            answer.score = None
            has_manual = True

    submission.total_score = total_score
    if has_manual:
        submission.status = SubmissionStatus.submitted
    else:
        submission.status = SubmissionStatus.graded
    db.commit()
    db.refresh(submission)
    return submission


def grade_answer(db: Session, *, answer: Answer, score: float, grader_id: str) -> Answer:
    """Teacher manually grades a single answer (for text/image_upload questions)."""
    from datetime import datetime
    old_score = answer.score or 0.0
    answer.score = score
    answer.graded_by = grader_id
    answer.graded_at = datetime.now()

    # Update submission total_score
    submission = answer.submission
    submission.total_score = (submission.total_score or 0.0) - old_score + score

    # Check if all answers are now graded
    all_graded = all(a.score is not None for a in submission.answers)
    if all_graded:
        submission.status = SubmissionStatus.graded

    db.commit()
    db.refresh(answer)
    return answer
