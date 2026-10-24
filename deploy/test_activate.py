"""A failed native activation must restore the working release and runtime."""

import os
from unittest.mock import Mock

import pytest

from deploy.native import admin

pytestmark = pytest.mark.skipif(
    os.name != "posix",
    reason="Native activation uses Linux symlinks; verified in Linux and CI",
)
OLD = "a" * 40
NEW = "b" * 40


@pytest.fixture
def host(tmp_path, monkeypatch):
    monkeypatch.setattr(admin, "APP", tmp_path)
    monkeypatch.setattr(admin, "NATIVE_READY", tmp_path / "native-ready")
    (tmp_path / "native-ready").touch()
    for revision in [OLD, NEW]:
        (tmp_path / "releases" / revision).mkdir(parents=True)
        runtime = tmp_path / "runtime" / revision
        (runtime / "web").mkdir(parents=True)
        (runtime / "runner").mkdir()
        (runtime / "web/server.js").touch()
        (runtime / "runner/main.py").touch()
        (runtime / "ready").touch()
    (tmp_path / "current").symlink_to(
        tmp_path / "releases" / OLD, target_is_directory=True
    )
    (tmp_path / "current-runtime").symlink_to(
        tmp_path / "runtime" / OLD, target_is_directory=True
    )
    operations = Mock()
    monkeypatch.setattr(admin.subprocess, "run", operations)
    return tmp_path, operations


def test_failed_health_restores_previous_application(host, monkeypatch):
    root, operations = host

    def unhealthy():
        raise RuntimeError("Health check failed")

    monkeypatch.setattr(admin, "health", unhealthy)
    with pytest.raises(RuntimeError, match="Health check failed"):
        admin.activate(NEW)
    assert (root / "current").resolve() == root / "releases" / OLD
    assert (root / "current-runtime").resolve() == root / "runtime" / OLD
    assert not (root / "previous").exists()
    assert operations.call_count == 2


def test_success_rotates_exactly_one_rollback(host, monkeypatch):
    root, _ = host
    monkeypatch.setattr(admin, "health", lambda: None)
    admin.activate(NEW)
    assert (root / "current").resolve() == root / "releases" / NEW
    assert (root / "current-runtime").resolve() == root / "runtime" / NEW
    assert (root / "previous").resolve() == root / "releases" / OLD


def test_missing_runtime_prevents_service_restart(host):
    root, operations = host
    (root / "runtime" / NEW / "ready").unlink()
    with pytest.raises(ValueError, match="incomplete"):
        admin.activate(NEW)
    assert not operations.called
    assert (root / "current").resolve() == root / "releases" / OLD


def test_incomplete_migration_prevents_activation(host):
    root, operations = host
    (root / "native-ready").unlink()
    with pytest.raises(RuntimeError, match="native migration"):
        admin.activate(NEW)
    assert not operations.called
