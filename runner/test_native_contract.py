"""The privileged entry point accepts only bounded payloads and fixed unit names."""

import importlib.util
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location(
    "jail_helper", Path(__file__).resolve().parents[1] / "deploy/native/jail-helper.py"
)
assert spec and spec.loader
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
JOB = "python-lab-" + "a" * 32
READY = "b" * 32


@pytest.mark.parametrize(
    "arguments",
    [
        [],
        ["stop"],
        ["stop", "nginx"],
        ["stop", JOB, "extra"],
        ["start", JOB, "", "", READY],
        ["start", JOB, "x" * 20001, "", READY],
        ["start", JOB, "print(1)", "x" * 4001, READY],
        ["start", JOB, "print(1)", "", "invalid"],
        ["exec", JOB],
        ["stop", "../" + JOB],
    ],
)
def test_privileged_helper_rejects_unexpected_operations(arguments):
    with pytest.raises(ValueError):
        helper.command(arguments)


def test_job_stops_only_its_validated_unit():
    assert helper.command(["stop", JOB]) == [
        "/usr/bin/systemctl",
        "stop",
        "python-jail-" + JOB + ".service",
    ]


def test_payload_is_passed_as_data_under_resource_controls():
    source = "print('$(arbitrary); `not-a-shell`')"
    command = helper.command(["start", JOB, source, "input", READY])
    assert command[-3:] == [source, "input", READY]
    assert "--property=MemoryMax=128M" in command
    assert "--property=TasksMax=32" in command
    assert "--property=MemorySwapMax=0" in command
    assert "--property=KillMode=control-group" in command
    assert "/usr/local/bin/nsjail" in command
    assert command[0] == "/usr/bin/systemd-run"
