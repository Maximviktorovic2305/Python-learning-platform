"""Course articles assembled from authored explanations and aligned learning paths."""

from app.content.curriculum import TOPICS, TopicContent
from app.content.learning_paths import PATHS
from app.content.theory_examples import EXAMPLES
from app.content.theory_expansion import DETAILS
from app.domain.learning import THEORY_ONLY_TOPICS

Theory = tuple[tuple[str, str], ...]


def rule_notes(topic: TopicContent) -> str:
    """Teach every assessed rule, including the correction of common misconceptions."""
    return "\n\n".join(
        f"{statement} {reason}"
        if truth
        else f"Разберём заблуждение: «{statement}» Это неверно. {reason}"
        for statement, truth, reason in topic.facts
    )


def build_theory(topic: TopicContent) -> Theory:
    path = PATHS[topic.slug]
    return (
        ("Цель и связь с изученным", f"{path.goal}\n\n{path.connection}"),
        ("Понятие и механизм", f"{topic.summary}\n\n{topic.mechanics}"),
        ("Разбираем программу по шагам", EXAMPLES[topic.slug]),
        *DETAILS[topic.slug],
        ("Правила и границы применения", rule_notes(topic)),
    )


def build_review(topic: TopicContent) -> list[str]:
    path = PATHS[topic.slug]
    if topic.slug in THEORY_ONLY_TOPICS:
        return [
            "В этой организационной теме практика и тест не предусмотрены. Для завершения отметьте теорию изученной.",
            *(guidance.transfer for guidance in path.practice),
            f"Критерий освоения: {path.goal}",
            topic.mistake,
        ]
    return [
        f"Цель для самопроверки: {path.goal}",
        *(guidance.transfer for guidance in path.practice),
        f"Проверьте типичную ошибку в своём решении: {topic.mistake}",
        "После ответа проверьте объяснение в теории и повторите тест. Уверенное решение должно сохранять смысл при изменении данных, а не только воспроизводить один ожидаемый вывод.",
    ]


THEORY = {topic.slug: build_theory(topic) for topic in TOPICS}
REVIEWS = {topic.slug: build_review(topic) for topic in TOPICS}
