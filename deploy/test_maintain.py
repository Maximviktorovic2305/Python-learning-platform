"""Retention must fail closed and preserve current data and the sole rollback."""

import gzip
import os
from unittest.mock import Mock

import pytest

from deploy import maintain

pytestmark = pytest.mark.skipif(
    os.name != "posix",
    reason="Production retention uses Linux symlinks; verified in Linux and CI",
)

CURRENT = "a" * 40
PREVIOUS = "b" * 40
OLD = "c" * 40


@pytest.fixture
def installation(tmp_path, monkeypatch):
    monkeypatch.setattr(maintain, "APP", tmp_path)
    for revision in [CURRENT, PREVIOUS, OLD]:
        (tmp_path / "releases" / revision).mkdir(parents=True)
        (tmp_path / "runtime" / revision).mkdir(parents=True)
        (tmp_path / "runtime" / revision / "ready").touch()
    (tmp_path / "backups").mkdir()
    for name, revision in [("current", CURRENT), ("previous", PREVIOUS)]:
        (tmp_path / name).symlink_to(
            tmp_path / "releases" / revision, target_is_directory=True
        )
    monkeypatch.setattr(maintain, "output", lambda *args: "")
    mutation = Mock()
    monkeypatch.setattr(maintain.subprocess, "run", mutation)
    return tmp_path, mutation


def test_only_old_runtime_is_deleted(installation):
    root, mutation = installation
    maintain.maintain(True)
    assert (root / "runtime" / CURRENT / "ready").exists()
    assert (root / "runtime" / PREVIOUS / "ready").exists()
    assert not (root / "runtime" / OLD).exists()
    assert mutation.call_count == 1
    assert mutation.call_args.args[0][-1] == str(root / "releases" / OLD)
    assert "--force" not in mutation.call_args.args[0]


def test_missing_rollback_stops_all_deletion(installation):
    root, mutation = installation
    (root / "previous").unlink()
    with pytest.raises(RuntimeError, match="Missing rollback link"):
        maintain.maintain(True)
    assert (root / "runtime" / OLD).exists() and not mutation.called


def test_rollback_without_built_runtime_stops_all_deletion(installation):
    root, mutation = installation
    (root / "runtime" / PREVIOUS / "ready").unlink()
    with pytest.raises(RuntimeError, match="Missing verified native runtime"):
        maintain.maintain(True)
    assert (root / "runtime" / OLD).exists() and not mutation.called


def test_link_outside_releases_stops_all_deletion(installation):
    root, mutation = installation
    (root / "previous").unlink()
    (root / "previous").symlink_to(
        root / "runtime" / PREVIOUS, target_is_directory=True
    )
    with pytest.raises(RuntimeError, match="Unsafe release link"):
        maintain.maintain(True)
    assert (root / "runtime" / OLD).exists() and not mutation.called


def test_dry_run_does_not_mutate_files(installation):
    root, mutation = installation
    backup = root / "backups/database-20261024T000000Z.sql"
    backup.write_text("private database dump")
    maintain.maintain(False)
    assert backup.exists() and (root / "runtime" / OLD).exists() and not mutation.called


def test_backups_are_compressed_before_original_removal(installation):
    root, _ = installation
    backup = root / "backups/database-20261024T000000Z.sql"
    backup.write_bytes(b"private database dump\n" * 100)
    maintain.maintain(True)
    assert not backup.exists()
    assert (
        gzip.decompress(backup.with_suffix(".sql.gz").read_bytes())
        == b"private database dump\n" * 100
    )


def test_newest_seven_archives_survive_expiry(installation):
    root, _ = installation
    for day in range(1, 11):
        with gzip.open(
            root / f"backups/database-202001{day:02}T000000Z.sql.gz", "wb"
        ) as archive:
            archive.write(b"database")
    maintain.maintain(True)
    assert len(list((root / "backups").glob("*.gz"))) == 7
    assert (root / "backups/database-20200110T000000Z.sql.gz").exists()


def test_modified_worktree_is_not_removed(installation, monkeypatch):
    _, mutation = installation
    monkeypatch.setattr(maintain, "output", lambda *args: " M app.py")
    maintain.maintain(True)
    assert not mutation.called


def test_symlink_to_foreign_runtime_is_preserved(installation, tmp_path):
    root, _ = installation
    outside = tmp_path / "foreign"
    outside.mkdir()
    important = outside / "keep"
    important.touch()
    (root / "runtime" / ("d" * 40)).symlink_to(outside, target_is_directory=True)
    maintain.maintain(True)
    assert important.exists()
