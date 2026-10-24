"""Destructive retention must preserve both working releases and reject escapes."""

import os
from unittest.mock import Mock

import pytest

from deploy.server import sites_admin as admin

pytestmark = pytest.mark.skipif(os.name != "posix", reason="Linux production symlinks")
CURRENT, PREVIOUS, OLD = "a" * 40, "b" * 40, "c" * 40


@pytest.fixture
def installation(tmp_path, monkeypatch):
    monkeypatch.setattr(admin, "ROOT", tmp_path / "sites")
    monkeypatch.setattr(admin, "BUILDS", tmp_path / "builds")
    monkeypatch.setattr(admin, "health", Mock())
    (admin.BUILDS / "music").mkdir(parents=True)
    base = admin.ROOT / "music"
    for sha in [CURRENT, PREVIOUS, OLD]:
        folder = base / "releases" / sha
        folder.mkdir(parents=True)
        (folder / "ready").touch()
    for name, sha in [("current", CURRENT), ("previous", PREVIOUS)]:
        (base / name).symlink_to(base / "releases" / sha)
    return base


def test_retains_current_and_one_rollback(installation):
    admin.retain("music")
    assert {p.name for p in (installation / "releases").iterdir()} == {
        CURRENT,
        PREVIOUS,
    }


def test_missing_rollback_prevents_deletion(installation):
    (installation / "previous").unlink()
    with pytest.raises(FileNotFoundError):
        admin.retain("music")
    assert (installation / "releases" / OLD).exists()


def test_outside_link_prevents_deletion(installation, tmp_path):
    (installation / "previous").unlink()
    (installation / "previous").symlink_to(tmp_path)
    with pytest.raises(AssertionError):
        admin.retain("music")
    assert (installation / "releases" / OLD).exists()


def test_failed_health_prevents_deletion(installation, monkeypatch):
    monkeypatch.setattr(admin, "health", Mock(side_effect=RuntimeError("Unhealthy")))
    with pytest.raises(RuntimeError):
        admin.retain("music")
    assert (installation / "releases" / OLD).exists()


def test_sha_validation_and_symlink_rejection(installation, tmp_path):
    with pytest.raises(ValueError):
        admin.target("music", "../" + CURRENT)
    link = installation / "releases" / ("d" * 40)
    link.symlink_to(tmp_path)
    with pytest.raises(ValueError):
        admin.target("music", "d" * 40)
