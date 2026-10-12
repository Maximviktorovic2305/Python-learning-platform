# Python Lab

Образовательная платформа Python: Next.js App Router + FSD, типизированный FastAPI,
SQLAlchemy и PostgreSQL. Работа над первой версией идёт по этапам; текущая ветка
содержит промежуточную реализацию, а не подтверждённый production-релиз.

## Приложения

- `frontend/`: пользовательский интерфейс, порт 3010.
- `backend/`: API, порт 8010; схема OpenAPI является источником TypeScript-контрактов.
- Уровни 0–2: 15 крупных тем, 120 задач, 480 вопросов.
- Уровни 3–11: программа следующих этапов; не опубликованные уроки не выдаются за готовые.

## Разработка

Python >=3.13, Node.js >=24. PostgreSQL 18.

```powershell
python -m venv .venv
cd backend
..\.venv\Scripts\python -m pip install -e . --group dev
# Создайте .env из .env.example и задайте DATABASE_URL / JWT_SECRET.
..\.venv\Scripts\python -m alembic upgrade head
..\.venv\Scripts\python -m app.seed
..\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

В другом терминале:

```powershell
cd frontend
npm ci
npm run dev -- --port 3010
```

Локальный запуск упражнений выполняется через Pyodide в Web Worker. Серверная
проверка требует отдельного изолированного runner; без него API возвращает 503,
а XP за упражнение не начисляются.
