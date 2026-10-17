from sqlalchemy.ext.asyncio import AsyncSession

from app.content.exercises import exercise_starter, local_supported
from app.domain.errors import ResourceNotFound
from app.models.tables import Exercise, User
from app.ports.execution import ExecutionRequest, ExecutionRunner, TestCase
from app.repositories import learning as records
from app.schemas.contracts import ExecutionResult, ExerciseView
from app.services.catalog import get_lesson, get_topic
from app.services.progress import award


async def exercise_views(items: list[Exercise], session: AsyncSession) -> list[ExerciseView]:
    tests = await records.exercise_tests(session, [item.id for item in items])
    return [
        ExerciseView.model_validate(item).model_copy(
            update={
                "starter_code": exercise_starter(item.solution),
                "kind": "code_writing" if item.kind == "refactoring" else item.kind,
                "sample_stdin": next(
                    (test.stdin.rstrip("\n") for test in tests if test.exercise_id == item.id), ""
                ),
                "test_count": sum(test.exercise_id == item.id for test in tests),
                "local_supported": local_supported(item.solution),
            }
        )
        for item in items
    ]


async def exercises(session: AsyncSession, topic_id: str) -> list[ExerciseView]:
    topic = await get_topic(session, topic_id)
    if not topic.published:
        raise ResourceNotFound("Урок ещё не опубликован")
    return await exercise_views(await records.exercises(session, topic_id=topic_id), session)


async def tasks(session: AsyncSession) -> list[ExerciseView]:
    return await exercise_views(await records.exercises(session, catalog="trainer"), session)


async def complete_lesson(session: AsyncSession, user: User, topic_id: str) -> int:
    await get_lesson(session, topic_id)
    return await award(session, user, "lesson", topic_id, topic_id, 20)


async def submit_exercise(
    session: AsyncSession, user: User, exercise_id: str, code: str, runner: ExecutionRunner
) -> ExecutionResult:
    exercise = await records.exercise(session, exercise_id)
    if exercise is None:
        raise ResourceNotFound("Задание не найдено")
    if exercise.topic_id is not None:
        await get_lesson(session, exercise.topic_id)
    tests = [
        TestCase(stdin=t.stdin, expected_stdout=t.expected_stdout)
        for t in await records.exercise_tests(session, [exercise_id])
    ]
    result = await runner.execute(ExecutionRequest(code=code, tests=tests))
    result.xp = 0  # Only this application can grant XP; the runner is an execution port.
    if result.status == "passed" and result.total == result.passed == len(tests) and tests:
        result.xp = await award(
            session,
            user,
            "trainer" if exercise.catalog == "trainer" else "exercise",
            exercise.id,
            exercise.topic_id,
            30,
        )
    return result
