#!/usr/bin/python3 -I
# ruff: noqa: UP017 -- host administration also runs on Ubuntu Python 3.10
"""Root-owned native site activator: fixed sites, SHA-only releases, no arbitrary commands."""

import datetime
import gzip
import json
import os
import pathlib
import pwd
import re
import shlex
import shutil
import subprocess
import sys
import time
import urllib.request

ROOT = pathlib.Path("/srv/native-sites")
CONFIG = pathlib.Path("/etc/native-sites")
SITES = {
    "music": (3005, 3007, "music"),
    "chat": (3875, 4568, "gpt"),
    "portfolio": (3015, None, None),
}
NODE = "/opt/site-runtime/node/bin/node"
BUILDS = pathlib.Path("/home/max/build-sites")
REPOS = {
    "music": "/home/max/my-songs-site",
    "chat": "/home/max/chat-gpt-app",
    "portfolio": "/home/max/portfolio",
}


def environment(site, kind="api"):
    result = {"PATH": "/opt/site-runtime/node/bin:/usr/bin:/bin", "LANG": "C.UTF-8"}
    if kind not in {"api", "migrate"}:
        raise ValueError("Invalid environment")
    f = CONFIG / (site + "-" + kind + ".env")
    if kind == "migrate" and not f.exists():
        f = CONFIG / (site + "-api.env")
    if f.exists():
        for line in f.read_text().splitlines():
            if line and not line.startswith("#"):
                key, value = line.split("=", 1)
                parts = shlex.split(value)
                result[key] = parts[0] if parts else ""
    return result


def target(site, sha):
    if site not in SITES or not re.fullmatch("[0-9a-f]{40}", sha):
        raise ValueError("Invalid site or revision")
    p = ROOT / site / "releases" / sha
    if p.is_symlink() or p.resolve(strict=True).parent != ROOT / site / "releases":
        raise ValueError("Unsafe release")
    return p


def link(site, name, p):
    f = ROOT / site / (name + ".next")
    f.unlink(missing_ok=True)
    f.symlink_to(p)
    f.replace(ROOT / site / name)


def units(site, release):
    webport, apiport, _ = SITES[site]
    legacy = json.loads((CONFIG / "legacy.json").read_text()).get(site, {})
    old = legacy if release.name == legacy.get("sha") else None
    services = []
    for kind in ["web", "api"] if apiport else ["web"]:
        user = site + "-" + kind
        services.append("site-" + user)
        base = release / kind
        bind = ""
        if old:
            source = old[kind]
            bind = f"BindReadOnlyPaths={source}:{base}\n"
        command = "server.js" if kind == "web" else "dist/main.js"
        if site == "portfolio":
            command = "node_modules/serve/build/main.js dist --listen tcp://127.0.0.1:3015 --config ../serve.json"
        if old and kind == "web":
            command = (
                "node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port "
                + str(webport)
            )
            if site == "portfolio":
                command = "node_modules/serve/build/main.js dist --listen tcp://127.0.0.1:3015 --config ../serve.json"
        settings = (
            f"Environment=NODE_ENV=production HOSTNAME=127.0.0.1 PORT={webport}\n"
            if kind == "web"
            else f"EnvironmentFile=/etc/native-sites/{site}-api.env\n"
        )
        extra = ""
        if site == "music" and kind == "api":
            extra = (
                "ReadWritePaths=/var/lib/native-sites/music/uploads\nBindPaths=/var/lib/native-sites/music/uploads:"
                + str(base / "uploads")
                + "\n"
            )
        if kind == "web":
            settings += f"CacheDirectory=native-{site}-web\n"
            extra += f"ReadWritePaths=/var/cache/native-{site}-web\n"
        network = (
            "IPAddressDeny=any\nIPAddressAllow=localhost\nIPAddressAllow=212.193.56.213\n"
            if kind == "web" and site != "portfolio"
            else (
                "IPAddressDeny=any\nIPAddressAllow=localhost\n" if kind == "web" else ""
            )
        )
        other = " ".join(str(ROOT / s) for s in SITES if s != site)
        unit = f"""[Unit]
Description=Isolated {site} {kind}
After=network.target postgresql.service
[Service]
User={user}
Group={user}
WorkingDirectory={base}
{settings}ExecStart={NODE} {command}
Restart=on-failure
RestartSec=3
MemoryMax={"512M" if kind == "web" else "384M"}
TasksMax=64
UMask=0027
NoNewPrivileges=yes
CapabilityBoundingSet=
PrivateTmp=yes
PrivateDevices=yes
ProtectSystem=strict
ProtectHome=tmpfs
ProtectProc=invisible
ProcSubset=pid
RestrictNamespaces=yes
RestrictSUIDSGID=yes
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX{" AF_NETLINK" if site == "portfolio" else ""}
InaccessiblePaths={other} /etc/jslab /etc/python-platform /opt/python-platform /opt/jslab /var/backups
{bind}{extra}{network}
[Install]
WantedBy=multi-user.target
"""
        pathlib.Path("/etc/systemd/system/site-" + user + ".service").write_text(unit)
    subprocess.run(["systemctl", "daemon-reload"], check=True)
    return services


def health(site):
    web, api, _ = SITES[site]
    paths = [f"http://127.0.0.1:{web}/"]
    if api:
        paths.append(
            f"http://127.0.0.1:{api}/api/" + ("tracks" if site == "music" else "health")
        )
    for attempt in range(25):
        try:
            for url in paths:
                with urllib.request.urlopen(url, timeout=10) as response:
                    assert response.status == 200
            print("PASS native " + site + " HTTP health", flush=True)
            return
        except (OSError, AssertionError):
            if attempt == 24:
                raise RuntimeError("Health failed for " + site) from None
            time.sleep(2)


def activate(site, sha):
    release = target(site, sha)
    if not (release / "ready").is_file():
        raise ValueError("Incomplete release")
    current = ROOT / site / "current"
    old = current.resolve() if current.exists() else None
    link(site, "current", release)
    services = units(site, release)
    try:
        subprocess.run(["systemctl", "restart", *services], check=True)
        health(site)
    except Exception:
        if old:
            link(site, "current", old)
            units(site, old)
            subprocess.run(["systemctl", "restart", *services], check=True)
        raise
    if old and old != release:
        link(site, "previous", old)
    subprocess.run(["systemctl", "enable", *services], check=True)
    print("Activated isolated " + site + " " + sha, flush=True)


def backup(site):
    db = SITES[site][2]
    if not db:
        return
    root = pathlib.Path("/var/backups/native-sites") / site
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    f = root / ("database-" + stamp + ".sql.gz")
    tmp = f.with_suffix(".gz.tmp")
    with tmp.open("xb") as raw, gzip.GzipFile(fileobj=raw, mode="wb") as dest:
        p = subprocess.Popen(
            [
                "/usr/lib/postgresql/18/bin/pg_dump",
                "-p",
                "5432",
                "-U",
                "postgres",
                "-d",
                db,
                "--no-owner",
                "--no-acl",
            ],
            user="postgres",
            group="postgres",
            extra_groups=[],
            stdout=subprocess.PIPE,
        )
        shutil.copyfileobj(p.stdout, dest)
        if p.wait():
            raise RuntimeError("Backup failed")
    with gzip.open(tmp, "rb") as src:
        while src.read(1024 * 1024):
            pass
    os.replace(tmp, f)
    print("Verified compressed backup " + site, flush=True)


def migrate(site, sha):
    if site == "portfolio":
        raise ValueError("No portfolio database")
    target(site, sha)
    folder = BUILDS / site / sha / "server"
    assert (
        folder.resolve() == folder
        and (folder / "node_modules/prisma/build/index.js").is_file()
    )
    user = pwd.getpwnam(site + "-api")
    subprocess.run(
        [NODE, str(folder / "node_modules/prisma/build/index.js"), "migrate", "deploy"],
        cwd=folder,
        env=environment(site, "migrate"),
        user=user.pw_uid,
        group=user.pw_gid,
        extra_groups=[],
        check=True,
    )


def retain(site):
    base = ROOT / site
    kept = set()
    for name in ["current", "previous"]:
        p = (base / name).resolve(strict=True)
        assert (
            p.parent == base / "releases"
            and re.fullmatch("[0-9a-f]{40}", p.name)
            and (p / "ready").is_file()
        )
        kept.add(p.name)
    assert len(kept) == 2, "Keep two distinct complete releases"
    health(site)
    for p in (base / "releases").iterdir():
        if p.name in kept:
            continue
        assert (
            not p.is_symlink()
            and p.resolve().parent == base / "releases"
            and re.fullmatch("[0-9a-f]{40}", p.name)
        )
        shutil.rmtree(p)
    builds = BUILDS / site
    repo = REPOS[site]
    for p in builds.iterdir():
        if not re.fullmatch("[0-9a-f]{40}", p.name) or p.name in kept:
            continue
        assert not p.is_symlink() and p.resolve().parent == builds
        status = subprocess.check_output(
            [
                "runuser",
                "-u",
                "max",
                "--",
                "git",
                "-C",
                str(p),
                "status",
                "--porcelain",
                "--untracked-files=no",
            ],
            text=True,
        )
        if status.strip():
            print("Preserved modified build " + p.name)
            continue
        subprocess.run(
            [
                "runuser",
                "-u",
                "max",
                "--",
                "git",
                "-C",
                repo,
                "worktree",
                "remove",
                "--force",
                str(p),
            ],
            check=True,
        )
    print("Retained current and one rollback for " + site, flush=True)


def main():
    os.umask(0o077)
    args = sys.argv[1:]
    if len(args) < 2 or args[0] not in SITES:
        raise ValueError("Invalid operation")
    site, action, *rest = args
    if action == "health" and not rest:
        health(site)
    elif action == "backup" and not rest:
        backup(site)
    elif action == "activate" and len(rest) == 1:
        activate(site, rest[0])
    elif action == "migrate" and len(rest) == 1:
        migrate(site, rest[0])
    elif action == "retain" and not rest:
        retain(site)
    else:
        raise ValueError("Invalid operation")


if __name__ == "__main__":
    main()
