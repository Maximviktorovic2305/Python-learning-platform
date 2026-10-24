import asyncio
import os

import httpx
import pytest

from runner import main
from runner.main import run_case

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_DOCKER_TESTS") != "1"
    and os.environ.get("RUN_NATIVE_TESTS") != "1",
    reason="Requires a real Docker or native isolated sandbox",
)


@pytest.mark.asyncio
async def test_real_python_executes_with_stdin():
    out, err, status, timeout = await run_case("print(int(input()) * 2)", "7\n")
    assert (out, err, status, timeout) == ("14\n", "", 0, False)


@pytest.mark.asyncio
async def test_systemd_does_not_expand_student_dollar_literals():
    source = "print('${HOME} $USER $$'); print(input())"
    out, err, status, timeout = await run_case(source, "${HOME} $USER $$\n")
    assert (out, err, status, timeout) == (
        "${HOME} $USER $$\n${HOME} $USER $$\n",
        "",
        0,
        False,
    )


@pytest.mark.asyncio
async def test_teaching_libraries_available_without_network():
    out, err, status, timeout = await run_case(
        "import sqlalchemy, pytest; print(callable(sqlalchemy.create_engine), callable(pytest.fixture))",
        "",
    )
    assert (out, err, status, timeout) == ("True True\n", "", 0, False)


@pytest.mark.asyncio
@pytest.mark.skipif(
    main.ENGINE == "nsjail",
    reason="Native bootstrap is root-owned and immutable to the broker",
)
async def test_slow_startup_does_not_consume_execution_budget(monkeypatch):
    monkeypatch.setattr(
        main, "BOOTSTRAP", "import time; time.sleep(6)\n" + main.BOOTSTRAP
    )
    out, err, status, timeout = await run_case("print('ready')", "")
    assert (out, err, status, timeout) == ("ready\n", "", 0, False)


@pytest.mark.asyncio
async def test_infinite_loop_times_out():
    _, _, status, timeout = await run_case("while True: pass", "")
    assert status != 0 and timeout


@pytest.mark.asyncio
async def test_output_is_bounded():
    _, err, status, timeout = await run_case("print('x' * 20000)", "")
    assert status != 0 and not timeout and "16" in err


@pytest.mark.asyncio
async def test_output_limit_is_shared_by_stdout_and_stderr():
    _, err, status, timeout = await run_case(
        "import sys; print('x' * 10000); sys.stderr.write('y' * 10000)", ""
    )
    assert status != 0 and not timeout and "16" in err


@pytest.mark.asyncio
async def test_cancelled_execution_removes_its_container(monkeypatch):
    started = asyncio.Event()
    removed = []
    reads = 0
    original_read = main.read_bounded
    original_remove = main.remove_container

    async def read(reader, budget):
        nonlocal reads
        reads += 1
        if reads == 2:
            started.set()
        return await original_read(reader, budget)

    async def remove(name):
        removed.append(name)
        await original_remove(name)

    monkeypatch.setattr(main, "read_bounded", read)
    monkeypatch.setattr(main, "remove_container", remove)
    task = asyncio.create_task(run_case("while True: pass", ""))
    try:
        await asyncio.wait_for(started.wait(), 15)
    finally:
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
    assert len(removed) == 1
    command = (
        ["systemctl", "is-active", f"python-jail-{removed[0]}.service"]
        if main.ENGINE == "nsjail"
        else ["docker", "ps", "-aq", "--filter", f"name=^{removed[0]}$"]
    )
    process = await asyncio.create_subprocess_exec(
        *command, stdout=asyncio.subprocess.PIPE
    )
    stdout, _ = await process.communicate()
    if main.ENGINE == "nsjail":
        assert process.returncode != 0 and stdout.strip() in {b"inactive", b"unknown"}
    else:
        assert process.returncode == 0 and not stdout.strip()


@pytest.mark.asyncio
async def test_broker_tokens_and_multi_case_execution(monkeypatch):
    token = "test-runner-token-" * 3
    monkeypatch.setattr(main, "TOKEN", token)
    job = {
        "code": "print(int(input()) * 2)",
        "tests": [
            {"stdin": f"{n}\n", "expected_stdout": f"{n * 2}\n"} for n in [2, 5, 8]
        ],
    }
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=main.app), base_url="http://runner"
    ) as client:
        for authorization in [None, "Bearer wrong-token", token]:
            headers = {"Authorization": authorization} if authorization else {}
            assert (
                await client.post("/execute", json=job, headers=headers)
            ).status_code == 401
        response = await client.post(
            "/execute", json=job, headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json() == {
            "status": "passed",
            "stdout": "16\n",
            "stderr": "",
            "passed": 3,
            "total": 3,
            "xp": 0,
        }
        monkeypatch.setattr(main, "TOKEN", "short")
        assert (
            await client.post(
                "/execute", json=job, headers={"Authorization": "Bearer short"}
            )
        ).status_code == 401


@pytest.mark.asyncio
async def test_busy_broker_rejects_job_without_executing_it(monkeypatch):
    token = "test-runner-token-" * 3
    monkeypatch.setattr(main, "TOKEN", token)
    monkeypatch.setattr(main, "slots", asyncio.Semaphore(0))
    calls = []

    async def unexpected_run(*args):
        calls.append(args)
        raise AssertionError("Busy broker must not start a container")

    monkeypatch.setattr(main, "run_case", unexpected_run)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=main.app), base_url="http://runner"
    ) as client:
        response = await client.post(
            "/execute",
            json={
                "code": "print(1)",
                "tests": [{"stdin": "", "expected_stdout": "1\n"}],
            },
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 429 and calls == []


@pytest.mark.asyncio
async def test_network_and_filesystem_are_isolated():
    for code in [
        "import socket; socket.create_connection(('1.1.1.1', 80), timeout=1)",
        "open('/blocked', 'w').write('x')",
    ]:
        _, _, status, timeout = await run_case(code, "")
        assert status != 0 and not timeout
