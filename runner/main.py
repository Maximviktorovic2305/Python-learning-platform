"""Trusted execution broker; user code executes only in disposable Docker containers."""

import asyncio
import os
import secrets
from contextlib import suppress
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
slots = asyncio.Semaphore(4)
IMAGE = os.environ.get("SANDBOX_IMAGE", "python-lab-sandbox:2026-10")
TOKEN = os.environ.get("RUNNER_TOKEN", "")
MAX_OUTPUT = 16000
STARTUP_TIMEOUT = 10
EXECUTION_TIMEOUT = 5
BOOTSTRAP = """import io, sys
source, data, ready = sys.argv[1:]
sys.argv = ['solution.py']
sys.stdin = io.TextIOWrapper(io.BytesIO(data.encode('utf-8')), encoding='utf-8')
print(ready, flush=True)
exec(compile(source, 'solution.py', 'exec'), {'__name__': '__main__'})
"""


class TestCase(BaseModel):
    stdin: str = Field(max_length=4000)
    expected_stdout: str = Field(max_length=MAX_OUTPUT)


class Job(BaseModel):
    code: str = Field(min_length=1, max_length=20000)
    tests: list[TestCase] = Field(min_length=1, max_length=8)


class Result(BaseModel):
    status: Literal["passed", "failed", "error", "timeout"]
    stdout: str
    stderr: str
    passed: int
    total: int
    xp: int = 0


class OutputLimit(Exception):
    pass


async def read_bounded(reader: asyncio.StreamReader, budget: list[int]) -> str:
    data = bytearray()
    while chunk := await reader.read(4096):
        data.extend(chunk)
        budget[0] += len(chunk)
        if budget[0] > MAX_OUTPUT:
            raise OutputLimit
    return data.decode("utf8", errors="replace")


async def remove_container(name: str) -> None:
    process = await asyncio.create_subprocess_exec(
        "docker",
        "rm",
        "-f",
        name,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    with suppress(TimeoutError):
        await asyncio.wait_for(process.wait(), 3)


async def run_case(code: str, stdin: str) -> tuple[str, str, int, bool]:
    name = f"python-lab-{uuid4().hex}"
    ready = secrets.token_hex(16)
    process = await asyncio.create_subprocess_exec(
        "docker",
        "run",
        "--name",
        name,
        "--rm",
        "--network=none",
        "--read-only",
        "--memory=128m",
        "--memory-swap=128m",
        "--cpus=0.5",
        "--pids-limit=32",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        "--user=65534:65534",
        "--tmpfs=/tmp:rw,noexec,nosuid,size=8m",
        "--ulimit=nofile=64:64",
        "--ulimit=fsize=16384:16384",
        IMAGE,
        "python",
        "-I",
        "-B",
        "-c",
        BOOTSTRAP,
        code,
        stdin,
        ready,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    output_stream, error_stream = process.stdout, process.stderr
    if output_stream is None or error_stream is None:
        await remove_container(name)
        raise RuntimeError("Container pipes unavailable")

    output_budget = [0]
    stderr_task = asyncio.create_task(read_bounded(error_stream, output_budget))
    stream_tasks = [stderr_task]

    try:
        try:
            # User code starts after this trusted first line; it cannot spoof readiness.
            marker = await asyncio.wait_for(
                output_stream.readline(), timeout=STARTUP_TIMEOUT
            )
        except TimeoutError:
            return (
                "",
                "Песочница не запустилась вовремя. Повторите проверку позже.",
                -1,
                False,
            )
        if marker.rstrip(b"\r\n") != ready.encode():
            return "", "Песочница не запустилась. Повторите проверку позже.", -1, False

        async def collect() -> tuple[str, str, int]:
            stdout_task = asyncio.create_task(
                read_bounded(output_stream, output_budget)
            )
            stream_tasks.append(stdout_task)
            stdout, stderr = await asyncio.gather(stdout_task, stderr_task)
            return stdout, stderr, await process.wait()

        stdout, stderr, exit_code = await asyncio.wait_for(
            collect(), timeout=EXECUTION_TIMEOUT
        )
        return stdout, stderr, exit_code, False
    except TimeoutError:
        return "", "Превышен лимит времени 5 секунд.", -1, True
    except OutputLimit:
        return "", "Превышен лимит вывода 16 КБ.", -1, False
    finally:
        for task in stream_tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*stream_tasks, return_exceptions=True)
        await remove_container(name)
        if process.returncode is None:
            with suppress(ProcessLookupError):
                process.kill()
            await process.wait()


@app.post("/execute", response_model=Result)
async def execute(
    job: Job, authorization: Annotated[str | None, Header()] = None
) -> Result:
    if len(TOKEN) < 32 or not secrets.compare_digest(
        authorization or "", f"Bearer {TOKEN}"
    ):
        raise HTTPException(401, "Unauthorized")
    try:
        await asyncio.wait_for(slots.acquire(), timeout=1)
    except TimeoutError as error:
        raise HTTPException(429, "Runner busy") from error
    try:
        passed = 0
        stdout = ""
        for test in job.tests:
            stdout, stderr, exit_code, timeout = await run_case(job.code, test.stdin)
            if timeout:
                return Result(
                    status="timeout",
                    stdout=stdout,
                    stderr=stderr,
                    passed=passed,
                    total=len(job.tests),
                )
            if exit_code:
                return Result(
                    status="error",
                    stdout=stdout,
                    stderr=stderr,
                    passed=passed,
                    total=len(job.tests),
                )
            if stdout.rstrip("\r\n") != test.expected_stdout.rstrip("\r\n"):
                return Result(
                    status="failed",
                    stdout=stdout,
                    stderr="Вывод не соответствует заданию.",
                    passed=passed,
                    total=len(job.tests),
                )
            passed += 1
        return Result(
            status="passed",
            stdout=stdout,
            stderr="",
            passed=passed,
            total=len(job.tests),
        )
    finally:
        slots.release()
