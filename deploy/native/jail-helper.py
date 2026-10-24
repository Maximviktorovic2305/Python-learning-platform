#!/usr/bin/python3 -I
"""Root-owned, narrow sudo entry point. Never accept paths or shell commands."""

import json
import os
import re
import sys

BOOTSTRAP = """import io, json, sys
source, data, ready = json.load(sys.stdin)
sys.argv = ['solution.py']
sys.stdin = io.TextIOWrapper(io.BytesIO(data.encode('utf-8')), encoding='utf-8')
print(ready, flush=True)
exec(compile(source, 'solution.py', 'exec'), {'__name__': '__main__'})
"""


def command(args: list[str]) -> list[str]:
    if len(args) < 2 or not re.fullmatch(r"python-lab-[0-9a-f]{32}", args[1]):
        raise ValueError("Invalid job identifier")
    unit = "python-jail-" + args[1] + ".service"
    if args[0] == "stop" and len(args) == 2:
        return ["/usr/bin/systemctl", "stop", unit]
    if args[0] != "start" or len(args) != 5:
        raise ValueError("Invalid operation")
    _, _, source, stdin, ready = args
    if (
        not 0 < len(source) <= 20000
        or len(stdin) > 4000
        or not re.fullmatch(r"[0-9a-f]{32}", ready)
    ):
        raise ValueError("Invalid execution payload")
    return [
        "/usr/bin/systemd-run",
        "--quiet",
        "--pipe",
        "--wait",
        "--collect",
        "--service-type=exec",
        "--unit=" + unit,
        "--description=Python Learning isolated exercise",
        "--property=MemoryMax=128M",
        "--property=MemorySwapMax=0",
        "--property=TasksMax=32",
        "--property=CPUQuota=50%",
        "--property=RuntimeMaxSec=10",
        "--property=TimeoutStopSec=2",
        "--property=KillMode=control-group",
        "/usr/local/bin/nsjail",
        "--config",
        "/etc/python-platform/python-jail.cfg",
        "--",
        "/opt/python-platform/sandbox-env/bin/python",
        "-I",
        "-B",
        "-c",
        BOOTSTRAP,
    ]


if __name__ == "__main__":
    try:
        argv = command(sys.argv[1:])
        if sys.argv[1] == "start":
            payload = json.dumps(sys.argv[3:6]).encode()
            descriptor = os.memfd_create("python-learning-job", 0)
            os.write(descriptor, payload)
            os.lseek(descriptor, 0, os.SEEK_SET)
            os.dup2(descriptor, 0)
            os.close(descriptor)
    except ValueError:
        sys.exit("Invalid sandbox request")
    os.execve(
        argv[0], argv, {"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C.UTF-8"}
    )
