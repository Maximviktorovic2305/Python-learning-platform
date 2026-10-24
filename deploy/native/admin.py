#!/opt/python-platform/python/runtime/bin/python3.14 -I
"""Fixed production operations for the deploy account, installed root-owned."""

import gzip
import json
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.request import Request, urlopen

APP = Path("/home/max/python-platform")
NATIVE_READY = Path("/etc/python-platform/native-ready")
PG = "/usr/lib/postgresql/18/bin/"
SERVICES = [
    "python-lab-runner.service",
    "python-lab-api.service",
    "python-lab-web.service",
]


def environment(kind: str = "api") -> dict[str, str]:
    import shlex

    values = {
        "PATH": "/usr/local/bin:/usr/bin:/bin",
        "LANG": "C.UTF-8",
        "PYTHONDONTWRITEBYTECODE": "1",
    }
    if kind not in {"api", "migrate"}:
        raise ValueError("Invalid configuration kind")
    config = Path("/etc/python-platform") / f"{kind}.env"
    if not config.exists() and kind == "migrate":
        config = config.with_name("api.env")
    for line in config.read_text().splitlines():
        if line and not line.startswith("#"):
            key, value = line.split("=", 1)
            values[key] = shlex.split(value)[0]
    return values


def release_path(revision: str, kind: str) -> Path:
    if not re.fullmatch("[0-9a-f]{40}", revision):
        raise ValueError("Invalid release")
    path = APP / kind / revision
    if path.is_symlink() or path.resolve(strict=True).parent != APP / kind:
        raise ValueError("Unsafe release path")
    return path


def symlink(target: Path, link: Path) -> None:
    temporary = link.with_name(link.name + ".next")
    temporary.unlink(missing_ok=True)
    temporary.symlink_to(target)
    temporary.replace(link)


def backup() -> None:
    target = (
        APP
        / "backups"
        / ("database-" + datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ") + ".sql.gz")
    )
    temporary = target.with_suffix(".gz.tmp")
    with temporary.open("xb") as destination:
        os.chmod(temporary, 0o600)
        with gzip.GzipFile(fileobj=destination, mode="wb") as compressed:
            process = subprocess.Popen(
                [
                    PG + "pg_dump",
                    "-p",
                    "5433",
                    "-U",
                    "postgres",
                    "-d",
                    "python_lab",
                    "--no-owner",
                    "--no-acl",
                ],
                user="postgres",
                group="postgres",
                extra_groups=[],
                stdout=subprocess.PIPE,
            )
            assert process.stdout
            shutil.copyfileobj(process.stdout, compressed)
            if process.wait():
                raise RuntimeError("Database backup failed")
    with gzip.open(temporary, "rb") as compressed:
        while compressed.read(1024 * 1024):
            pass
    os.replace(temporary, target)
    shutil.chown(target, "max", "max")
    print("Verified compressed database backup saved")


def migrate(revision: str) -> None:
    release = release_path(revision, "releases")
    runtime = release_path(revision, "runtime")
    for module, args in [("alembic", ["upgrade", "head"]), ("app.seed", [])]:
        subprocess.run(
            [str(runtime / "api/bin/python"), "-m", module, *args],
            cwd=release / "backend",
            env=environment("migrate"),
            user="python-api",
            group="python-api",
            extra_groups=[],
            check=True,
        )


def health() -> None:
    for attempt in range(45):
        try:
            with urlopen("http://127.0.0.1:3010/api/health", timeout=5) as response:
                assert json.load(response)["message"] == "ok"
            with urlopen("http://127.0.0.1:3010/", timeout=10) as response:
                assert response.status == 200
            values = environment()
            request = Request(
                "http://127.0.0.1:8091/execute",
                data=json.dumps(
                    {
                        "code": "print(21 * 2)",
                        "tests": [{"stdin": "", "expected_stdout": "42\n"}],
                    }
                ).encode(),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + values["RUNNER_TOKEN"],
                },
            )
            with urlopen(request, timeout=20) as response:
                assert json.load(response)["status"] == "passed"
            print("PASS: native web, API and isolated runner")
            return
        except (OSError, AssertionError, ValueError):
            if attempt == 44:
                raise RuntimeError("Native health check failed") from None
            time.sleep(2)


def activate(revision: str) -> None:
    if not NATIVE_READY.is_file():
        raise RuntimeError("Complete and verify the native migration before activation")
    release = release_path(revision, "releases")
    runtime = release_path(revision, "runtime")
    if not (runtime / "ready").is_file() or (
        not (runtime / "web/server.js").is_file()
        or not (runtime / "runner/main.py").is_file()
    ):
        raise ValueError("Native runtime incomplete")
    old_release = (APP / "current").resolve()
    old_runtime = (
        (APP / "current-runtime").resolve()
        if (APP / "current-runtime").exists()
        else None
    )
    symlink(release, APP / "current")
    symlink(runtime, APP / "current-runtime")
    try:
        subprocess.run(["systemctl", "restart", *SERVICES], check=True)
        health()
    except Exception:
        symlink(old_release, APP / "current")
        if old_runtime:
            symlink(old_runtime, APP / "current-runtime")
            subprocess.run(["systemctl", "restart", *SERVICES], check=True)
        raise
    if old_release != release:
        symlink(old_release, APP / "previous")
    subprocess.run(["systemctl", "enable", *SERVICES], check=True)
    print("Activated native release", revision)


def main() -> None:
    os.umask(0o077)
    args = sys.argv[1:]
    if args == ["backup"]:
        backup()
    elif args == ["health"]:
        health()
    elif len(args) == 2 and args[0] == "migrate":
        migrate(args[1])
    elif len(args) == 2 and args[0] == "activate":
        activate(args[1])
    else:
        raise ValueError("Unknown production operation")


if __name__ == "__main__":
    main()
