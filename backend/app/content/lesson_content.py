"""Original Russian lessons aligned with Python Academy's public syllabus."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Case:
    task: str
    code: str
    output: str
    explanation: str


@dataclass(frozen=True)
class Practice:
    title: str
    description: str
    solution: str
    tests: tuple[tuple[str, str], ...]
    hint: str
    difficulty: str = "medium"


@dataclass(frozen=True)
class TopicContent:
    slug: str
    title: str
    summary: str
    mechanics: str
    use: str
    caution: str
    mistake: str
    tags: tuple[str, ...]
    facts: tuple[tuple[str, bool, str], ...]
    cases: tuple[Case, ...]
    practice: tuple[Practice, ...]


def task(
    title: str,
    description: str,
    solution: str,
    tests: tuple[tuple[str, str], ...],
    hint: str,
    difficulty: str = "medium",
) -> Practice:
    return Practice(title, description, solution, tests, hint, difficulty)


def facts(*items: str) -> tuple[tuple[str, bool, str], ...]:
    """A leading ! marks a deliberately false statement, followed by its correction."""
    result = []
    for item in items:
        statement, reason = item.split("|", 1)
        result.append((statement.removeprefix("!"), not statement.startswith("!"), reason))
    return tuple(result)


def lesson(
    slug: str,
    title: str,
    summary: str,
    mechanics: str,
    use: str,
    caution: str,
    mistake: str,
    tags: str,
    facts: tuple[tuple[str, bool, str], ...],
    practice: tuple[Practice, ...],
) -> TopicContent:
    examples = tuple(
        Case(
            f"{exercise.title}: {'основной случай' if index == 0 else 'граничный случай'}",
            exercise.solution.replace("input()", repr(stdin.rstrip("\n"))),
            output,
            exercise.hint
            + (
                " Проследите, почему результат меняется на этой границе."
                if index
                else " Проследите путь данных от входа до результата."
            ),
        )
        for exercise in practice
        for index, (stdin, output) in enumerate(exercise.tests[:2])
    )
    return TopicContent(
        slug,
        title,
        summary,
        mechanics,
        use,
        caution,
        mistake,
        tuple(tags.split()),
        facts,
        examples,
        practice,
    )
