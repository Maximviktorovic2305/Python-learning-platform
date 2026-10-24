"""Authored lesson extensions, independent of the catalogue assembly."""

from dataclasses import dataclass

from app.content.learning_paths import PracticeGuide
from app.content.lesson_content import Case, Practice


@dataclass(frozen=True)
class Supplement:
    practice: Practice
    guide: PracticeGuide
    example: Case
    question: str
    options: tuple[str, str, str]


def supplement(
    slug: str,
    title: str,
    instruction: str,
    solution: str,
    tests: tuple[tuple[str, str], ...],
    hint: str,
    code: str,
    output: str,
    explanation: str,
    question: str,
    correct: str,
    wrong_a: str,
    wrong_b: str,
    difficulty: str = "medium",
) -> tuple[str, Supplement]:
    return slug, Supplement(
        Practice(title, instruction, solution, tests, hint, difficulty),
        PracticeGuide(
            instruction.partition(". ")[2] or instruction,
            hint,
            f"Перенесите приём из задачи «{title}» на другие данные и объясните граничный случай.",
        ),
        Case("Развёрнутый пример", code, output, explanation),
        question,
        (correct, wrong_a, wrong_b),
    )
