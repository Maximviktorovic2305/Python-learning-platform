import subprocess
import sys
from collections import Counter

import pytest

from app.api.dependencies import get_runner
from app.content.exercises import exercise_starter
from app.content.trainer import TASKS
from app.main import app
from app.schemas.contracts import ExecutionResult


@pytest.mark.parametrize("item", TASKS, ids=lambda item: item.id)
def test_each_trainer_solution_and_scaffold(item):
    exercise = item.practice
    assert len(exercise.tests) >= 4
    assert len(set(exercise.tests)) == len(exercise.tests)
    mismatches = 0
    starter = exercise_starter(exercise.solution)
    for stdin, expected in exercise.tests:
        for source, complete in ((exercise.solution, True), (starter, False)):
            result = subprocess.run(
                [sys.executable, "-X", "utf8", "-I", "-c", source],
                input=stdin + "\n",
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=5,
            )
            passed = result.returncode == 0 and result.stdout.rstrip("\r\n") == expected
            if complete:
                assert passed, (item.id, stdin, result.stdout, result.stderr)
            else:
                mismatches += not passed
    assert mismatches > 0


async def test_trainer_catalog_is_separate_public_and_hides_solutions(client):
    response = await client.get("/api/tasks")
    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) == 24
    assert Counter(task["difficulty"] for task in tasks) == {"easy": 8, "medium": 8, "hard": 8}
    assert all(
        task["topic_id"] is None and task["catalog"] == "trainer" and "solution" not in task
        for task in tasks
    )
    assert all(task["test_count"] == 1 and task["tags"] for task in tasks)
    course = (await client.get("/api/courses/python")).json()
    assert course["exercise_count"] == 96 and course["published_topics"] == 50


async def test_trainer_rewards_once_without_completing_course(client, student):
    class PassedRunner:
        async def execute(self, request):
            return ExecutionResult(
                status="passed",
                stdout="",
                stderr="",
                passed=len(request.tests),
                total=len(request.tests),
            )

    app.dependency_overrides[get_runner] = PassedRunner
    for number in range(2):
        response = await client.post(
            "/api/exercises/trainer-01/submit",
            headers=student,
            json={"code": "trusted test adapter"},
        )
        assert response.status_code == 200
        assert response.json()["xp"] == (30 if number == 0 else 0)
    progress = (await client.get("/api/progress", headers=student)).json()
    assert progress["trainer_exercise_ids"] == ["trainer-01"]
    assert progress["exercise_ids"] == []
    assert progress["completed_topics"] == []
    assert progress["course_percent"] == 0
    assert progress["user"]["total_xp"] == 30
    achievements = (await client.get("/api/achievements", headers=student)).json()
    assert next(item for item in achievements if item["id"] == "first-exercise")["earned_at"]
