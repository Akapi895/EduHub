from __future__ import annotations

from dataclasses import dataclass
from sqlalchemy.orm import Session, selectinload

from app.crud import class_crud
from app.models.class_model import ClassStudent
from app.models.content_package import (
    ContentPackage,
    ContentPackageAccessRule,
    ContentPackageAssignment,
    ContentPackagePublication,
    GamePackageConfig,
)
from app.models.game_module import GameModule
from app.models.question_bank import QuestionBank, QuestionBankItem, QuestionItemTextConfig
from app.models.user import User
from app.utils.datetime_utils import now_local_naive
from app.utils.enums import ContentPackageType


@dataclass(frozen=True)
class GameAccessContext:
    allowed: bool
    play_context: str | None = None
    class_id: str | None = None
    access_rule_id: str | None = None
    reason: str | None = None


def _is_active_window(start_at, end_at) -> bool:
    now = now_local_naive()
    if start_at and start_at > now:
        return False
    if end_at and end_at < now:
        return False
    return True


def _is_active_publication(publication: ContentPackagePublication) -> bool:
    return (
        publication.channel == "game_hub"
        and publication.status == "published"
        and _is_active_window(publication.start_at, publication.end_at)
    )


def _rule_matches_student(db: Session, *, rule: ContentPackageAccessRule, student: User) -> bool:
    if not rule.is_active or rule.permission != "play" or not _is_active_window(rule.start_at, rule.end_at):
        return False
    if rule.audience_type == "all_students":
        return student.role == "student"
    if rule.audience_type == "role":
        return rule.audience_id == student.role
    if rule.audience_type == "user":
        return rule.audience_id == student.id
    if rule.audience_type == "class" and rule.audience_id:
        return class_crud.is_member(db, class_id=rule.audience_id, user_id=student.id)
    return False


def resolve_student_game_access(db: Session, *, package: ContentPackage, student: User) -> GameAccessContext:
    if package.status == "archived":
        return GameAccessContext(allowed=False, reason="Game package is archived")

    for assignment in package.assignments:
        if assignment.is_active and class_crud.is_member(db, class_id=assignment.class_id, user_id=student.id):
            return GameAccessContext(
                allowed=True,
                play_context="class_assignment",
                class_id=assignment.class_id,
            )

    hub_publication = next((item for item in package.publications if _is_active_publication(item)), None)
    if not hub_publication or package.status != "published":
        return GameAccessContext(allowed=False, reason="Game package is not published to the game hub")

    matching_rules = [rule for rule in package.access_rules if _rule_matches_student(db, rule=rule, student=student)]
    if any(rule.effect == "deny" for rule in matching_rules):
        return GameAccessContext(allowed=False, reason="Game package is not available for this account")

    allow_rule = next((rule for rule in matching_rules if rule.effect == "allow"), None)
    if allow_rule:
        return GameAccessContext(
            allowed=True,
            play_context="game_hub",
            access_rule_id=allow_rule.id,
        )

    return GameAccessContext(allowed=False, reason="Game package is not available for this account")


def _accessible_game_query(db: Session):
    return (
        db.query(ContentPackage)
        .options(
            selectinload(ContentPackage.assignments).selectinload(ContentPackageAssignment.class_),
            selectinload(ContentPackage.publications),
            selectinload(ContentPackage.access_rules),
            selectinload(ContentPackage.game_config)
            .selectinload(GamePackageConfig.game_module)
            .selectinload(GameModule.trigger_mappings),
            selectinload(ContentPackage.question_bank)
            .selectinload(QuestionBank.items)
            .selectinload(QuestionBankItem.options),
            selectinload(ContentPackage.question_bank)
            .selectinload(QuestionBank.items)
            .selectinload(QuestionBankItem.matching_left_items),
            selectinload(ContentPackage.question_bank)
            .selectinload(QuestionBank.items)
            .selectinload(QuestionBankItem.matching_right_items),
            selectinload(ContentPackage.question_bank)
            .selectinload(QuestionBank.items)
            .selectinload(QuestionBankItem.text_config)
            .selectinload(QuestionItemTextConfig.accepted_answers),
            selectinload(ContentPackage.question_bank)
            .selectinload(QuestionBank.items)
            .selectinload(QuestionBankItem.text_config)
            .selectinload(QuestionItemTextConfig.keywords),
        )
        .filter(ContentPackage.package_type == ContentPackageType.game)
        .order_by(ContentPackage.created_at.desc())
    )


def list_accessible_game_packages(db: Session, *, student: User) -> list[tuple[ContentPackage, GameAccessContext]]:
    class_ids = [
        membership.class_id
        for membership in db.query(ClassStudent).filter(ClassStudent.student_id == student.id).all()
    ]
    packages = _accessible_game_query(db).filter(ContentPackage.status != "archived").all()
    result: list[tuple[ContentPackage, GameAccessContext]] = []
    seen_package_ids: set[str] = set()

    for package in packages:
        context = resolve_student_game_access(db, package=package, student=student)
        if context.allowed and package.id not in seen_package_ids:
            result.append((package, context))
            seen_package_ids.add(package.id)

    # Keep class_ids read intentional: it warms the membership relation path and documents
    # that class-assigned packages remain part of the accessible set.
    _ = class_ids
    return result
