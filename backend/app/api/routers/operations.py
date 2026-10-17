from fastapi import APIRouter

from app.api.dependencies import Session
from app.schemas.contracts import (
    Message,
)
from app.services.operations import ready

router = APIRouter(prefix="/api")


@router.get("/health", response_model=Message, tags=["operations"])
async def health(session: Session) -> Message:
    await ready(session)
    return Message(message="ok")
