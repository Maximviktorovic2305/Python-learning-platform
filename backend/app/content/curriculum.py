"""Published course catalogue; original lesson text is grouped by section."""

from app.content.advanced import TOPICS as ADVANCED
from app.content.applied import TOPICS as APPLIED
from app.content.fundamentals import TOPICS as FUNDAMENTALS
from app.content.introduction import TOPICS as INTRODUCTION
from app.content.lesson_content import TopicContent as TopicContent

TOPICS = INTRODUCTION + FUNDAMENTALS + APPLIED + ADVANCED
LEVELS = (
    (
        "Введение",
        "Знакомство с курсом, учебный процесс и установка Python.",
        (("Первые шаги", tuple(t.slug for t in INTRODUCTION)),),
    ),
    (
        "Основы Python",
        "Переменные, функции, типы данных, условия, циклы и коллекции.",
        (("Язык и данные", tuple(t.slug for t in FUNDAMENTALS)),),
    ),
    (
        "Python на практике",
        "Библиотеки, файлы, ООП и инструменты языка.",
        (
            ("Библиотеки и файлы", tuple(t.slug for t in APPLIED[:7])),
            ("Объекты и возможности языка", tuple(t.slug for t in APPLIED[7:])),
        ),
    ),
    (
        "Продвинутый Python",
        "Базы данных, автоматические тесты и конкурентное выполнение.",
        (
            ("Базы данных", tuple(t.slug for t in ADVANCED[:4])),
            ("Тестирование", tuple(t.slug for t in ADVANCED[4:10])),
            ("Конкурентность и asyncio", tuple(t.slug for t in ADVANCED[10:])),
        ),
    ),
)
