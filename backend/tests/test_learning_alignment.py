"""Regression checks for the theory → practice → assessment → retrieval contract."""

import pytest

from app.content.bank import build_bank
from app.content.curriculum import TOPICS
from app.content.exercises import exercise_description, exercise_starter, with_given_data
from app.content.learning_paths import PATHS
from app.content.theory import REVIEWS, THEORY
from app.domain.learning import THEORY_ONLY_TOPICS


@pytest.mark.parametrize("topic", TOPICS, ids=lambda topic: topic.slug)
def test_assessed_rules_and_practice_methods_are_taught(topic):
    sections = dict(THEORY[topic.slug])
    rules = sections["Правила и границы применения"]
    for statement, truth, reason in topic.facts:
        assert statement in rules
        assert reason in rules
        if not truth:
            assert f"«{statement}» Это неверно." in rules
    if topic.slug in THEORY_ONLY_TOPICS:
        assert "От теории к решению" not in sections
        assert "Что проверяет тест" not in sections
        return
    path = PATHS[topic.slug]
    for exercise, guide in zip(topic.practice, path.practice, strict=True):
        assert guide.instruction and guide.approach and guide.transfer
        assert exercise.title in sections["От теории к решению"]
        assert guide.approach in sections["От теории к решению"]
        starter = exercise_starter(with_given_data(exercise.solution, exercise.tests[0][0]))
        description = exercise_description(exercise.description, exercise.tests[0][1], starter)
        assert guide.instruction in description
        assert guide.transfer in REVIEWS[topic.slug]
        assert guide.transfer in sections["Самопроверка без подсказки"]
    for question in build_bank(topic):
        if question.kind == "true_false":
            assert question.prompt in rules
        if question.code:
            assert any(guide.approach in question.explanation for guide in path.practice)


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
