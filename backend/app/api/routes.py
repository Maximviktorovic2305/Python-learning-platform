from fastapi import APIRouter

from app.api.routers import (
    assessment,
    auth,
    catalog,
    learning,
    operations,
    progress,
    projects,
    users,
)

router = APIRouter()
router.include_router(operations.router)
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(catalog.router)
router.include_router(learning.router)
router.include_router(assessment.router)
router.include_router(progress.router)
router.include_router(projects.router)
