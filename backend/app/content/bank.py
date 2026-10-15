import random
from dataclasses import dataclass

from app.content.curriculum import TopicContent

TOPIC_HINTS = {
    "first-program": "Отдельно проследите аргументы print, разделитель sep и окончание end. Вывод на экран и возвращаемое значение — разные вещи.",
    "variables-types": "Для каждого имени запишите его текущее значение и тип. Различайте новое присваивание, изменение общего списка и создание копии.",
    "numbers-operators": "Сначала расставьте порядок действий. Для // и % проверьте равенство: делимое = частное × делитель + остаток.",
    "strings": "Отметьте индексы от нуля и границы среза. Затем проверьте, сохраняется ли результат строкового метода в переменную.",
    "input-conversion": "Определите тип каждого значения до и после преобразования. В and/or проследите, на каком операнде прекращается вычисление.",
    "conditions": "Проверьте условия сверху вниз и учтите границы сравнения. Различайте одну цепочку elif и несколько независимых if.",
    "loops": "Выпишите значения для каждого прохода, не включая правую границу range. Отметьте, где срабатывают break или continue.",
    "sequences": "Проследите состав списка после каждой команды. Различайте изменение на месте, возвращаемое значение и общий вложенный объект.",
    "sets-dicts": "Разделите ключи и значения словаря. Для множества выпишите уникальные элементы; для get проверьте наличие ключа.",
    "comprehensions": "Сначала разберите перебор, затем фильтр, затем выражение результата. Проверьте вид скобок и не израсходован ли генератор.",
    "functions": "Начните с вызова, подставьте аргументы и идите до return. Отдельно записывайте вывод print и возвращаемое значение.",
    "arguments": "Сопоставьте аргументы параметрам. Уточните роль звёздочек в определении и вызове и момент создания значения по умолчанию.",
    "scope-lambda": "Для каждого имени найдите область, где оно создано. Проверьте, когда lambda читает имя и когда вычисляется её default.",
    "modules": "Посмотрите, какое имя связывает import и что доступно через точку. При повторном импорте учитывайте кеш модуля.",
    "environments": "Различайте команду терминала и Python-код, версию Python и версию пакета. Проследите операции над строками зависимостей.",
}


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
                id=f"{topic.slug}-q{len(questions) + 1}",
                difficulty=difficulty,
                kind=kind,
                prompt=prompt,
                code=code,
                options=[options[i] for i in order],
                correct_answer=[i for i, original in enumerate(order) if original in correct],
                explanation=explanation,
                hint=f"Повторите теорию «{topic.title}». {TOPIC_HINTS[topic.slug]}",
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
            reason,
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
            "Что программа выведет на экран? Учитывайте порядок строк и пробелы.",
            scenario.code,
            [scenario.output, *distractors],
            [0],
            scenario.explanation,
            "easy" if i < 4 else "medium" if i < 8 else "hard",
        )
    for i in range(4):
        scenario = topic.cases[8 + i]
        reasons = [
            scenario.explanation,
            topic.cases[(i + 2) % 12].explanation,
            topic.cases[(i + 5) % 12].explanation,
            "Python пропускает эти команды, поэтому программа ничего не выводит.",
        ]
        add(
            "code_review",
            "Выберите корректное объяснение поведения этого кода.",
            scenario.code,
            reasons,
            [0],
            scenario.explanation,
            "hard",
        )
    for i in range(4):
        selected = [topic.facts[(i * 2 + j) % 8] for j in range(4)]
        add(
            "multiple_select",
            f"Какие утверждения верны по материалу темы «{topic.title}»? Выберите все подходящие.",
            None,
            [s for s, _, _ in selected],
            [j for j, (_, truth, _) in enumerate(selected) if truth],
            " ".join(reason for _, _, reason in selected),
            "medium",
        )
    for i in range(4):
        scenario = topic.cases[4 + i]
        choices = [
            scenario.task,
            topic.cases[i].task,
            topic.cases[i + 8].task,
            "Код только объявляет переменные и никогда ничего не выводит.",
        ]
        add(
            "architecture",
            "Какую задачу решает эта программа?",
            scenario.code,
            choices,
            [0],
            scenario.explanation,
            "easy",
        )
    return questions
