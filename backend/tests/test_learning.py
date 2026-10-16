import random
import subprocess
import sys
from collections import Counter
from datetime import date, timedelta

import pytest

from app.content.bank import build_bank
from app.content.curriculum import TOPICS
from app.content.exercises import exercise_starter
from app.domain.learning import next_streak, select_questions


@pytest.mark.parametrize("topic", TOPICS, ids=lambda topic: topic.slug)
def test_authored_examples_execute(topic):
    for scenario in topic.cases:
        # Only repository-authored trusted teaching code, never user submissions.
        result = subprocess.run(
            [sys.executable, "-X", "utf8", "-I", "-c", scenario.code],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=3,
        )
        assert result.returncode == 0, (scenario.task, result.stderr)
        assert result.stdout.rstrip("\r\n") == scenario.output, scenario.task


@pytest.mark.parametrize("topic", TOPICS, ids=lambda topic: topic.slug)
def test_every_practice_scaffold_is_incomplete(topic):
    for scenario in topic.cases[:8]:
        starter = exercise_starter(scenario.code)
        assert starter.strip() != scenario.code.strip()
        result = subprocess.run(
            [sys.executable, "-X", "utf8", "-I", "-c", starter],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=3,
        )
        assert result.returncode == 0, (scenario.task, result.stderr)
        assert result.stdout.rstrip("\r\n") != scenario.output, scenario.task


@pytest.mark.parametrize("topic", TOPICS, ids=lambda topic: topic.slug)
def test_bank_is_answerable_and_quiz_preserves_distribution(topic):
    bank = build_bank(topic)
    assert len(bank) == 32
    assert len({q.id for q in bank}) == 32
    assert len({(q.prompt, q.code, tuple(q.options)) for q in bank}) == 32
    for question in bank:
        assert len(question.options) == len(set(question.options)), question.id
        assert all(0 <= index < len(question.options) for index in question.correct_answer)
        if question.kind != "multiple_select":
            assert len(question.correct_answer) == 1
    selected = select_questions(bank, {"easy": 4, "medium": 4, "hard": 2}, random.Random(42))
    assert Counter(q.difficulty for q in selected) == {"easy": 4, "medium": 4, "hard": 2}
    assert len(set(q.id for q in selected)) == 10


def test_streak_calendar_boundaries():
    today = date(2026, 10, 12)
    assert next_streak(today, 4, today) == 4
    assert next_streak(today - timedelta(days=1), 4, today) == 5
    assert next_streak(today - timedelta(days=2), 4, today) == 1
    assert next_streak(None, 0, today) == 1


def test_insufficient_bank_fails_explicitly():
    with pytest.raises(ValueError, match="Insufficient"):
        select_questions([], {"expert": 2})
