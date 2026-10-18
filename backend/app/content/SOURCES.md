# Источники и устройство новой программы

Программа соответствует 50 публичным темам основного курса [Python Academy](https://python-academy.org/ru/guide), проверенным 17 октября 2026 года. Четыре раздела и порядок тем сохранены. Платные дополнительные курсы, справочники и вопросы с собеседований не входят в основной курс.

Объяснения, код, практика и вопросы написаны для Python Lab самостоятельно. Исходные статьи не копируются и не поставляются с приложением. Примеры адаптированы к возможностям этой платформы; организационные уроки описывают её собственные вкладки и прогресс.

Теория охватывает все 50 тем и содержит 354 раздела: объяснение, код, результаты и пошаговые разборы находятся в одной статье. Отдельного этапа «Примеры» нет. На тему — две практические программы с исходными данными в solution.py и одной открытой проверкой результата, 20 вопросов с объяснениями. В попытке теста — 10 вопросов: 4 easy, 4 medium, 2 hard.

Отдельный тренажёр `/tasks` следует модели [Python Academy Trainer](https://python-academy.org/ru/trainer): каталог, выбор сложности и решение на странице. Все 24 условия, решения, подсказки и проверки написаны для Python Lab самостоятельно; задачи не выдаются за материалы конкретных работодателей. Тренажёр не меняет последовательность или процент прохождения основного курса.

Объём теории расширен 18 октября 2026 года собственными объяснениями в `theory.py` и `theory_expansion.py`. Материалы сайта не воспроизводятся дословно или близким пересказом. Размеры учебного текста сверены с CSS страницы [«Переменные»](https://python-academy.org/ru/guide/variables): 18 px и line-height 1.5, на ширине до 1098 px — 15 px и line-height 1.5. Тексты заданий, теста и закрепления используют ту же типографику; служебная сноска меньше основного текста.

Для сверки содержания использован публичный репозиторий SQL-Academy/ru.python-academy, commit `b22e485e378f394c8ef5a0ed727620a2909e5b3a`. Список соответствий:

| Тема Python Lab | Исходный раздел программы |
| --- | --- |
| Введение (`academy-introduction`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/00-introduction/00-intro-intro.md) |
| Структура курса (`academy-course-structure`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/00-introduction/01-intro-structure-of-course.md) |
| Сообщество (`academy-community`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/00-introduction/02-intro-community.md) |
| Установка Python (`academy-installation`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/00-introduction/03-python-installation.md) |
| Переменные (`academy-variables`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/01-fundamentals/00-variables.md) |
| Функции (`academy-functions`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/01-fundamentals/01-functions.md) |
| Область видимости переменных (`academy-scope`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/01-fundamentals/02-variable-scope.md) |
| Базовые типы данных (`academy-basic-types`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/01-fundamentals/03-basic-data-types/00-basic-data-types.md) |
| Числовые типы данных (`academy-numbers`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/01-fundamentals/03-basic-data-types/01-numeric-data-types.md) |
| Строковые типы данных (`academy-strings`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/01-fundamentals/03-basic-data-types/02-string-data-types.md) |
| Логический тип данных (`academy-booleans`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/01-fundamentals/03-basic-data-types/03-boolean-data-types.md) |
| Условная конструкция. Оператор if (`academy-if`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/01-fundamentals/04-if-statement.md) |
| Итерации и циклы (`academy-loops`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/01-fundamentals/05-loops.md) |
| Сложные типы данных (`academy-collections`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/01-fundamentals/06-complex-data-types/00-complex-data-types.md) |
| Списки (`academy-lists`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/01-fundamentals/06-complex-data-types/01-lists.md) |
| Кортежи (`academy-tuples`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/01-fundamentals/06-complex-data-types/02-tuples.md) |
| Множества (`academy-sets`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/01-fundamentals/06-complex-data-types/03-sets.md) |
| Словари (`academy-dictionaries`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/01-fundamentals/06-complex-data-types/04-dictionaries.md) |
| Использование библиотек (`academy-libraries`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/00-libraries/00-libraries.md) |
| Встроенные библиотеки (`academy-standard-library`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/00-libraries/01-built-in-libraries.md) |
| Сторонние библиотеки и pip (`academy-pip`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/00-libraries/02-third-party-libraries.md) |
| Модули в Python (`academy-modules`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/00-libraries/03-modules.md) |
| Работа с файлами (`academy-files`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/01-files/00-files.md) |
| Текстовые файлы (`academy-text-files`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/01-files/01-text-files.md) |
| Работа со структурированными файлами (JSON, CSV) (`academy-json-csv`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/01-files/02-structured-data.md) |
| Объектно-ориентированное программирование (`academy-oop`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/02-oop/00-oop.md) |
| Классы и объекты (`academy-classes`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/02-oop/01-classes.md) |
| Атрибуты и методы (`academy-attributes`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/02-oop/02-attributes.md) |
| Наследование (`academy-inheritance`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/02-oop/03-inheritance.md) |
| Инкапсуляция (`academy-encapsulation`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/02-oop/04-encapsulation.md) |
| Полиморфизм (`academy-polymorphism`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/02-oop/05-polymorphism.md) |
| Лямбда-функции (`academy-lambda`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/03-lambda-functions.md) |
| Обработка исключений (`academy-exceptions`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/04-exception-handling.md) |
| Декораторы (`academy-decorators`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/05-decorators.md) |
| Работа с датой и временем (`academy-datetime`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/06-datetime-handling.md) |
| Аннотации типов (`academy-type-annotations`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/02-fundamentals-2/07-type-annotations.md) |
| Базы данных и Python (`academy-databases`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/03-advanced/00-intro-to-databases/00-intro-to-databases.md) |
| SQLite в Python (`academy-sqlite`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/03-advanced/00-intro-to-databases/01-sqlite-python-basics.md) |
| SQLAlchemy Core (`academy-sqlalchemy-core`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/03-advanced/00-intro-to-databases/02-sqlalchemy-core-basics.md) |
| SQLAlchemy ORM (`academy-sqlalchemy-orm`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/03-advanced/00-intro-to-databases/03-sqlalchemy-orm-basics.md) |
| Введение в тестирование (`academy-testing`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/03-advanced/01-intro-to-testing/00-intro-to-testing.md) |
| Основы pytest (`academy-pytest`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/03-advanced/01-intro-to-testing/01-pytest-basics.md) |
| pytest: фикстуры и параметризация (`academy-pytest-fixtures`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/03-advanced/01-intro-to-testing/02-pytest-fixtures-parametrization.md) |
| Моки и заглушки (`academy-mocks`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/03-advanced/01-intro-to-testing/03-mocks-and-stubs.md) |
| Модуль unittest (`academy-unittest`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/03-advanced/01-intro-to-testing/04-unittest-module.md) |
| Покрытие кода и CI (`academy-coverage-ci`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/03-advanced/01-intro-to-testing/05-coverage-and-ci.md) |
| Параллельное и асинхронное программирование (`academy-concurrency`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/03-advanced/02-intro-concurrency-async/00-intro-concurrency-async.md) |
| Потоки и процессы (`academy-threads-processes`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/03-advanced/02-intro-concurrency-async/01-threading-and-multiprocessing.md) |
| Асинхронное программирование (`academy-asyncio`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/03-advanced/02-intro-concurrency-async/02-asyncio-basics.md) |
| Продвинутое асинхронное программирование (`academy-asyncio-advanced`) | [Материал](https://github.com/SQL-Academy/ru.python-academy/blob/b22e485e378f394c8ef5a0ed727620a2909e5b3a/course/03-advanced/02-intro-concurrency-async/03-asyncio-advanced.md) |

В браузере используются пакеты SQLAlchemy и pytest из lock-файла установленного Pyodide. Они скачиваются при подготовке приложения, проверяются SHA-256 и отдаются с того же домена. Системные потоки и процессы проверяются серверным исполнителем; в интерфейсе это указано явно.

Новая программа имеет новые идентификаторы: прохождение прежнего урока не засчитывается как освоение другого материала. Обычный seed заменяет старый каталог. Полный сброс пользователей и прогресса вынесен в отдельную явную команду `python -m app.reset_learning --keep-email EMAIL --apply`. Она отказывается работать, если сохраняемая учётная запись не найдена ровно один раз; удаление и заполнение выполняются в одной транзакции.
