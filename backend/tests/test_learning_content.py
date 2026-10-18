import re
import subprocess
import sys

import pytest
from sqlalchemy import select

from app.api.dependencies import get_runner
from app.content.curriculum import TOPICS
from app.content.theory import THEORY
from app.main import app
from app.models.tables import Exercise, ExerciseTest
from app.schemas.contracts import ExecutionResult
from app.seed import seed


@pytest.mark.parametrize("topic", TOPICS, ids=lambda topic: topic.slug)
def test_theory_examples_execute(topic):
    # Only repository-authored teaching examples, never submitted learner code.
    for _, body in THEORY[topic.slug]:
        for code in re.findall(r"```python\n(.*?)\n```", body, re.DOTALL):
            result = subprocess.run(
                [sys.executable, "-X", "utf8", "-I", "-c", code],
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=15,
            )
            assert result.returncode == 0, (topic.slug, result.stderr)


@pytest.mark.parametrize("exercise_id", ["academy-introduction-e1", "trainer-01"])
async def test_only_visible_sample_reaches_runner(client, student, database, exercise_id):
    _, factory = database
    async with factory.begin() as session:
        first = await session.get(ExerciseTest, f"{exercise_id}-t1")
        stdin, stdout = first.stdin, first.expected_stdout
        # A database not yet reseeded may still contain the previous extra tests.
        session.add(
            ExerciseTest(
                id=f"{exercise_id}-t2",
                exercise_id=exercise_id,
                stdin="another input\n",
                expected_stdout="another output",
            )
        )

    class SampleRunner:
        async def execute(self, request):
            assert len(request.tests) == 1
            assert request.tests[0].stdin == stdin
            assert request.tests[0].expected_stdout == stdout
            return ExecutionResult(status="passed", stdout=stdout, stderr="", passed=1, total=1)

    app.dependency_overrides[get_runner] = SampleRunner
    url = (
        "/api/exercises?topic_id=academy-introduction"
        if exercise_id.startswith("academy")
        else "/api/tasks"
    )
    exercise = next(item for item in (await client.get(url)).json() if item["id"] == exercise_id)
    assert exercise["test_count"] == 1
    assert exercise["sample_stdin"] == stdin.rstrip("\n")
    response = await client.post(
        f"/api/exercises/{exercise_id}/submit", headers=student, json={"code": "sample contract"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "passed"
    assert response.json()["xp"] == 30


async def test_reseed_keeps_one_visible_check_per_exercise(client, database):
    _, factory = database
    async with factory.begin() as session:
        session.add(
            ExerciseTest(
                id="academy-introduction-e1-t3",
                exercise_id="academy-introduction-e1",
                stdin="legacy\n",
                expected_stdout="legacy",
            )
        )
    async with factory.begin() as session:
        await seed(session)
    async with factory() as session:
        exercises = list(await session.scalars(select(Exercise)))
        checks = list(await session.scalars(select(ExerciseTest)))
    assert len(checks) == len(exercises) == 124
    for exercise in exercises:
        check = next(item for item in checks if item.exercise_id == exercise.id)
        assert check.id == f"{exercise.id}-t1"
        assert check.stdin == ""
        assert check.expected_stdout in exercise.description


async def test_all_lessons_publish_readable_theory_and_different_examples(client):
    for topic in TOPICS:
        response = await client.get(f"/api/lessons/{topic.slug}")
        assert response.status_code == 200
        lesson = response.json()
        assert len(lesson["theory"]) == 4
        assert all(section["body"].strip() for section in lesson["theory"])
        examples = lesson["examples"]
        assert len(examples) >= 2
        assert len({example["code"] for example in examples}) >= 2
        assert all(
            "основной случай" not in example["title"] and "граничный случай" not in example["title"]
            for example in examples
        )
