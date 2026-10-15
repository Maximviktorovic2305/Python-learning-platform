import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

from app.content.bank import TOPIC_HINTS, build_bank
from app.content.curriculum import LEVELS, TOPICS, TopicContent
from app.content.exercises import exercise_starter
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
            minutes=20 + len(content.tags),
            published=True,
            tags=list(content.tags),
        )
    )
    await session.flush()
    await session.merge(
        Lesson(
            id=content.slug,
            theory=[
                {"title": title, "body": body}
                for title, body in (
                    ("Что это и зачем", content.summary),
                    ("Как это работает", content.mechanics),
                    ("Когда применять", content.use),
                    ("Границы применения", content.caution),
                    ("Ошибки и лучшие практики", content.mistake),
                )
            ],
            examples=[
                {"title": c.task, "code": c.code, "output": c.output, "explanation": c.explanation}
                for c in content.cases
            ],
            review=[reason for _, _, reason in content.facts],
        )
    )
    for i, scenario in enumerate(content.cases[:8]):
        eid = f"{content.slug}-e{i + 1}"
        kind = "code_completion" if i in (1, 4) else "code_writing"
        starter = exercise_starter(scenario.code)
        await session.merge(
            Exercise(
                id=eid,
                topic_id=content.slug,
                title=scenario.task,
                description=scenario.task
                + " Программа должна вывести:\n"
                + scenario.output
                + "\nИспользуйте приёмы из теории этого урока. Не добавляйте к выводу лишние сообщения.",
                difficulty="easy" if i < 3 else "medium" if i < 6 else "hard",
                kind=kind,
                starter_code=starter,
                solution=scenario.code,
                hints=[TOPIC_HINTS[content.slug], scenario.explanation],
            )
        )
        await session.flush()
        await session.merge(
            ExerciseTest(id=f"{eid}-t1", exercise_id=eid, stdin="", expected_stdout=scenario.output)
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
            title="Python — From Zero to Professional",
            description="Практический путь от первой строки к приложениям, которые работают в production.",
        )
    )
    await session.flush()
    authored = {topic.slug: topic for topic in TOPICS}
    for i, (title, description, modules) in enumerate(LEVELS):
        lid = f"level-{i}"
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
            "01-cli",
            2,
            "CLI Task Manager",
            "Менеджер задач в терминале с хранением состояния.",
            [
                "Добавление, завершение, удаление задач",
                "Аргументы CLI и понятные ошибки",
                "Сохранение JSON",
                "Тесты обработки пустых данных",
            ],
        ),
        (
            "02-data",
            5,
            "File & Data Processing",
            "Конвейер очистки CSV и формирования отчёта.",
            [
                "Валидация строк CSV",
                "Отчёт JSON",
                "Логирование ошибок",
                "Обработка больших файлов по строкам",
            ],
        ),
        (
            "03-rest",
            8,
            "REST API",
            "Типизированный API заметок.",
            [
                "CRUD и пагинация",
                "Pydantic-контракты",
                "SQLAlchemy и миграции",
                "Интеграционные тесты",
            ],
        ),
        (
            "04-auth",
            8,
            "Authentication Service",
            "Сервис учётных записей и сессий.",
            [
                "Хеширование Argon2",
                "JWT и ротация refresh",
                "Отзыв сессий",
                "Защита входа от перебора",
            ],
        ),
        (
            "05-blog",
            9,
            "Blog API",
            "API публикаций с комментариями и правами.",
            ["Роли и владение ресурсами", "Поиск и пагинация", "Транзакции", "Тесты авторизации"],
        ),
        (
            "06-shop",
            10,
            "E-commerce Backend",
            "Каталог, корзина и жизненный цикл заказов.",
            [
                "Decimal для денег",
                "Идемпотентное создание заказа",
                "Транзакции остатков",
                "Сервисные границы",
            ],
        ),
        (
            "07-realtime",
            11,
            "Real-time Application",
            "Чат с потоковыми событиями.",
            [
                "WebSocket и аутентификация",
                "Переподключение клиента",
                "Backpressure",
                "Метрики соединений",
            ],
        ),
        (
            "08-capstone",
            11,
            "Production Capstone",
            "Соберите, протестируйте и разверните самостоятельный продукт.",
            [
                "Документированная архитектура",
                "CI и контейнеры",
                "Наблюдаемость и health checks",
                "Нагрузочная проверка и rollback",
            ],
        ),
    )
    for pid, level, title, description, requirements in projects:
        await session.merge(
            Project(
                id=pid,
                level_id=f"level-{level}",
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


async def main() -> None:
    async with SessionFactory.begin() as session:
        await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
