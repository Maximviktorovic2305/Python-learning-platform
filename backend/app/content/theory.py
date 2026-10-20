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


def practice_bridge(topic: TopicContent) -> str:
    path = PATHS[topic.slug]
    return "\n\n".join(
        f"Задание {index}: «{exercise.title}». {guidance.approach}"
        for index, (exercise, guidance) in enumerate(
            zip(topic.practice, path.practice, strict=True), start=1
        )
    ) + (
        "\n\nДанные уже находятся в начале solution.py. Сначала предскажите результат, "
        "затем допишите алгоритм и сравните вывод с условием. Изменение данных полезно "
        "для собственного эксперимента; перед проверкой восстановите заданный пример. "
        "Сервер проверяет результат на открытом примере, поэтому самостоятельно "
        "проверьте также случаи из закрепления."
    )


def build_theory(topic: TopicContent) -> Theory:
    path = PATHS[topic.slug]
    organizational = topic.slug in THEORY_ONLY_TOPICS
    sections: Theory = (
        ("Цель и связь с изученным", f"{path.goal}\n\n{path.connection}"),
        ("Понятие и механизм", f"{topic.summary}\n\n{topic.mechanics}"),
        ("Разбираем программу по шагам", EXAMPLES[topic.slug]),
        *DETAILS[topic.slug],
        ("Правила и границы применения", rule_notes(topic)),
        (
            "Как выбрать приём и избежать ошибки",
            f"{topic.use}\n\n{topic.caution}\n\n{topic.mistake}",
        ),
    )
    if not organizational:
        sections += (
            ("От теории к решению", practice_bridge(topic)),
            (
                "Что проверяет тест",
                "Утверждения проверяют правила из раздела «Правила и границы применения». "
                "В вопросах с кодом проследите состояние программы по строкам, затем "
                "определите вывод или выберите объяснение использованного приёма. "
                "Эти же приёмы разобраны в разделе «От теории к решению». "
                "В тесте встречаются другие данные: запоминать конкретный ответ примера не нужно. "
                "В вопросах с несколькими ответами оцените каждое утверждение отдельно. "
                "После ошибки прочитайте объяснение, вернитесь к правилу и проверьте его "
                "на собственном небольшом примере. В попытке 10 вопросов, для зачёта нужно 70%.",
            ),
        )
    sections += (
        (
            "Самопроверка без подсказки",
            "\n\n".join(guidance.transfer for guidance in path.practice)
            + (
                "\n\nСначала ответьте своими словами без открытой теории. Если ответ "
                "не получается обосновать, вернитесь к объяснению соответствующего "
                "приёма, затем повторите рассуждение на других данных."
            ),
        ),
    )
    return sections


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
