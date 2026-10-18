import ast
import random
from collections import defaultdict
from datetime import date, timedelta
from typing import Protocol

QUESTION_BANK_REVISION = "qv2"


class QuestionIdentity(Protocol):
    @property
    def id(self) -> str: ...
    @property
    def difficulty(self) -> str: ...
    @property
    def prompt(self) -> str: ...
    @property
    def code(self) -> str | None: ...
    @property
    def kind(self) -> str: ...
    @property
    def options(self) -> list[str]: ...


def question_concepts(question: QuestionIdentity) -> frozenset[str]:
    if question.code:
        try:
            code = ast.dump(ast.parse(question.code), include_attributes=False)
        except SyntaxError:
            code = question.code.strip()
        return frozenset({"code:" + code})
    statements = question.options if question.kind == "multiple_select" else [question.prompt]
    return frozenset("text:" + " ".join(statement.casefold().split()) for statement in statements)


def select_questions[Q: QuestionIdentity](
    pool: list[Q],
    distribution: dict[str, int],
    rng: random.Random | None = None,
    *,
    avoid_ids: set[str] | None = None,
) -> list[Q]:
    randomizer = rng or random.SystemRandom()
    groups: dict[str, list[Q]] = defaultdict(list)
    for question in pool:
        groups[question.difficulty].append(question)
    for difficulty, count in distribution.items():
        if len(groups[difficulty]) < count:
            raise ValueError(f"Insufficient {difficulty} questions")
        randomizer.shuffle(groups[difficulty])
        if avoid_ids:
            groups[difficulty].sort(key=lambda question: question.id in avoid_ids)
    # Build a balanced attempt without asking the same statement or code twice.
    slots = sorted(
        distribution, key=lambda difficulty: len(groups[difficulty]) - distribution[difficulty]
    )
    concepts_by_id = {question.id: question_concepts(question) for question in pool}

    def choose(group_index: int, used: frozenset[str]) -> list[Q] | None:
        if group_index == len(slots):
            return []
        difficulty = slots[group_index]
        candidates = groups[difficulty]

        def fill(
            start: int, needed: int, selected: list[Q], keys: frozenset[str]
        ) -> list[Q] | None:
            if not needed:
                following = choose(group_index + 1, keys)
                return selected + following if following is not None else None
            for index in range(start, len(candidates) - needed + 1):
                candidate = candidates[index]
                concepts = concepts_by_id[candidate.id]
                if not keys.isdisjoint(concepts):
                    continue
                result = fill(index + 1, needed - 1, [*selected, candidate], keys | concepts)
                if result is not None:
                    return result
            return None

        return fill(0, distribution[difficulty], [], used)

    result = choose(0, frozenset())
    if result is None:
        raise ValueError("Insufficient distinct question concepts")
    randomizer.shuffle(result)
    return result


def next_streak(last_activity: date | None, current: int, today: date) -> int:
    if last_activity == today:
        return current
    if last_activity == today - timedelta(days=1):
        return current + 1
    return 1


def percentage(completed: int, total: int) -> int:
    return round(100 * completed / total) if total else 0
