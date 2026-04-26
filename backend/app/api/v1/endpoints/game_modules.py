from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_teacher
from app.crud import game as game_crud
from app.db.session import get_db
from app.models.user import User
from app.services.game_seed_service import ensure_default_game_modules
from app.utils.responses import ok

router = APIRouter(tags=["Game Modules"])


@router.get("/game-modules")
def list_game_modules(
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    _ = teacher
    ensure_default_game_modules(db)
    modules = [module for module in game_crud.list_game_modules(db) if module.status == "active"]
    return ok(data=[game_crud.serialize_game_module(module) for module in modules])
