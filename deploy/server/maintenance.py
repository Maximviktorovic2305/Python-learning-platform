#!/usr/bin/python3 -I
"""Root-owned fixed cleanup; no caller-supplied paths, commands or service names."""

import datetime
import gzip
import os
import pathlib
import shutil
import subprocess
import sys
import urllib.request


def run(args, **kw):
    return subprocess.run(args, check=True, **kw)


def output(args):
    return subprocess.check_output(args, text=True).strip()


def health():
    services = [
        "python-lab-api",
        "python-lab-web",
        "python-lab-runner",
        "jslab-api",
        "jslab-web",
        "jslab-runner",
        "site-music-api",
        "site-music-web",
        "site-chat-api",
        "site-chat-web",
        "site-portfolio-web",
    ]
    for service in services:
        run(["systemctl", "is-active", "--quiet", service])
    for helper in [
        "/usr/local/sbin/python-platform-admin",
        "/usr/local/sbin/jslab-admin",
    ]:
        run([helper, "health"])
    for site in ["music", "chat", "portfolio"]:
        run(["/usr/local/sbin/sites-admin", site, "health"])
    for domain in [
        "python-learning.tech",
        "js-lab.site",
        "maxmusic.site",
        "ai-contact.site",
        "itmyportfolio.site",
    ]:
        with urllib.request.urlopen("https://" + domain, timeout=20) as r:
            assert r.status == 200
    assert "14" not in output(["pg_lsclusters", "--no-header"]).split()
    assert (
        output(
            [
                "runuser",
                "-u",
                "postgres",
                "--",
                "psql",
                "-p",
                "5432",
                "-XAtc",
                "SELECT count(*) FROM pg_database WHERE datname='zbs'",
            ]
        )
        == "0"
    )
    print("PASS all five native sites, PostgreSQL 18 and no ZBS", flush=True)


def compressed_backup(port):
    folder = pathlib.Path("/var/backups/postgresql-sites")
    folder.mkdir(mode=0o700, exist_ok=True)
    stamp = datetime.datetime.now(datetime.UTC).strftime("%Y%m%dT%H%M%SZ")
    dest = folder / f"native-final-{port}-{stamp}.sql.gz"
    temp = dest.with_suffix(".gz.tmp")
    with temp.open("xb") as raw, gzip.GzipFile(fileobj=raw, mode="wb") as gz:
        proc = subprocess.Popen(
            [
                "/usr/lib/postgresql/18/bin/pg_dumpall",
                "-p",
                str(port),
                "-U",
                "postgres",
            ],
            user="postgres",
            group="postgres",
            extra_groups=[],
            stdout=subprocess.PIPE,
        )
        shutil.copyfileobj(proc.stdout, gz)
        if proc.wait():
            raise RuntimeError("Backup failed")
    with gzip.open(temp, "rb") as source:
        while source.read(1024 * 1024):
            pass
    os.replace(temp, dest)
    print("Verified final PostgreSQL backup on port " + str(port), flush=True)


def cleanup_docker():
    health()
    for port in [5432, 5433]:
        compressed_backup(port)
    if not shutil.which("docker"):
        assert not pathlib.Path("/var/lib/docker").exists()
        print("Docker is already absent", flush=True)
        return
    allowed = {
        "python-lab-frontend-1",
        "python-lab-backend-1",
        "python-lab-migrate-1",
        "python-lab-runner-1",
        "python-lab-postgres-1",
        "python-lab-sandbox-daemon-1",
    }
    containers = output(["docker", "ps", "-a", "--format", "{{.Names}}"]).splitlines()
    assert set(containers) <= allowed, "Unexpected Docker workload; stopping cleanup"
    volumes = output(["docker", "volume", "ls", "-q"]).splitlines()
    assert set(volumes) <= {"python-lab_postgres-data", "python-lab_sandbox-images"}, (
        "Unexpected Docker volume"
    )
    if containers:
        run(["docker", "rm", "-f", *containers], stdout=subprocess.DEVNULL)
    if volumes:
        run(["docker", "volume", "rm", *volumes], stdout=subprocess.DEVNULL)
    run(
        [
            "systemctl",
            "disable",
            "--now",
            "docker.service",
            "docker.socket",
            "containerd.service",
        ],
        stdout=subprocess.DEVNULL,
    )
    packages = []
    for p in [
        "docker-ce",
        "docker-ce-cli",
        "docker-ce-rootless-extras",
        "docker-buildx-plugin",
        "docker-compose-plugin",
        "containerd.io",
        "docker.io",
        "docker-compose",
        "containerd",
        "runc",
    ]:
        result = subprocess.run(
            ["dpkg-query", "-W", "-f=${db:Status-Status}", p],
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0 and result.stdout == "installed":
            packages.append(p)
    if packages:
        run(
            ["apt-get", "-y", "purge", *packages],
            env={**os.environ, "DEBIAN_FRONTEND": "noninteractive"},
        )
    for name in ["/var/lib/docker", "/var/lib/containerd"]:
        p = pathlib.Path(name)
        assert not p.is_symlink() and p.resolve() == p
        mounted = subprocess.run(
            ["findmnt", "-rn", "-o", "TARGET"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.splitlines()
        assert not any(m == name or m.startswith(name + "/") for m in mounted), (
            "Storage still mounted"
        )
        if p.exists():
            shutil.rmtree(p)
    subprocess.run(
        ["gpasswd", "-d", "max", "docker"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    run(["apt-get", "clean"])
    health()
    print(
        "Removed obsolete Docker workloads, volumes, images, packages and caches",
        flush=True,
    )


if __name__ == "__main__":
    os.umask(0o077)
    if sys.argv[1:] == ["audit"]:
        health()
    elif sys.argv[1:] == ["cleanup-docker"]:
        cleanup_docker()
    else:
        raise ValueError("Invalid fixed maintenance operation")
