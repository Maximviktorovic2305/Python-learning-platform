#!/usr/bin/env python3
"""Bounded production retention. Caller must hold python-platform/deploy.lock."""

import argparse
import gzip
import os
import re
import shutil
import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path

APP = Path("/home/max/python-platform")
REVISION = re.compile(r"[0-9a-f]{40}")
BACKUP = re.compile(r"database-(\d{8}T\d{6}Z)\.sql(?:\.gz)?")


def output(*args: str) -> str:
    return subprocess.check_output(args, text=True).strip()


def retained_revisions() -> set[str]:
    kept = set()
    for name in ("current", "previous"):
        link = APP / name
        if not link.is_symlink():
            raise RuntimeError(
                f"Missing rollback link: {name}; initialize it before cleanup"
            )
        target = link.resolve(strict=True)
        if target.parent != APP / "releases" or not REVISION.fullmatch(target.name):
            raise RuntimeError(f"Unsafe release link: {name}")
        if not (APP / "runtime" / target.name / "ready").is_file():
            raise RuntimeError(f"Missing verified native runtime: {name}")
        kept.add(target.name)
    if len(kept) != 2:
        raise RuntimeError("Two distinct retained releases are required")
    return kept


def maintain(apply: bool) -> None:
    kept = retained_revisions()
    for runtime in sorted((APP / "runtime").iterdir()):
        if (
            runtime.is_symlink()
            or not runtime.is_dir()
            or not REVISION.fullmatch(runtime.name)
            or runtime.name in kept
        ):
            continue
        if runtime.resolve().parent != APP / "runtime":
            raise RuntimeError("Runtime escapes the configured directory")
        print("Remove old native runtime:", runtime.name, flush=True)
        if apply:
            shutil.rmtree(runtime)
    for release in sorted((APP / "releases").iterdir()):
        if (
            release.is_symlink()
            or not release.is_dir()
            or not REVISION.fullmatch(release.name)
            or release.name in kept
        ):
            continue
        if release.resolve().parent != APP / "releases":
            raise RuntimeError("Release escapes the configured directory")
        if output("git", "-C", str(release), "status", "--porcelain"):
            print("Keep modified release:", release.name)
            continue
        print("Remove old worktree:", release.name, flush=True)
        if apply:
            # No force: Git preserves untracked files and locked worktrees.
            subprocess.run(
                [
                    "git",
                    "-C",
                    str(APP / "repository"),
                    "worktree",
                    "remove",
                    str(release),
                ],
                check=True,
            )
    backups = APP / "backups"
    for source in sorted(backups.glob("database-*.sql")):
        if source.is_symlink() or not BACKUP.fullmatch(source.name):
            continue
        target = source.with_suffix(".sql.gz")
        print("Compress database backup:", source.name, flush=True)
        if apply:
            temporary = target.with_suffix(".gz.tmp")
            try:
                with source.open("rb") as original, temporary.open("wb") as destination:
                    os.chmod(temporary, 0o600)
                    with gzip.GzipFile(fileobj=destination, mode="wb") as compressed:
                        shutil.copyfileobj(original, compressed)
                with gzip.open(temporary, "rb") as compressed:
                    while compressed.read(1024 * 1024):
                        pass  # Read through EOF to validate CRC before removing SQL.
                os.replace(temporary, target)
                source.unlink()
            finally:
                temporary.unlink(missing_ok=True)
    archives = sorted(
        (
            p
            for p in backups.glob("database-*.sql.gz")
            if not p.is_symlink() and BACKUP.fullmatch(p.name)
        ),
        reverse=True,
    )
    retained = set(archives[:7])
    cutoff = datetime.now(UTC) - timedelta(days=30)
    days = set()
    for archive in archives:
        match = BACKUP.fullmatch(archive.name)
        assert match
        timestamp = datetime.strptime(match[1], "%Y%m%dT%H%M%SZ").replace(tzinfo=UTC)
        if timestamp >= cutoff and timestamp.date() not in days:
            retained.add(archive)
            days.add(timestamp.date())
    for archive in archives:
        if archive not in retained:
            print("Remove expired database backup:", archive.name, flush=True)
            if apply:
                archive.unlink()
    cache = APP / "build-cache"
    if cache.exists():
        if cache.is_symlink() or cache.resolve().parent != APP:
            raise RuntimeError("Unsafe build cache path")
        print("Remove regenerable Python Learning build cache", flush=True)
        if apply:
            shutil.rmtree(cache)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply", action="store_true", help="Apply changes; otherwise print a plan"
    )
    options = parser.parse_args()
    os.umask(0o077)
    maintain(options.apply)
