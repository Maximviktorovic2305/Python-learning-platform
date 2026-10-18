from datetime import UTC, datetime
from uuid import UUID

import pytest
from sqlalchemy import func, select

from app.api.dependencies import get_runner
from app.domain.learning import THEORY_ONLY_TOPICS
from app.main import app
from app.models.tables import Answer, Completion, Exercise, Question, Quiz, QuizAttempt, User
from app.seed import seed


async def test_only_organizational_topics_have_no_active_assessments(client, database):
    course = (await client.get("/api/courses/python")).json()
    assert course["exercise_count"] == 96
    assert course["question_count"] == 960
    topics = [
        topic
        for level in course["levels"]
        for module in level["modules"]
        for topic in module["topics"]
    ]
    assert {topic["id"] for topic in topics if not topic["exercise_count"]} == THEORY_ONLY_TOPICS
    assert {topic["id"] for topic in topics if not topic["question_count"]} == THEORY_ONLY_TOPICS
    for topic_id in THEORY_ONLY_TOPICS:
        topic = (await client.get(f"/api/topics/{topic_id}")).json()
        lesson = (await client.get(f"/api/lessons/{topic_id}")).json()
        assert topic["exercise_count"] == lesson["exercise_count"] == 0
        assert topic["question_count"] == lesson["question_count"] == 0
        assert topic["practice_difficulties"] == {}
        assert (await client.get(f"/api/exercises?topic_id={topic_id}")).json() == []
        assert (await client.get(f"/api/questions?topic_id={topic_id}")).json() == []
        assert lesson["theory"] and lesson["review"]
    _, factory = database
    async with factory() as session:
        assert (
            await session.scalar(
                select(func.count())
                .select_from(Exercise)
                .where(Exercise.topic_id.in_(THEORY_ONLY_TOPICS))
            )
            == 4
        )
        assert (
            await session.scalar(
                select(func.count())
                .select_from(Question)
                .where(Question.topic_id.in_(THEORY_ONLY_TOPICS))
            )
            == 40
        )
        assert (
            await session.scalar(
                select(func.count()).select_from(Quiz).where(Quiz.topic_id.in_(THEORY_ONLY_TOPICS))
            )
            == 2
        )


@pytest.mark.parametrize("topic_id", sorted(THEORY_ONLY_TOPICS))
async def test_disabled_endpoints_never_run_code_or_award_xp(client, student, database, topic_id):
    class MustNotRun:
        async def execute(self, request):
            raise AssertionError("Disabled practice must not reach the runner")

    app.dependency_overrides[get_runner] = MustNotRun
    for index in (1, 2):
        response = await client.post(
            f"/api/exercises/{topic_id}-e{index}/submit",
            headers=student,
            json={"code": "print('unused')"},
        )
        assert response.status_code == 404
    assert (
        await client.post(f"/api/quizzes/{topic_id}/attempts", headers=student)
    ).status_code == 404
    user = (await client.get("/api/users/me", headers=student)).json()
    _, factory = database
    async with factory.begin() as session:
        question = await session.scalar(
            select(Question).where(Question.topic_id == topic_id).limit(1)
        )
        attempt = QuizAttempt(
            user_id=UUID(user["id"]), quiz_id=f"{topic_id}-quiz", question_ids=[question.id]
        )
        session.add(attempt)
        await session.flush()
        attempt_id = attempt.id
        payload = {"answers": [{"question_id": question.id, "selected": question.correct_answer}]}
    response = await client.post(
        f"/api/attempts/{attempt_id}/submit", headers=student, json=payload
    )
    assert response.status_code == 404
    progress = (await client.get("/api/progress", headers=student)).json()
    assert progress["user"]["total_xp"] == 0
    assert not progress["exercise_ids"] and not progress["quiz_ids"]
    async with factory() as session:
        assert await session.scalar(select(func.count()).select_from(Completion)) == 0
        assert await session.scalar(select(func.count()).select_from(Answer)) == 0
        assert (await session.get(QuizAttempt, attempt_id)).finished_at is None


async def test_theory_completion_finishes_both_topics_once(client, student):
    for topic_id in THEORY_ONLY_TOPICS:
        for _ in range(2):
            response = await client.post(f"/api/lessons/{topic_id}/complete", headers=student)
            assert response.status_code == 200
    progress = (await client.get("/api/progress", headers=student)).json()
    assert set(progress["completed_topics"]) == THEORY_ONLY_TOPICS
    assert set(progress["lesson_ids"]) == THEORY_ONLY_TOPICS
    assert not progress["exercise_ids"] and not progress["quiz_ids"]
    assert progress["course_percent"] == 4
    assert progress["level_percent"]["academy-level-0"] == 50
    assert progress["module_percent"]["academy-level-0-module-0"] == 50
    assert progress["user"]["total_xp"] == 40


@pytest.mark.parametrize("topic_id", sorted(THEORY_ONLY_TOPICS))
async def test_existing_rewards_and_history_survive_without_blocking_progress(
    client, student, database, topic_id
):
    user_id = UUID((await client.get("/api/users/me", headers=student)).json()["id"])
    _, factory = database
    now = datetime.now(UTC)
    async with factory.begin() as session:
        user = await session.get(User, user_id)
        user.total_xp = 80
        questions = list(
            await session.scalars(
                select(Question)
                .where(Question.topic_id == topic_id)
                .order_by(Question.id)
                .limit(10)
            )
        )
        attempt = QuizAttempt(
            user_id=user_id,
            quiz_id=f"{topic_id}-quiz",
            question_ids=[question.id for question in questions],
            score=70,
            xp_awarded=50,
            finished_at=now,
        )
        session.add(attempt)
        await session.flush()
        attempt_id = attempt.id
        for index, question in enumerate(questions):
            correct = index < 7
            selected = (
                question.correct_answer
                if correct
                else [(question.correct_answer[0] + 1) % len(question.options)]
            )
            session.add(
                Answer(
                    attempt_id=attempt_id,
                    question_id=question.id,
                    selected=selected,
                    correct=correct,
                )
            )
        for kind, identity, xp in [
            ("exercise", f"{topic_id}-e1", 30),
            ("quiz", f"{topic_id}-quiz", 50),
        ]:
            session.add(
                Completion(
                    user_id=user_id,
                    topic_id=topic_id,
                    kind=kind,
                    resource_id=identity,
                    xp=xp,
                    activity_date=now.date(),
                )
            )
    async with factory.begin() as session:
        await seed(session)
    history = await client.get(f"/api/attempts/{attempt_id}", headers=student)
    assert history.status_code == 200
    assert history.json()["score"] == 70 and history.json()["xp"] == 50
    assert len(history.json()["review"]) == 10
    replay = await client.post(
        f"/api/attempts/{attempt_id}/submit", headers=student, json={"answers": []}
    )
    assert replay.status_code == 404
    progress = (await client.get("/api/progress", headers=student)).json()
    assert progress["user"]["total_xp"] == 80
    assert not progress["exercise_ids"] and not progress["quiz_ids"]
    assert not progress["weak_topics"]
    assert {item["resource_id"] for item in progress["activity"]} == {
        f"{topic_id}-e1",
        f"{topic_id}-quiz",
    }
    await client.post(f"/api/lessons/{topic_id}/complete", headers=student)
    progress = (await client.get("/api/progress", headers=student)).json()
    assert topic_id in progress["completed_topics"]
    assert progress["user"]["total_xp"] == 100
