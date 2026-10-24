import asyncio

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.bank import build_bank
from app.content.curriculum import LEVELS, TOPICS, TopicContent
from app.content.exercises import exercise_description, exercise_starter, with_given_data
from app.content.theory import REVIEWS, THEORY
from app.content.trainer import TASKS
from app.core.config import get_settings
from app.core.database import SessionFactory, engine
from app.models.tables import (
    Achievement,
    Course,
    Exercise,
    ExerciseTest,
    Lesson,
    Level,
    Module,
    Project,
    Question,
    Quiz,
    Topic,
)


async def seed_topic(
    session: AsyncSession, module_id: str, position: int, content: TopicContent
) -> None:
    await session.merge(
        Topic(
            id=content.slug,
            module_id=module_id,
            position=position,
            title=content.title,
            summary=content.summary,
            minutes=25 + len(content.tags),
            published=True,
            tags=list(content.tags),
        )
    )
    await session.flush()
    await session.merge(
        Lesson(
            id=content.slug,
            theory=[{"title": title, "body": body} for title, body in THEORY[content.slug]],
            examples=[],
            review=REVIEWS[content.slug],
        )
    )
    for i, scenario in enumerate(content.practice):
        eid = f"{content.slug}-e{i + 1}"
        kind = "code_writing"
        solution = with_given_data(scenario.solution, scenario.tests[0][0])
        starter = exercise_starter(solution)
        await session.merge(
            Exercise(
                id=eid,
                topic_id=content.slug,
                catalog="lesson",
                tags=list(content.tags),
                title=scenario.title,
                description=exercise_description(
                    scenario.description, scenario.tests[0][1], starter
                ),
                difficulty=scenario.difficulty,
                kind=kind,
                starter_code=starter,
                solution=solution,
                hints=[
                    scenario.hint.replace("строку input()", "строку из заготовки"),
                    content.mistake,
                ],
            )
        )
        await session.flush()
        test_ids = [f"{eid}-t1"]
        await session.execute(
            delete(ExerciseTest).where(
                ExerciseTest.exercise_id == eid, ExerciseTest.id.not_in(test_ids)
            )
        )
        for index, (_stdin, stdout) in enumerate(scenario.tests[:1]):
            await session.merge(
                ExerciseTest(id=test_ids[index], exercise_id=eid, stdin="", expected_stdout=stdout)
            )
    for q in build_bank(content):
        await session.merge(
            Question(
                id=q.id,
                topic_id=content.slug,
                difficulty=q.difficulty,
                kind=q.kind,
                prompt=q.prompt,
                code=q.code,
                options=q.options,
                correct_answer=q.correct_answer,
                explanation=q.explanation,
                hint=q.hint,
                tags=q.tags,
            )
        )
    await session.merge(
        Quiz(
            id=f"{content.slug}-quiz",
            topic_id=content.slug,
            title=f"Проверка: {content.title}",
            distribution={"easy": 4, "medium": 4, "hard": 2},
        )
    )


async def seed(session: AsyncSession) -> None:
    await session.merge(
        Course(
            id="python",
            title="Python: от основ к самостоятельной разработке",
            description="50 тем: понятная теория, разобранные примеры, самостоятельная практика и тесты с объяснениями.",
        )
    )
    await session.flush()
    # Initial filling is additive. Retiring published content and its history
    # belongs to an explicit data migration, never to this initialization tool.
    authored = {topic.slug: topic for topic in TOPICS}
    for i, (title, description, modules) in enumerate(LEVELS):
        lid = f"academy-level-{i}"
        await session.merge(
            Level(id=lid, course_id="python", position=i, title=title, description=description)
        )
        await session.flush()
        for j, (module_title, slugs) in enumerate(modules):
            mid = f"{lid}-module-{j}"
            await session.merge(Module(id=mid, level_id=lid, position=j, title=module_title))
            await session.flush()
            for k, slug in enumerate(slugs):
                if slug in authored:
                    await seed_topic(session, mid, k, authored[slug])
                else:
                    await session.merge(
                        Topic(
                            id=slug,
                            module_id=mid,
                            position=k,
                            title=slug.replace("-", " ").title(),
                            summary=f"{title}: {slug.replace('-', ' ')}. Раздел программы; учебный материал готовится к публикации.",
                            minutes=30,
                            published=False,
                            tags=[slug],
                        )
                    )
    achievements = (
        ("first-lesson", "Первая строка", "Завершить первый урок", "lesson", 1),
        ("first-exercise", "Практик", "Решить первое задание", "exercise", 1),
        ("first-quiz", "Первый тест", "Пройти тест с результатом от 70%", "quiz", 1),
        ("beginner", "Python Beginner", "Завершить 5 уроков", "lesson", 5),
        ("explorer", "Python Explorer", "Завершить 15 уроков", "lesson", 15),
        ("ten-exercises", "Точно в цель", "Решить 10 заданий", "exercise", 10),
        ("hundred-exercises", "100 решений", "Решить 100 заданий", "exercise", 100),
        ("five-hundred", "500 решений", "Решить 500 заданий", "exercise", 500),
        ("perfect", "Без единой ошибки", "Получить 100% в тесте", "perfect", 1),
        ("perfect-five", "Точность инженера", "Получить 100% в пяти тестах", "perfect", 5),
        ("streak-three", "Ритм", "Учиться 3 дня подряд", "streak", 3),
        ("streak-seven", "Неделя Python", "Учиться 7 дней подряд", "streak", 7),
        ("streak-thirty", "Привычка", "Учиться 30 дней подряд", "streak", 30),
        ("builder", "Project Builder", "Получить одобрение проекта", "project", 1),
        ("xp-thousand", "Набирая скорость", "Заработать 1000 XP", "xp", 1000),
        ("master", "Python Master", "Заработать 10000 XP", "xp", 10000),
    )
    for aid, title, description, metric, threshold in achievements:
        await session.merge(
            Achievement(
                id=aid, title=title, description=description, metric=metric, threshold=threshold
            )
        )
    projects = (
        (
            "academy-word-report",
            1,
            "Анализатор текста",
            "Подсчёт частот и поиск слов в пользовательском тексте.",
            [
                "Нормализация регистра и пробелов",
                "Частоты через словарь или Counter",
                "Стабильный порядок отчёта",
                "Проверки пустого текста, повторов и кириллицы",
            ],
        ),
        (
            "academy-task-manager",
            2,
            "Менеджер задач",
            "Консольные задачи с хранением JSON и объектной моделью.",
            [
                "Добавление и завершение задач",
                "Чтение и запись UTF-8 JSON",
                "Обработка повреждённого файла",
                "Разделение ввода, расчётов и хранения",
            ],
        ),
        (
            "academy-sqlite-catalog",
            3,
            "Каталог в SQLite",
            "Небольшой каталог с транзакциями и SQLAlchemy.",
            [
                "Создание схемы и CRUD",
                "Параметризованные фильтры",
                "Ограничения и откат ошибок",
                "Интеграционные тесты в отдельной базе",
            ],
        ),
        (
            "academy-tested-pipeline",
            3,
            "Проверенный конвейер данных",
            "Обработка набора данных с тестами и асинхронным этапом.",
            [
                "Фикстуры и параметризация pytest",
                "Подмена внешней зависимости",
                "Очередь с ограничением размера и завершением",
                "Повторяемый запуск проверок и отчёт покрытия",
            ],
        ),
    )
    for pid, level, title, description, requirements in projects:
        await session.merge(
            Project(
                id=pid,
                level_id=f"academy-level-{min(level, 3)}",
                title=title,
                description=description,
                requirements=requirements,
                rubric=[
                    "Работающий сценарий и обработка ошибок",
                    "Ясные границы и типизация",
                    "Тесты критического поведения",
                    "README с инструкциями запуска",
                ],
            )
        )
    await session.flush()
    await seed_trainer(session)


async def seed_trainer(session: AsyncSession) -> None:
    for item in TASKS:
        content = item.practice
        stdin, stdout = content.tests[0]
        solution = with_given_data(content.solution, stdin)
        starter = exercise_starter(solution)
        await session.merge(
            Exercise(
                id=item.id,
                topic_id=None,
                catalog="trainer",
                tags=list(item.tags),
                title=content.title,
                description=exercise_description(content.description, stdout, starter),
                difficulty=content.difficulty,
                kind="code_writing",
                starter_code=starter,
                solution=solution,
                hints=[content.hint],
            )
        )
        await session.flush()
        await session.execute(delete(ExerciseTest).where(ExerciseTest.exercise_id == item.id))
        for index, (_stdin, stdout) in enumerate(content.tests[:1]):
            await session.merge(
                ExerciseTest(
                    id=f"{item.id}-t{index + 1}",
                    exercise_id=item.id,
                    stdin="",
                    expected_stdout=stdout,
                )
            )


async def main() -> None:
    # Older root-owned deployment helpers may still invoke this command.
    # Production already has the published catalogue: do not rewrite its data.
    if get_settings().environment == "production":
        print("Production curriculum initialization is disabled; no data changed.")
        return
    async with SessionFactory.begin() as session:
        await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
