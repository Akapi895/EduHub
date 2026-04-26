from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.models.package_attempt import PackageAttempt, PackageQuestionAttempt
from app.models.question_bank import QuestionBankItem, QuestionItemTextConfig
from app.utils.datetime_utils import now_local_naive
from app.utils.enums import (
    PackageAttemptStatus,
    QuestionAttemptStatus,
    QuestionType,
    TextGradingMode,
)


def _normalize_text(value: str, config: QuestionItemTextConfig) -> str:
    normalized = value or ""
    if config.trim_whitespace:
        normalized = " ".join(normalized.split())
    if config.ignore_punctuation:
        normalized = re.sub(r"[^\w\s]", "", normalized)
    if not config.case_sensitive:
        normalized = normalized.lower()
    return normalized.strip()


def _grade_text_answer(question: QuestionBankItem, answer_text: str) -> tuple[float | None, bool | None, bool]:
    text_config = question.text_config
    if not text_config or text_config.grading_mode == TextGradingMode.manual or text_config.manual_grading_required:
        return None, None, True

    normalized_answer = _normalize_text(answer_text, text_config)
    accepted = [
        (_normalize_text(item.answer_text, text_config), item.score_ratio)
        for item in sorted(text_config.accepted_answers, key=lambda item: item.order_index)
    ]

    def accepted_score() -> float:
        scores = [ratio for expected, ratio in accepted if expected and expected == normalized_answer]
        return max(scores, default=0.0)

    def keyword_score() -> float:
        if not text_config.keywords:
            return 0.0

        total_weight = sum(keyword.weight for keyword in text_config.keywords)
        if total_weight <= 0:
            return 0.0

        matched_weight = 0.0
        for keyword in text_config.keywords:
            probe = _normalize_text(keyword.keyword, text_config)
            if not probe:
                continue
            matched = probe in normalized_answer
            if keyword.is_required and not matched:
                return 0.0
            if matched:
                matched_weight += keyword.weight
        return min(1.0, matched_weight / total_weight)

    ratio = 0.0
    if text_config.grading_mode == TextGradingMode.exact_match:
        ratio = accepted_score()
    elif text_config.grading_mode == TextGradingMode.normalized_exact:
        ratio = accepted_score()
    elif text_config.grading_mode == TextGradingMode.keyword:
        ratio = keyword_score()
    elif text_config.grading_mode == TextGradingMode.hybrid:
        ratio = max(accepted_score(), keyword_score())

    score = round(float(question.points) * ratio, 2)
    return score, ratio >= 1.0, False


def _default_feedback(question: QuestionBankItem, *, is_correct: bool | None, requires_manual: bool) -> str | None:
    if question.explanation:
        return question.explanation
    if requires_manual:
        return "Awaiting manual grading"
    if is_correct is None:
        return None
    return "Correct answer" if is_correct else "Incorrect answer"


def grade_question_attempt(question_attempt: PackageQuestionAttempt) -> bool:
    question = question_attempt.question_item
    question_attempt.graded_at = now_local_naive()

    if question.type in (QuestionType.single_choice, QuestionType.multi_choice):
        correct_ids = {option.id for option in question.options if option.is_correct}
        selected_ids = {selected.option_id for selected in question_attempt.selected_options}
        score = float(question.points) if correct_ids and selected_ids == correct_ids else 0.0
        question_attempt.score_awarded = score
        question_attempt.is_correct = score > 0
        question_attempt.status = QuestionAttemptStatus.graded
        question_attempt.resolved_at = now_local_naive()
        question_attempt.feedback_message = _default_feedback(question, is_correct=question_attempt.is_correct, requires_manual=False)
        return False

    if question.type == QuestionType.matching:
        left_items = sorted(question.matching_left_items, key=lambda item: item.order_index)
        answer_by_left = {answer.left_item_id: answer for answer in question_attempt.matching_answers}
        is_correct = bool(left_items)
        for left_item in left_items:
            answer = answer_by_left.get(left_item.id)
            if not answer or answer.selected_right_key != left_item.correct_right_key:
                is_correct = False
                if answer:
                    answer.is_correct = False
            else:
                answer.is_correct = True
        score = float(question.points) if is_correct else 0.0
        question_attempt.score_awarded = score
        question_attempt.is_correct = is_correct
        question_attempt.status = QuestionAttemptStatus.graded
        question_attempt.resolved_at = now_local_naive()
        question_attempt.feedback_message = _default_feedback(question, is_correct=is_correct, requires_manual=False)
        return False

    if question.type == QuestionType.text:
        raw_answer = question_attempt.text_answer.raw_answer if question_attempt.text_answer else ""
        score, is_correct, requires_manual = _grade_text_answer(question, raw_answer)
        question_attempt.score_awarded = score
        question_attempt.is_correct = is_correct
        if question_attempt.text_answer and question.text_config:
            question_attempt.text_answer.normalized_answer = _normalize_text(raw_answer, question.text_config)
            question_attempt.text_answer.score_awarded = score
        question_attempt.feedback_message = _default_feedback(question, is_correct=is_correct, requires_manual=requires_manual)
        if requires_manual:
            question_attempt.status = QuestionAttemptStatus.pending_manual
            return True

        question_attempt.status = QuestionAttemptStatus.graded
        question_attempt.resolved_at = now_local_naive()
        return False

    question_attempt.status = QuestionAttemptStatus.pending_manual
    question_attempt.feedback_message = _default_feedback(question, is_correct=None, requires_manual=True)
    return True


def recalculate_attempt_scores(submission: PackageAttempt, *, finalize_status: bool) -> bool:
    score_question = 0.0
    has_manual = False
    all_resolved = True

    for question_attempt in submission.question_attempts:
        if question_attempt.score_awarded is not None:
            score_question += question_attempt.score_awarded
        if question_attempt.status == QuestionAttemptStatus.pending_manual:
            has_manual = True
        if question_attempt.status not in (
            QuestionAttemptStatus.graded,
            QuestionAttemptStatus.resolved,
            QuestionAttemptStatus.pending_manual,
        ):
            all_resolved = False

    submission.score_question = round(score_question, 2)
    submission.score_total = round(score_question + float(submission.score_context or 0.0), 2)
    if finalize_status and all_resolved:
        submission.status = PackageAttemptStatus.submitted if has_manual else PackageAttemptStatus.graded
    return has_manual


def auto_grade(db: Session, submission: PackageAttempt) -> PackageAttempt:
    for question_attempt in submission.question_attempts:
        grade_question_attempt(question_attempt)

    recalculate_attempt_scores(submission, finalize_status=True)
    db.commit()
    db.refresh(submission)
    return submission


def auto_grade_question_attempt(db: Session, question_attempt: PackageQuestionAttempt) -> PackageQuestionAttempt:
    submission = question_attempt.package_attempt
    grade_question_attempt(question_attempt)
    recalculate_attempt_scores(submission, finalize_status=False)
    if submission.status != PackageAttemptStatus.completed:
        submission.status = PackageAttemptStatus.in_progress
    db.commit()
    db.refresh(question_attempt)
    return question_attempt


def grade_answer(db: Session, *, question_attempt: PackageQuestionAttempt, score: float, grader_id: str) -> PackageQuestionAttempt:
    question_attempt.score_awarded = score
    question_attempt.graded_by = grader_id
    question_attempt.graded_at = now_local_naive()
    question_attempt.resolved_at = now_local_naive()
    question_attempt.status = QuestionAttemptStatus.graded
    question_attempt.is_correct = score >= float(question_attempt.question_item.points)

    if question_attempt.text_answer:
        question_attempt.text_answer.score_awarded = score

    submission = question_attempt.package_attempt
    recalculate_attempt_scores(submission, finalize_status=True)

    db.commit()
    db.refresh(question_attempt)
    return question_attempt
