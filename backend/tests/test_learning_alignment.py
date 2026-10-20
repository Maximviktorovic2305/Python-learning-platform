"""Regression checks for the theory → practice → assessment → retrieval contract."""

import pytest

from app.content.bank import build_bank
from app.content.curriculum import TOPICS
from app.content.exercises import exercise_description, exercise_starter, with_given_data
from app.content.learning_paths import PATHS
from app.content.theory import REVIEWS, THEORY
from app.domain.learning import THEORY_ONLY_TOPICS


@pytest.mark.parametrize("topic", TOPICS, ids=lambda topic: topic.slug)
def test_assessed_rules_are_taught_and_assessments_stay_in_their_steps(topic):
    sections = dict(THEORY[topic.slug])
    rules = sections["Правила и границы применения"]
    for statement, truth, reason in topic.facts:
        assert statement in rules
        assert reason in rules
        if not truth:
            assert f"«{statement}» Это неверно." in rules
    if topic.slug in THEORY_ONLY_TOPICS:
        return
    path = PATHS[topic.slug]
    for exercise, guide in zip(topic.practice, path.practice, strict=True):
        assert guide.instruction and guide.approach and guide.transfer
        starter = exercise_starter(with_given_data(exercise.solution, exercise.tests[0][0]))
        description = exercise_description(exercise.description, exercise.tests[0][1], starter)
        assert guide.instruction in description
        assert guide.transfer in REVIEWS[topic.slug]
    for question in build_bank(topic):
        if question.kind == "true_false":
            assert question.prompt in rules
        if question.code:
            assert any(guide.approach in question.explanation for guide in path.practice)


@pytest.mark.parametrize("topic", TOPICS, ids=lambda topic: topic.slug)
def test_theory_has_no_assessment_chapters_or_stale_references(topic):
    removed = (
        "Как выбрать приём и избежать ошибки",
        "От теории к решению",
        "Что проверяет тест",
        "Самопроверка без подсказки",
    )
    article = "\n".join(title + "\n" + body for title, body in THEORY[topic.slug])
    assert all(title not in article for title in removed)
    assert "Задание 1:" not in article and "Задание 2:" not in article
    for question in build_bank(topic):
        assert all(title not in question.explanation for title in removed)


@pytest.mark.parametrize(
    "slug,concepts",
    [
        ("academy-installation", ("Activate.ps1", "source .venv/bin/activate")),
        (
            "academy-basic-types",
            ("isinstance(True, int)", "type(True) is int", "print('Баллы:', 7)"),
        ),
        ("academy-sets", ("dict.fromkeys(values)",)),
        ("academy-standard-library", ("max(counts.values(), default=0)", "random.Random(seed)")),
        ("academy-modules", ("report.backup.csv", ".stem")),
        ("academy-text-files", ("errors='ignore'",)),
        ("academy-type-annotations", ("list[int | None]", "list[int] | None")),
        ("academy-pytest-fixtures", ("pytest.main", "no:cacheprovider", "redirect_stdout")),
        ("academy-unittest", ("TestSuite", "TestResult", "failures", "errors")),
        ("academy-asyncio-advanced", ("run_in_executor", "async for", "async with")),
    ],
)
def test_unique_concepts_survive_inside_subject_explanations(slug, concepts):
    article = "\n".join(body for _, body in THEORY[slug])
    assert all(concept in article for concept in concepts)


async def test_seed_publishes_the_connected_learning_path(client):
    topic = next(topic for topic in TOPICS if topic.slug == "academy-numbers")
    lesson = (await client.get(f"/api/lessons/{topic.slug}")).json()
    assert lesson["review"] == REVIEWS[topic.slug]
    exercises = (await client.get(f"/api/exercises?topic_id={topic.slug}")).json()
    for exercise, guide in zip(exercises, PATHS[topic.slug].practice, strict=True):
        assert guide.instruction in exercise["description"]
        assert guide.approach in exercise["hints"]
    bank = (await client.get(f"/api/questions?topic_id={topic.slug}&limit=100")).json()
    assert len(bank) == 20
    assert all("Правила и границы применения" in question["hint"] for question in bank)
