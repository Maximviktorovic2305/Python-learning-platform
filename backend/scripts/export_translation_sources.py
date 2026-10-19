"""Export display text from an isolated in-memory seed, never from a user's database."""

import asyncio
import json
import re
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.tables import (
    Achievement,
    Base,
    Course,
    Exercise,
    Lesson,
    Level,
    Module,
    Project,
    Question,
    Topic,
)
from app.seed import seed


async def main() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    sources: set[str] = set()

    def collect_exercise(value: str) -> None:
        index = 0

        def placeholder(match: re.Match[str]) -> str:
            nonlocal index
            result = f"{{{index}}}"
            index += 1
            return result

        collect(re.sub(r'«[^»\n]*»|\x27[^\x27\n]*\x27|"[^"\n]*"', placeholder, value))

    def collect(value: object) -> None:
        if isinstance(value, str) and re.search("[А-Яа-яЁё]", value):
            sources.add(value.strip())
        elif isinstance(value, list):
            for item in value:
                collect(item)
        elif isinstance(value, dict):
            for key, item in value.items():
                if key not in {
                    "code",
                    "output",
                    "starter_code",
                    "solution",
                    "stdin",
                    "expected_stdout",
                }:
                    collect(item)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with async_sessionmaker(engine).begin() as session:
        await seed(session)
        for model, fields in (
            (Course, ("title", "description")),
            (Level, ("title", "description")),
            (Module, ("title",)),
            (Topic, ("title", "summary", "tags")),
            (Lesson, ("theory", "review")),
            (Exercise, ("title", "description", "hints", "tags")),
            (Question, ("prompt", "options", "explanation", "hint")),
            (Achievement, ("title", "description")),
            (Project, ("title", "description", "requirements", "rubric")),
        ):
            for record in await session.scalars(select(model)):
                for field in fields:
                    if (
                        isinstance(record, Question)
                        and record.kind == "output_prediction"
                        and field == "options"
                    ):
                        collect(["Возникнет исключение до вывода", "(пустой вывод)"])
                    else:
                        collect(getattr(record, field))
                if isinstance(record, Exercise):
                    for hint in record.hints:
                        collect_exercise(hint)
                    # The description renderer translates prose lines individually.
                    for block in record.description.split("\n\n"):
                        lines = block.splitlines()
                        for line in lines:
                            if not re.match(r"^(?:[\w, ]+ = |#|print\(|[\d .]+$)", line):
                                collect(line)
                                collect_exercise(line)
    await engine.dispose()
    # API errors are display text too; do not collect logging, secrets or config.
    import ast

    root = Path(__file__).resolve().parents[1] / "app"
    for directory in ("api", "services", "domain", "schemas"):
        for path in (root / directory).rglob("*.py"):
            for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
                if isinstance(node, ast.Constant) and isinstance(node.value, str):
                    collect(node.value)
                elif isinstance(node, ast.JoinedStr):
                    index = 0
                    parts = []
                    for item in node.values:
                        if isinstance(item, ast.Constant) and isinstance(item.value, str):
                            parts.append(item.value)
                        else:
                            parts.append(f"{{{index}}}")
                            index += 1
                    collect("".join(parts))
    destination = (
        Path(__file__).resolve().parents[2] / "frontend/src/shared/i18n/content-sources.json"
    )
    destination.write_text(
        json.dumps(sorted(sources), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Exported {len(sources)} content strings from the isolated seed")


if __name__ == "__main__":
    asyncio.run(main())
