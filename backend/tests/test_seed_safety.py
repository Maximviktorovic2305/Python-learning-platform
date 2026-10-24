"""Initial filling must not retire content or erase user learning history."""

from datetime import UTC, date, datetime
from types import SimpleNamespace
from unittest.mock import Mock

from sqlalchemy import select

from app import seed as initializer
from app.models.tables import (
    Answer,
    Completion,
    Exercise,
    ExerciseTest,
    Lesson,
    Level,
    Module,
    Project,
    ProjectSubmission,
    Question,
    QuestionMemory,
    Quiz,
    QuizAttempt,
    Topic,
    User,
)


async def test_initialization_preserves_retired_content_and_its_history(database, student):
    _, factory = database
    now = datetime.now(UTC)
    async with factory.begin() as session:
        user = await session.scalar(select(User).where(User.email == "student@example.com"))
        user_id = user.id
        user.total_xp = 70
        session.add(
            Level(
                id="retired-level",
                course_id="python",
                position=99,
                title="Retired",
                description="Retired",
            )
        )
        await session.flush()
        session.add(
            Module(id="retired-module", level_id="retired-level", position=0, title="Retired")
        )
        await session.flush()
        session.add(
            Topic(
                id="retired-topic",
                module_id="retired-module",
                position=0,
                title="Retired",
                summary="Retired",
                minutes=1,
                published=False,
                tags=[],
            )
        )
        await session.flush()
        session.add_all(
            [
                Lesson(id="retired-topic", theory=[], examples=[], review=[]),
                Question(
                    id="retired-question",
                    topic_id="retired-topic",
                    difficulty="easy",
                    kind="single_choice",
                    prompt="Saved question",
                    code=None,
                    options=["A", "B"],
                    correct_answer=[0],
                    explanation="Saved explanation",
                    hint="",
                    tags=[],
                ),
                Quiz(
                    id="retired-quiz", topic_id="retired-topic", title="Saved quiz", distribution={}
                ),
                Project(
                    id="retired-project",
                    level_id="retired-level",
                    title="Saved project",
                    description="Saved",
                    requirements=[],
                    rubric=[],
                ),
                Exercise(
                    id="retired-trainer",
                    topic_id=None,
                    catalog="trainer",
                    title="Saved exercise",
                    description="Saved",
                    tags=[],
                    difficulty="easy",
                    kind="code_writing",
                    starter_code="",
                    solution="",
                    hints=[],
                ),
            ]
        )
        await session.flush()
        attempt = QuizAttempt(
            user_id=user_id,
            quiz_id="retired-quiz",
            question_ids=["retired-question"],
            score=100,
            xp_awarded=50,
            finished_at=now,
        )
        session.add(attempt)
        await session.flush()
        answer = Answer(
            attempt_id=attempt.id, question_id="retired-question", selected=[0], correct=True
        )
        completion = Completion(
            user_id=user_id,
            topic_id="retired-topic",
            kind="lesson",
            resource_id="retired-topic",
            xp=20,
            activity_date=date.today(),
        )
        submission = ProjectSubmission(
            user_id=user_id,
            project_id="retired-project",
            repository_url="https://example.com/saved",
            notes="Saved project submission",
            status="submitted",
        )
        session.add_all(
            [
                answer,
                completion,
                submission,
                QuestionMemory(
                    user_id=user_id,
                    question_id="retired-question",
                    correct_count=1,
                    wrong_count=0,
                    confidence=1,
                    last_answered=now,
                    next_review=date.today(),
                ),
                ExerciseTest(
                    id="retired-trainer-t1",
                    exercise_id="retired-trainer",
                    stdin="",
                    expected_stdout="saved",
                ),
            ]
        )
        await session.flush()
        attempt_id, answer_id, completion_id, submission_id = (
            attempt.id,
            answer.id,
            completion.id,
            submission.id,
        )
    async with factory.begin() as session:
        await initializer.seed(session)
    async with factory() as session:
        assert (await session.get(User, user_id)).total_xp == 70
        assert (await session.get(Level, "retired-level")).position == 99
        for model, key in [
            (Topic, "retired-topic"),
            (Lesson, "retired-topic"),
            (Question, "retired-question"),
            (QuizAttempt, attempt_id),
            (Answer, answer_id),
            (ProjectSubmission, submission_id),
            (Exercise, "retired-trainer"),
            (ExerciseTest, "retired-trainer-t1"),
            (QuestionMemory, (user_id, "retired-question")),
        ]:
            assert await session.get(model, key) is not None
        assert (await session.get(Completion, completion_id)).topic_id == "retired-topic"


async def test_production_cli_does_not_open_a_database_session(monkeypatch, capsys):
    factory = Mock(side_effect=AssertionError("Production initializer must not open the DB"))
    monkeypatch.setattr(
        initializer, "get_settings", lambda: SimpleNamespace(environment="production")
    )
    monkeypatch.setattr(initializer, "SessionFactory", factory)
    await initializer.main()
    factory.assert_not_called()
    assert "no data changed" in capsys.readouterr().out
