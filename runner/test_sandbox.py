import os

import pytest

from runner.main import run_case

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_DOCKER_TESTS") != "1",
    reason="Requires Docker and sandbox image",
)


@pytest.mark.asyncio
async def test_real_python_executes_with_stdin():
    out, err, status, timeout = await run_case("print(int(input()) * 2)", "7\n")
    assert (out, err, status, timeout) == ("14\n", "", 0, False)


@pytest.mark.asyncio
async def test_infinite_loop_times_out():
    _, _, status, timeout = await run_case("while True: pass", "")
    assert status != 0 and timeout


@pytest.mark.asyncio
async def test_output_is_bounded():
    _, err, status, timeout = await run_case("print('x' * 20000)", "")
    assert status != 0 and not timeout and "16" in err


@pytest.mark.asyncio
async def test_network_and_filesystem_are_isolated():
    for code in [
        "import socket; socket.create_connection(('1.1.1.1', 80), timeout=1)",
        "open('/blocked', 'w').write('x')",
    ]:
        _, _, status, timeout = await run_case(code, "")
        assert status != 0 and not timeout
