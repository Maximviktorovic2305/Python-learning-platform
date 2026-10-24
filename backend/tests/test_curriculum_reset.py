from sqlalchemy import func, select

from app.models.tables import AuthSession, Completion, Exercise, Lesson, Question, User
from app.reset_learning import reset_learning


async def test_reset_keeps_exact_account_and_reseeds_course(database, student):
    _, factory = database
    async with factory.begin() as session:
        user = await session.scalar(select(User).where(User.email == "student@example.com"))
        assert user is not None
        kept_id, password_hash = user.id, user.password_hash
        user.total_xp = 100
        session.add(User(email="removed@example.com", username="removed", password_hash="not-used"))
    async with factory.begin() as session:
        report = await reset_learning(session, "STUDENT@EXAMPLE.COM")
        assert report == {"users_before": 2, "users_deleted": 1, "users_remaining": 1}
    async with factory() as session:
        users = list(await session.scalars(select(User)))
        assert len(users) == 1
        assert users[0].id == kept_id
        assert users[0].password_hash == password_hash
        assert users[0].total_xp == users[0].streak == 0
        assert await session.scalar(select(func.count()).select_from(AuthSession)) == 0
        assert await session.scalar(select(func.count()).select_from(Completion)) == 0
        assert await session.scalar(select(func.count()).select_from(Lesson)) == 50
        assert await session.scalar(select(func.count()).select_from(Exercise)) == 172
        assert await session.scalar(select(func.count()).select_from(Question)) == 1096


async def test_reset_refuses_missing_account_before_deleting(database, student):
    _, factory = database
    async with factory.begin() as session:
        import pytest

        with pytest.raises(ValueError, match="exactly one"):
            await reset_learning(session, "missing@example.com")
    async with factory() as session:
        assert await session.scalar(select(func.count()).select_from(User)) == 1
        assert await session.scalar(select(func.count()).select_from(Lesson)) == 50
