"""Long-form content, assessment alignment and immutable published question identity."""

import hashlib
import json
import re
from dataclasses import asdict
from pathlib import Path

import pytest

from app.content.bank import build_bank
from app.content.curriculum import TOPICS
from app.content.supplements import SUPPLEMENTS
from app.content.theory import THEORY
from app.domain.learning import THEORY_ONLY_TOPICS


@pytest.mark.parametrize("topic", TOPICS, ids=lambda topic: topic.slug)
def test_full_articles_teach_new_assessments(topic):
    sections = THEORY[topic.slug]
    prose = "\n".join(re.sub(r"```.*?```", "", body, flags=re.S) for _, body in sections)
    assert len(prose.split()) >= 800
    assert len(sections) >= 10
    assert len({title for title, _ in sections}) == len(sections)
    if topic.slug in THEORY_ONLY_TOPICS:
        assert topic.slug not in SUPPLEMENTS
        return
    extra = SUPPLEMENTS[topic.slug]
    assert len(topic.practice) == 3
    example = dict(sections)["Развёрнутый пример"]
    assert extra.example.code in example
    assert extra.example.explanation in example
    assert extra.guide.approach in example
    assert sum(body.count("```python\n") for _, body in sections) >= 3
    questions = build_bank(topic)
    assert [question.id for question in questions[-2:]] == [
        f"{topic.slug}-qv3-21",
        f"{topic.slug}-qv3-22",
    ]
    assert all(question.code == extra.example.code for question in questions[-2:])
    assert all("Развёрнутый пример" in question.hint for question in questions[-2:])


def test_previous_published_questions_keep_their_meaning_and_answers():
    snapshot = json.loads(
        (Path(__file__).parent / "fixtures/published_question_digests.json").read_text(
            encoding="utf8"
        )
    )
    fields = ("id", "kind", "difficulty", "prompt", "code", "options", "correct_answer")
    assert set(snapshot["digests"]) == {topic.slug for topic in TOPICS}
    for topic in TOPICS:
        questions = [asdict(question) for question in build_bank(topic)[:20]]
        payload = [{field: question[field] for field in fields} for question in questions]
        digest = hashlib.sha256(
            json.dumps(payload, ensure_ascii=False, sort_keys=True).encode()
        ).hexdigest()
        assert digest == snapshot["digests"][topic.slug], topic.slug


async def test_public_extension_preserves_private_solutions_and_answers(client):
    response = await client.get("/api/exercises?topic_id=academy-sqlite")
    assert response.status_code == 200
    exercises = response.json()
    assert [exercise["id"] for exercise in exercises] == [f"academy-sqlite-e{i}" for i in (1, 2, 3)]
    assert all("solution" not in exercise for exercise in exercises)
    assert all(exercise["test_count"] == 1 for exercise in exercises)
    questions = (await client.get("/api/questions?topic_id=academy-sqlite&limit=100")).json()
    assert len(questions) == 22
    assert all("correct_answer" not in question for question in questions)
    assert all("explanation" not in question for question in questions)
