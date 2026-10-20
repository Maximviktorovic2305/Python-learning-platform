import random
from dataclasses import dataclass

from app.content.curriculum import TopicContent
from app.content.learning_paths import PATHS
from app.domain.learning import QUESTION_BANK_REVISION


@dataclass(frozen=True)
class BankQuestion:
    id: str
    difficulty: str
    kind: str
    prompt: str
    code: str | None
    options: list[str]
    correct_answer: list[int]
    explanation: str
    hint: str
    tags: list[str]


def build_bank(topic: TopicContent) -> list[BankQuestion]:
    """Render authored concepts and distinct executable scenarios into varied assessments."""
    questions: list[BankQuestion] = []
    rng = random.Random(topic.slug)

    def add(
        kind: str,
        prompt: str,
        code: str | None,
        options: list[str],
        correct: list[int],
        explanation: str,
        difficulty: str,
    ) -> None:
        order = list(range(len(options)))
        rng.shuffle(order)
        questions.append(
            BankQuestion(
                id=f"{topic.slug}-{QUESTION_BANK_REVISION}-{len(questions) + 1}",
                difficulty=difficulty,
                kind=kind,
                prompt=prompt,
                code=code,
                options=[options[i] for i in order],
                correct_answer=[i for i, original in enumerate(order) if original in correct],
                explanation=explanation,
                hint=f"В теории вернитесь к разделу «Правила и границы применения». {topic.mistake}",
                tags=list(topic.tags),
            )
        )

    for i, (statement, truth, reason) in enumerate(topic.facts):
        add(
            "true_false",
            statement,
            None,
            ["Верно", "Неверно"],
            [0 if truth else 1],
            f"{reason} Разбор правила находится в теории: «Правила и границы применения».",
            "easy" if i < 4 else "medium",
        )
    for i, scenario in enumerate(topic.cases):
        other_outputs = list(
            dict.fromkeys(c.output for c in topic.cases if c.output != scenario.output)
        )
        rng.shuffle(other_outputs)
        distractors = other_outputs[:2] + ["Возникнет исключение до вывода"]
        add(
            "output_prediction",
            f"{scenario.task}: проследите значения по строкам и выберите точный вывод.",
            scenario.code,
            [output or "(пустой вывод)" for output in [scenario.output, *distractors]],
            [0],
            f"{scenario.explanation} Подробности — в теории: «Правила и границы применения».",
            "easy" if i < 2 else "medium",
        )
    for i in range(4):
        scenario = topic.cases[i]
        false_statements = [statement for statement, truth, _ in topic.facts if not truth]
        reasons = [
            scenario.explanation,
            *false_statements[:3],
        ]
        add(
            "code_review",
            f"{scenario.task}: какой ход рассуждений объясняет результат программы?",
            scenario.code,
            reasons,
            [0],
            f"{scenario.explanation} Цель темы: {PATHS[topic.slug].goal}",
            "hard",
        )
    for i in range(4):
        selected = [topic.facts[(i * 2 + j) % 8] for j in range(3)]
        add(
            "multiple_select",
            f"Примените правила темы «{topic.title}»: выберите все верные утверждения.",
            None,
            [s for s, _, _ in selected],
            [j for j, (_, truth, _) in enumerate(selected) if truth],
            " ".join(reason for _, _, reason in selected),
            "medium",
        )
    return questions
