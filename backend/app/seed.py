import asyncio

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.bank import build_bank
from app.content.curriculum import LEVELS, TOPICS, TopicContent
from app.content.exercises import exercise_description, exercise_starter, with_given_data
from app.content.theory import THEORY
from app.content.trainer import TASKS
from app.core.database import SessionFactory, engine
from app.models.tables import (
    Achievement,
    Answer,
    Completion,
    Course,
    Exercise,
    ExerciseTest,
    Lesson,
    Level,
    Module,
    Project,
    ProjectSubmission,
    Question,
    QuestionMemory,
    Quiz,
    QuizAttempt,
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
            examples=[
                {"title": c.task, "code": c.code, "output": c.output, "explanation": c.explanation}
                for c in content.cases
            ],
            review=[
                f"{statement} {reason}"
                if truth
                else f"Частая ошибка: «{statement}» Это неверно. {reason}"
                for statement, truth, reason in content.facts
            ],
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
    # New resource IDs prevent old completion records from crediting different lessons.
    # Remove legacy learning material; retain earned XP in its append-only ledger.
    legacy_topics = select(Topic.id).where(Topic.id.not_in([topic.slug for topic in TOPICS]))
    legacy_questions = select(Question.id).where(Question.topic_id.in_(legacy_topics))
    legacy_quizzes = select(Quiz.id).where(Quiz.topic_id.in_(legacy_topics))
    legacy_attempts = select(QuizAttempt.id).where(QuizAttempt.quiz_id.in_(legacy_quizzes))
    await session.execute(delete(Answer).where(Answer.attempt_id.in_(legacy_attempts)))
    await session.execute(delete(QuizAttempt).where(QuizAttempt.id.in_(legacy_attempts)))
    await session.execute(
        delete(QuestionMemory).where(QuestionMemory.question_id.in_(legacy_questions))
    )
    await session.execute(
        update(Completion).where(Completion.topic_id.in_(legacy_topics)).values(topic_id=None)
    )
    legacy_exercises = select(Exercise.id).where(Exercise.topic_id.in_(legacy_topics))
    await session.execute(
        delete(ExerciseTest).where(ExerciseTest.exercise_id.in_(legacy_exercises))
    )
    await session.execute(delete(Exercise).where(Exercise.topic_id.in_(legacy_topics)))
    await session.execute(delete(Question).where(Question.topic_id.in_(legacy_topics)))
    await session.execute(delete(Quiz).where(Quiz.topic_id.in_(legacy_topics)))
    await session.execute(delete(Lesson).where(Lesson.id.in_(legacy_topics)))
    await session.execute(delete(Topic).where(Topic.id.in_(legacy_topics)))
    # All old positions must be clear before inserting the replacement catalogue.
    await session.execute(delete(Module).where(~Module.id.like("academy-%")))
    await session.execute(
        update(Level).where(~Level.id.like("academy-%")).values(position=Level.position + 100)
    )
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
    current_projects = [project[0] for project in projects]
    await session.execute(
        delete(ProjectSubmission).where(ProjectSubmission.project_id.not_in(current_projects))
    )
    await session.execute(delete(Project).where(Project.id.not_in(current_projects)))
    await session.execute(delete(Level).where(~Level.id.like("academy-%")))
    await seed_trainer(session)


async def seed_trainer(session: AsyncSession) -> None:
    current = [item.id for item in TASKS]
    obsolete = select(Exercise.id).where(Exercise.catalog == "trainer", Exercise.id.not_in(current))
    await session.execute(delete(ExerciseTest).where(ExerciseTest.exercise_id.in_(obsolete)))
    await session.execute(delete(Exercise).where(Exercise.id.in_(obsolete)))
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
    async with SessionFactory.begin() as session:
        await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
