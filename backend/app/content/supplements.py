"""Join additive authoring without changing existing assessment identities."""

from dataclasses import replace
from pathlib import Path

from app.content.learning_paths import PATHS
from app.content.lesson_content import TopicContent
from app.content.supplement_advanced import SUPPLEMENTS as ADVANCED
from app.content.supplement_applied import SUPPLEMENTS as APPLIED
from app.content.supplement_basics import SUPPLEMENTS as BASICS
from app.content.supplement_types import Supplement

SUPPLEMENTS: dict[str, Supplement] = {**BASICS, **APPLIED, **ADVANCED}


def extend_topics(topics: tuple[TopicContent, ...]) -> tuple[TopicContent, ...]:
    result = []
    for topic in topics:
        extra = SUPPLEMENTS.get(topic.slug)
        if extra is not None:
            path = PATHS[topic.slug]
            PATHS[topic.slug] = replace(path, practice=(*path.practice, extra.guide))
            topic = replace(topic, practice=(*topic.practice, extra.practice))
        result.append(topic)
    return tuple(result)


def expanded_sections(slug: str) -> tuple[tuple[str, str], ...]:
    source = Path(__file__).with_name("expanded_theory") / f"{slug}.md"
    sections: list[tuple[str, str]] = []
    title: str | None = None
    lines: list[str] = []
    for line in source.read_text(encoding="utf-8").splitlines():
        if line.startswith("# "):
            continue
        if line.startswith("## "):
            if title is not None:
                sections.append((title, "\n".join(lines).strip()))
            title, lines = line[3:], []
        else:
            lines.append(line)
    if title is not None:
        sections.append((title, "\n".join(lines).strip()))
    if len(sections) < 3 or any(not body for _, body in sections):
        raise ValueError(f"Incomplete authored expansion: {slug}")
    extra = SUPPLEMENTS.get(slug)
    if extra is not None:
        example = extra.example
        sections.append(
            (
                example.task,
                f"{example.explanation}\n\n```python\n{example.code}\n```\n\n```text\n{example.output}\n```\n\n{extra.guide.approach}",
            )
        )
    return tuple(sections)
