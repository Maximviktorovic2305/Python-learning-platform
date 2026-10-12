import random
from collections import defaultdict
from datetime import date, timedelta
from typing import Protocol, TypeVar


class QuestionIdentity(Protocol):
    @property
    def id(self) -> str: ...
    @property
    def difficulty(self) -> str: ...


Q = TypeVar("Q", bound=QuestionIdentity)


def select_questions(pool: list[Q], distribution: dict[str, int], rng: random.Random | None = None) -> list[Q]:
    randomizer = rng or random.SystemRandom()
    groups: dict[str, list[Q]] = defaultdict(list)
    for question in pool:
        groups[question.difficulty].append(question)
    result: list[Q] = []
    for difficulty, count in distribution.items():
        if len(groups[difficulty]) < count:
            raise ValueError(f"Insufficient {difficulty} questions")
        result.extend(randomizer.sample(groups[difficulty], count))
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
