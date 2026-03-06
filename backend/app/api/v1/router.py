from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, chatbot, dashboard, messages, submissions, exams, library, upload
from app.api.v1.endpoints.classes import router as classes_router

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(classes_router)
api_router.include_router(library.router)
api_router.include_router(exams.router)
api_router.include_router(submissions.router)
api_router.include_router(messages.router)
api_router.include_router(dashboard.router)
api_router.include_router(chatbot.router)
api_router.include_router(upload.router)
