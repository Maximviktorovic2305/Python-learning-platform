import ast
import random
import re
import subprocess
import sys
from dataclasses import replace
from uuid import UUID

import pytest
from sqlalchemy import select

from app.content.bank import build_bank
from app.content.curriculum import TOPICS
from app.content.exercises import exercise_starter, uses_input, with_given_data
from app.content.trainer import TASKS
from app.domain.learning import question_concepts, select_questions
from app.models.tables import Exercise, ExerciseTest, Question, QuizAttempt
from app.schemas.contracts import QuestionView
from app.seed import seed


def test_question_wording_preserves_existing_grading_contracts():
    for topic in TOPICS:
        old_cases = tuple(
            replace(case, task=f"{case.task} — пример {index % 2 + 1}")
            for index, case in enumerate(topic.cases)
        )
        previous = build_bank(replace(topic, cases=old_cases))
        current = build_bank(topic)
        for old, new in zip(previous, current, strict=True):
            assert replace(old, prompt="") == replace(new, prompt="")
            assert not re.search(r"пример\s+\d+", new.prompt, re.IGNORECASE)
            assert "показанный результат" not in new.prompt


@pytest.mark.parametrize("separator", ["—", "–", "-"])
def test_historical_question_labels_are_cleaned_in_shared_response_model(separator):
    question = build_bank(TOPICS[0])[8]
    legacy_prompt = (
        f"Первый файл {separator} пример 2: почему программа получает показанный результат?"
    )
    view = QuestionView.model_validate(
        replace(question, prompt=legacy_prompt), from_attributes=True
    )
    assert view.prompt == "Первый файл: какое объяснение правильно описывает работу программы?"
    assert (
        view.id == question.id and view.options == question.options and view.code == question.code
    )


async def test_published_questions_have_no_numbered_example_references(client):
    for topic in TOPICS:
        response = await client.get(f"/api/questions?topic_id={topic.slug}&limit=100")
        assert response.status_code == 200
        for question in response.json():
            assert not re.search(r"пример\s+\d+", question["prompt"], re.IGNORECASE)
            assert "показанный результат" not in question["prompt"]


def test_factual_question_prompts_do_not_repeat_across_course():
    prompts = [
        question.prompt
        for topic in TOPICS
        for question in build_bank(topic)
        if question.kind == "true_false"
    ]
    assert len(prompts) == len(set(prompts))


def test_new_attempt_prefers_questions_not_in_the_previous_attempt():
    template = build_bank(TOPICS[0])[0]
    pool = [replace(template, id=str(index), prompt=f"Утверждение {index}") for index in range(4)]
    selected = select_questions(pool, {"easy": 2}, random.Random(2), avoid_ids={"0", "1"})
    assert {question.id for question in selected} == {"2", "3"}


def test_duplicate_code_with_different_formatting_cannot_fill_an_attempt():
    template = build_bank(TOPICS[0])[0]
    pool = [
        replace(template, id="a", code="print(1)"),
        replace(template, id="b", code="print(1)  # тот же код"),
    ]
    with pytest.raises(ValueError, match="distinct"):
        select_questions(pool, {"easy": 2})


PRACTICE = [
    (f"{topic.slug}-e{i + 1}", exercise)
    for topic in TOPICS
    for i, exercise in enumerate(topic.practice)
] + [(item.id, item.practice) for item in TASKS]


@pytest.mark.parametrize("identity,exercise", PRACTICE, ids=[identity for identity, _ in PRACTICE])
def test_given_data_solutions_and_starters(identity, exercise):
    # Only trusted repository-authored material is executed here.
    for sample, expected in exercise.tests:
        solution = with_given_data(exercise.solution, sample)
        assert not uses_input(solution), identity
        result = subprocess.run(
            [sys.executable, "-X", "utf8", "-I", "-c", solution],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=15,
        )
        assert result.returncode == 0, (identity, result.stderr)
        assert result.stdout.rstrip("\r\n") == expected.rstrip("\r\n"), (identity, sample)
    starter = exercise_starter(with_given_data(exercise.solution, exercise.tests[0][0]))
    assert not uses_input(starter)
    assert any(isinstance(node, ast.Assign) for node in ast.parse(starter).body), identity
    result = subprocess.run(
        [sys.executable, "-X", "utf8", "-I", "-c", starter],
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=15,
    )
    assert result.stdout.rstrip("\r\n") != exercise.tests[0][1].rstrip("\r\n"), identity


@pytest.mark.parametrize("topic", TOPICS, ids=lambda topic: topic.slug)
def test_quiz_questions_do_not_repeat_code_or_statements(topic):
    bank = build_bank(topic)
    for sample_seed in range(30):
        selected = select_questions(
            bank, {"easy": 4, "medium": 4, "hard": 2}, random.Random(sample_seed)
        )
        seen = frozenset()
        for question in selected:
            concepts = question_concepts(question)
            assert seen.isdisjoint(concepts), (topic.slug, question.id)
            seen |= concepts


async def test_published_practice_has_no_unnecessary_input_fields(client, database):
    _, factory = database
    async with factory() as session:
        exercises = list(await session.scalars(select(Exercise)))
        checks = list(await session.scalars(select(ExerciseTest)))
    assert len(exercises) == 124
    assert all(not uses_input(exercise.solution) for exercise in exercises)
    assert all(check.stdin == "" for check in checks)
    for topic in TOPICS:
        response = await client.get(f"/api/exercises?topic_id={topic.slug}")
        assert response.status_code == 200
        for item in response.json():
            assert not item["requires_stdin"]
            assert item["sample_stdin"] == ""
            assert "Пример ввода" not in item["description"]
            assert "Ожидаемый вывод:" in item["description"]
            assert item["description"].index("Ожидаемый вывод:") < item["description"].index(
                "Исходные данные уже записаны"
            )
    tasks = (await client.get("/api/tasks")).json()
    assert all(not item["requires_stdin"] and item["sample_stdin"] == "" for item in tasks)


async def test_old_question_revision_is_preserved_but_not_offered(client, student, database):
    _, factory = database
    async with factory.begin() as session:
        session.add(
            Question(
                id="academy-introduction-q1",
                topic_id="academy-introduction",
                difficulty="easy",
                kind="true_false",
                prompt="Старый вопрос",
                code=None,
                options=["Да", "Нет"],
                correct_answer=[0],
                explanation="Старая попытка",
                hint="",
                tags=[],
            )
        )
    course = (await client.get("/api/courses/python")).json()
    assert course["question_count"] == 1000
    questions = (await client.get("/api/questions?topic_id=academy-introduction&limit=100")).json()
    assert len(questions) == 20
    assert all("-qv2-" in item["id"] for item in questions)
    async with factory() as session:
        old = await session.get(Question, "academy-introduction-q1")
        assert old is not None and old.correct_answer == [0]
    user = (await client.get("/api/users/me", headers=student)).json()
    async with factory.begin() as session:
        attempt = QuizAttempt(
            user_id=UUID(user["id"]),
            quiz_id="academy-introduction-quiz",
            question_ids=["academy-introduction-q1"],
        )
        session.add(attempt)
        await session.flush()
        attempt_id = str(attempt.id)
    async with factory.begin() as session:
        await seed(session)
    submitted = await client.post(
        f"/api/attempts/{attempt_id}/submit",
        headers=student,
        json={"answers": [{"question_id": "academy-introduction-q1", "selected": [0]}]},
    )
    assert submitted.status_code == 200
    assert submitted.json()["score"] == 100
    assert submitted.json()["review"][0]["explanation"] == "Старая попытка"
