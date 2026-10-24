"""Verify published, repository-authored solutions only inside disposable Docker."""

import argparse
import asyncio
import sys
from pathlib import Path


async def main(workers: int) -> None:
    root = Path(__file__).resolve().parents[1]
    sys.path[:0] = [str(root), str(root / "backend")]
    from app.content.curriculum import TOPICS
    from app.content.exercises import with_given_data
    from app.content.trainer import TASKS
    from app.domain.learning import THEORY_ONLY_TOPICS

    from runner.main import run_case

    jobs = [
        (f"{topic.slug}-e{index}", practice)
        for topic in TOPICS
        if topic.slug not in THEORY_ONLY_TOPICS
        for index, practice in enumerate(topic.practice, start=1)
    ] + [(item.id, item.practice) for item in TASKS]
    cursor = iter(jobs)
    failures: list[str] = []

    async def worker() -> None:
        for identity, practice in cursor:
            sample, expected = practice.tests[0]
            source = with_given_data(practice.solution, sample)
            stdout, stderr, status, timeout = await run_case(source, "")
            if status or timeout or stdout.rstrip("\r\n") != expected.rstrip("\r\n"):
                failures.append(identity)
                print(f"FAIL {identity}: {stderr or stdout!r}", flush=True)
            else:
                print(f"PASS {identity}", flush=True)

    async with asyncio.TaskGroup() as group:
        for _ in range(workers):
            group.create_task(worker())
    if failures:
        raise SystemExit(
            f"{len(failures)} authored solutions failed: {', '.join(failures)}"
        )
    print(f"Validated {len(jobs)} published solutions in isolated Docker containers.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, choices=range(1, 5), default=3)
    asyncio.run(main(parser.parse_args().workers))
