import json
import os
import pathlib
import secrets
import shlex
import subprocess

os.umask(0o077)


def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


app = pathlib.Path("/home/max/python-platform")
source = pathlib.Path(__file__).resolve().parent
assert pathlib.Path("/usr/local/bin/nsjail").is_file()
for name in ["python-api", "python-web", "python-runner"]:
    import pwd

    try:
        pwd.getpwnam(name)
    except KeyError:
        run(
            [
                "useradd",
                "--system",
                "--no-create-home",
                "--shell",
                "/usr/sbin/nologin",
                name,
            ]
        )
for name in [
    "python-lab-api.service",
    "python-lab-web.service",
    "python-lab-runner.service",
]:
    run(
        [
            "install",
            "-o",
            "root",
            "-g",
            "root",
            "-m",
            "644",
            str(source / name),
            "/etc/systemd/system/" + name,
        ]
    )
run(
    [
        "install",
        "-o",
        "root",
        "-g",
        "root",
        "-m",
        "755",
        str(source / "admin.py"),
        "/usr/local/sbin/python-platform-admin",
    ]
)
run(
    [
        "install",
        "-o",
        "root",
        "-g",
        "root",
        "-m",
        "755",
        str(source / "jail-helper.py"),
        "/usr/local/sbin/python-lab-jail",
    ]
)
run(["install", "-d", "-m", "755", "/etc/python-platform"])
run(
    [
        "install",
        "-o",
        "root",
        "-g",
        "root",
        "-m",
        "644",
        str(source / "python-jail.cfg"),
        "/etc/python-platform/python-jail.cfg",
    ]
)
policy = pathlib.Path("/etc/sudoers.d/python-platform")
policy.write_text(
    "Defaults:python-runner env_reset, !setenv, timestamp_timeout=0\npython-runner ALL=(root) NOPASSWD: /usr/local/sbin/python-lab-jail\nmax ALL=(root) NOPASSWD: /usr/local/sbin/python-platform-admin\n"
)
policy.chmod(0o440)
run(["visudo", "-cf", str(policy)])
if not pathlib.Path("/etc/postgresql/18/python/postgresql.conf").exists():
    run(
        [
            "pg_createcluster",
            "18",
            "python",
            "--port",
            "5433",
            "--locale",
            "C.UTF-8",
            "--start",
        ]
    )
    with pathlib.Path("/etc/postgresql/18/python/postgresql.conf").open("a") as config:
        config.write(
            "\nlisten_addresses='127.0.0.1'\nmax_connections=30\nshared_buffers=128MB\nwork_mem=4MB\nmaintenance_work_mem=64MB\nmax_parallel_workers=2\n"
        )
    run(["pg_ctlcluster", "18", "python", "restart"])
api_file = pathlib.Path("/etc/python-platform/api.env")
if not api_file.exists():
    old = {}
    for line in (
        pathlib.Path("/home/max/.config/python-platform/production.env")
        .read_text()
        .splitlines()
    ):
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            old[key] = shlex.split(value)[0] if value else ""
    password = secrets.token_urlsafe(36)
    sql = f"CREATE ROLE python_lab LOGIN PASSWORD '{password}' NOSUPERUSER NOCREATEDB NOCREATEROLE;\nCREATE DATABASE python_lab OWNER python_lab TEMPLATE template0 ENCODING 'UTF8';\nREVOKE ALL ON DATABASE python_lab FROM PUBLIC;\n"
    run(
        [
            "runuser",
            "-u",
            "postgres",
            "--",
            "/usr/lib/postgresql/18/bin/psql",
            "-X",
            "-p",
            "5433",
            "-v",
            "ON_ERROR_STOP=1",
            "-d",
            "postgres",
        ],
        input=sql,
        text=True,
        stdout=subprocess.DEVNULL,
    )
    values = {
        "DATABASE_URL": "postgresql+asyncpg://python_lab:"
        + password
        + "@127.0.0.1:5433/python_lab",
        "JWT_SECRET": old["JWT_SECRET"],
        "ENVIRONMENT": "production",
        "COOKIE_SECURE": "true",
        "ALLOWED_ORIGIN": "https://python-learning.tech",
        "EXECUTION_RUNNER": "remote",
        "RUNNER_URL": "http://127.0.0.1:8091",
        "RUNNER_TOKEN": old["RUNNER_TOKEN"],
    }
    api_file.write_text(
        "".join(k + "=" + json.dumps(v) + "\n" for k, v in values.items())
    )
    api_file.chmod(0o600)
    runner = pathlib.Path("/etc/python-platform/runner.env")
    runner.write_text(
        "RUNNER_TOKEN="
        + json.dumps(values["RUNNER_TOKEN"])
        + "\nSANDBOX_ENGINE=nsjail\n"
    )
    runner.chmod(0o600)
for path in [pathlib.Path("/home/max"), app, app / "releases", app / "runtime"]:
    path.chmod(path.stat().st_mode | 0o005)
run(["systemctl", "daemon-reload"])
print(
    "Native users, isolated sandbox, PostgreSQL 18 cluster, private configuration and units ready"
)
