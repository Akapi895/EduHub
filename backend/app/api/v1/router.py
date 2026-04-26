from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    chatbot,
    dashboard,
    exams,
    game_modules,
    game_packages,
    interactive_books,
    library,
    messages,
    notifications,
    submissions,
    upload,
    users,
)
from app.api.v1.endpoints.classes import router as classes_router

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(classes_router)
api_router.include_router(library.router)
api_router.include_router(exams.router)
api_router.include_router(game_modules.router)
api_router.include_router(game_packages.router)
api_router.include_router(submissions.router)
api_router.include_router(messages.router)
api_router.include_router(dashboard.router)
api_router.include_router(chatbot.router)
api_router.include_router(upload.router)
api_router.include_router(notifications.router)
api_router.include_router(interactive_books.router)
