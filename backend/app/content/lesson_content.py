"""Original Russian lessons aligned with Python Academy's public syllabus."""

from dataclasses import dataclass

from app.content.exercises import with_given_data


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
            exercise.title,
            with_given_data(exercise.solution, stdin.rstrip("\n")),
            output,
            exercise.hint.replace("строку input()", "строку из заготовки"),
        )
        for exercise in practice
        for stdin, output in exercise.tests[:2]
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
