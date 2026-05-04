from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_student, require_teacher
from app.crud import class_crud
from app.crud import game as game_crud
from app.crud import game_card as card_pair_crud
from app.db.session import get_db
from app.models.game_card import GameCardPair
from app.models.question_bank import QuestionBankItem
from app.models.user import User
from app.schemas.game import (
    GameCardPairCreate,
    GameCardPairUpdate,
    GameCompleteRequest,
    GamePackageCreate,
    GamePackagePublicationUpdate,
    GamePackageUpdate,
    GameQuestionCreate,
    GameQuestionUpdate,
    GameRuntimeAnswerRequest,
    GameRuntimeEventRequest,
    GameRuntimeTriggerRequest,
)
from app.services import game_access_service, game_leaderboard_service, game_runtime_service
from app.services.game_seed_service import ensure_default_game_modules
from app.utils.responses import ok

router = APIRouter(tags=["Game Packages"])


def _assert_teacher_class(db: Session, *, class_id: str, teacher: User):
    class_ = class_crud.get_class(db, class_id)
    if not class_ or class_.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Class not found")
    return class_


def _assert_teacher_package(db: Session, *, package_id: str, teacher: User):
    package = game_crud.get_game_package(db, package_id)
    if not package:
        raise HTTPException(status_code=404, detail="Game package not found")
    if package.created_by == teacher.id:
        return package
    if any(assignment.class_ and assignment.class_.teacher_id == teacher.id for assignment in package.assignments):
        return package
    raise HTTPException(status_code=403, detail="Forbidden")


def _assert_teacher_question(db: Session, *, question_id: str, teacher: User) -> QuestionBankItem:
    question = game_crud.get_question(db, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Game question not found")
    if not question.question_bank or not question.question_bank.package:
        raise HTTPException(status_code=404, detail="Game package not found")
    package = question.question_bank.package
    if package.created_by == teacher.id or any(
        assignment.class_ and assignment.class_.teacher_id == teacher.id for assignment in package.assignments
    ):
        return question
    raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/game-packages/my-all")
def list_my_game_packages(
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
):
    return ok(data=game_runtime_service.list_my_game_packages(db, student=student))


@router.get("/game-hub/games")
def list_game_hub_packages(
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
):
    return ok(data=game_runtime_service.list_my_game_packages(db, student=student))


@router.get("/game-packages")
def list_teacher_game_packages(
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    ensure_default_game_modules(db)
    packages = game_crud.get_game_packages_for_teacher(db, teacher.id)
    return ok(data=[game_crud.serialize_game_package(package) for package in packages])


@router.get("/classes/{class_id}/game-packages")
def list_class_game_packages(
    class_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    _assert_teacher_class(db, class_id=class_id, teacher=teacher)
    ensure_default_game_modules(db)
    packages = game_crud.get_game_packages_for_class(db, class_id)
    return ok(data=[game_crud.serialize_game_package(package, class_id=class_id) for package in packages])


@router.post("/classes/{class_id}/game-packages", status_code=201)
def create_game_package(
    class_id: str,
    data: GamePackageCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    _assert_teacher_class(db, class_id=class_id, teacher=teacher)
    ensure_default_game_modules(db)
    module = game_crud.get_game_module(db, data.game_module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Game module not found")

    package = game_crud.create_game_package(db, class_id=class_id, created_by=teacher.id, data=data)
    return ok(data=game_crud.serialize_game_package(package, class_id=class_id), status_code=201)


@router.post("/game-packages", status_code=201)
def create_standalone_game_package(
    data: GamePackageCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    ensure_default_game_modules(db)
    module = game_crud.get_game_module(db, data.game_module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Game module not found")

    package = game_crud.create_game_package(db, created_by=teacher.id, data=data)
    return ok(data=game_crud.serialize_game_package(package), status_code=201)


@router.get("/game-packages/{package_id}/play")
def get_game_play_data(
    package_id: str,
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
):
    return ok(data=game_runtime_service.get_play_data(db, package_id=package_id, student=student))


@router.post("/game-packages/{package_id}/start")
def start_game_attempt(
    package_id: str,
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
):
    return ok(data=game_runtime_service.start_or_resume_attempt(db, package_id=package_id, student=student))


@router.post("/game-packages/{package_id}/runtime/trigger")
def trigger_runtime_question(
    package_id: str,
    data: GameRuntimeTriggerRequest,
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
):
    return ok(data=game_runtime_service.handle_trigger(db, package_id=package_id, student=student, data=data))


@router.post("/game-packages/{package_id}/runtime/answers")
def submit_runtime_answer(
    package_id: str,
    data: GameRuntimeAnswerRequest,
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
):
    return ok(data=game_runtime_service.submit_runtime_answer(db, package_id=package_id, student=student, data=data))


@router.post("/game-packages/{package_id}/runtime/events")
def log_runtime_event(
    package_id: str,
    data: GameRuntimeEventRequest,
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
):
    return ok(data=game_runtime_service.log_runtime_event(db, package_id=package_id, student=student, data=data))


@router.post("/game-packages/{package_id}/complete")
def complete_game_attempt(
    package_id: str,
    data: GameCompleteRequest,
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
):
    return ok(data=game_runtime_service.complete_attempt(db, package_id=package_id, student=student, data=data))


@router.get("/game-packages/{package_id}")
def get_game_package(
    package_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    package = _assert_teacher_package(db, package_id=package_id, teacher=teacher)
    return ok(data=game_crud.serialize_game_package(package))


@router.put("/game-packages/{package_id}")
def update_game_package(
    package_id: str,
    data: GamePackageUpdate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    package = _assert_teacher_package(db, package_id=package_id, teacher=teacher)
    if data.game_module_id:
        ensure_default_game_modules(db)
        module = game_crud.get_game_module(db, data.game_module_id)
        if not module:
            raise HTTPException(status_code=404, detail="Game module not found")
    try:
        updated = game_crud.update_game_package(db, package=package, data=data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ok(data=game_crud.serialize_game_package(updated))


@router.put("/game-packages/{package_id}/publication")
def update_game_package_publication(
    package_id: str,
    data: GamePackagePublicationUpdate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    package = _assert_teacher_package(db, package_id=package_id, teacher=teacher)
    updated = game_crud.publish_game_package_to_hub(db, package=package, teacher_id=teacher.id, data=data)
    return ok(data=game_crud.serialize_game_package(updated))


def _assert_leaderboard_access(db: Session, *, package_id: str, current_user: User):
    package = game_crud.get_game_package(db, package_id)
    if not package:
        raise HTTPException(status_code=404, detail="Game package not found")
    if current_user.role == "teacher":
        return _assert_teacher_package(db, package_id=package_id, teacher=current_user)
    if current_user.role == "student":
        access = game_access_service.resolve_student_game_access(db, package=package, student=current_user)
        if not access.allowed:
            raise HTTPException(status_code=403, detail=access.reason or "Forbidden")
        return package
    raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/game-packages/{package_id}/leaderboard")
def get_game_leaderboard(
    package_id: str,
    scope: str = "global",
    scope_id: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_leaderboard_access(db, package_id=package_id, current_user=current_user)
    return ok(
        data=game_leaderboard_service.get_leaderboard(
            db,
            package_id=package_id,
            current_user_id=current_user.id,
            scope_type=scope,
            scope_id=scope_id,
            limit=limit,
        )
    )


@router.get("/game-packages/{package_id}/leaderboard/me")
def get_my_game_leaderboard_entry(
    package_id: str,
    scope: str = "global",
    scope_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_leaderboard_access(db, package_id=package_id, current_user=current_user)
    leaderboard = game_leaderboard_service.get_leaderboard(
        db,
        package_id=package_id,
        current_user_id=current_user.id,
        scope_type=scope,
        scope_id=scope_id,
        limit=100,
    )
    return ok(data=leaderboard["current_user_entry"])


@router.delete("/game-packages/{package_id}")
def delete_game_package(
    package_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    package = _assert_teacher_package(db, package_id=package_id, teacher=teacher)
    game_crud.delete_game_package(db, package=package)
    return ok(message="Game package deleted")


@router.get("/game-packages/{package_id}/questions")
def list_game_questions(
    package_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    _ = _assert_teacher_package(db, package_id=package_id, teacher=teacher)
    questions = game_crud.get_questions(db, package_id)
    return ok(data=[game_crud.serialize_game_question(question, package_id=package_id, include_correct=True) for question in questions])


@router.post("/game-packages/{package_id}/questions", status_code=201)
def create_game_question(
    package_id: str,
    data: GameQuestionCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    package = _assert_teacher_package(db, package_id=package_id, teacher=teacher)
    try:
        question = game_crud.create_question(db, package_id=package.id, data=data, created_by=teacher.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ok(
        data=game_crud.serialize_game_question(question, package_id=package.id, include_correct=True),
        status_code=201,
    )


@router.put("/game-questions/{question_id}")
def update_game_question(
    question_id: str,
    data: GameQuestionUpdate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    question = _assert_teacher_question(db, question_id=question_id, teacher=teacher)
    try:
        updated = game_crud.update_question(db, question=question, data=data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ok(
        data=game_crud.serialize_game_question(updated, package_id=updated.question_bank.package_id, include_correct=True)
    )


@router.delete("/game-questions/{question_id}")
def delete_game_question(
    question_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    question = _assert_teacher_question(db, question_id=question_id, teacher=teacher)
    game_crud.delete_question(db, question=question)
    return ok(message="Game question deleted")


@router.get("/game-attempts/{attempt_id}")
def get_game_attempt_detail(
    attempt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ok(data=game_runtime_service.get_attempt_detail_for_user(db, attempt_id=attempt_id, current_user=current_user))


# ── Card Pairs (Memory Card / pair-matching games) ─────────────────────────

def _assert_teacher_card_pair(db: Session, *, pair_id: str, teacher: User) -> GameCardPair:
    pair = card_pair_crud.get_card_pair(db, pair_id)
    if not pair:
        raise HTTPException(status_code=404, detail="Card pair not found")
    package = game_crud.get_game_package(db, pair.package_id)
    if not package:
        raise HTTPException(status_code=404, detail="Game package not found")
    if package.created_by == teacher.id or any(
        a.class_ and a.class_.teacher_id == teacher.id for a in package.assignments
    ):
        return pair
    raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/game-packages/{package_id}/card-pairs")
def list_card_pairs(
    package_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    _assert_teacher_package(db, package_id=package_id, teacher=teacher)
    pairs = card_pair_crud.get_card_pairs(db, package_id)
    return ok(data=[card_pair_crud.serialize_card_pair(p) for p in pairs])


@router.post("/game-packages/{package_id}/card-pairs", status_code=201)
def create_card_pair(
    package_id: str,
    data: GameCardPairCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    _assert_teacher_package(db, package_id=package_id, teacher=teacher)
    pair = card_pair_crud.create_card_pair(db, package_id=package_id, data=data)
    return ok(data=card_pair_crud.serialize_card_pair(pair), status_code=201)


@router.put("/game-card-pairs/{pair_id}")
def update_card_pair(
    pair_id: str,
    data: GameCardPairUpdate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    pair = _assert_teacher_card_pair(db, pair_id=pair_id, teacher=teacher)
    updated = card_pair_crud.update_card_pair(db, pair=pair, data=data)
    return ok(data=card_pair_crud.serialize_card_pair(updated))


@router.delete("/game-card-pairs/{pair_id}")
def delete_card_pair(
    pair_id: str,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    pair = _assert_teacher_card_pair(db, pair_id=pair_id, teacher=teacher)
    card_pair_crud.delete_card_pair(db, pair=pair)
    return ok(message="Card pair deleted")
