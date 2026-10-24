"""No intermediate chain flush may change live firewall access."""

import runpy
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

pwd = pytest.importorskip("pwd")


def test_only_atomic_owned_chain_transactions_change_the_firewall():
    calls = []

    def run(args, **kwargs):
        calls.append((args, kwargs))
        return SimpleNamespace(returncode=1 if "-C" in args else 0)

    with (
        patch.object(pwd, "getpwnam", return_value=SimpleNamespace(pw_uid=1001)),
        patch("subprocess.run", side_effect=run),
    ):
        runpy.run_path(str(Path(__file__).with_name("firewall.py")))
    writes = [(args, kw) for args, kw in calls if "-C" not in args]
    assert len(writes) == 4
    assert all(
        args[0].endswith("tables-restore") and "--noflush" in args for args, _ in writes
    )
    for _, kwargs in writes:
        payload = kwargs["input"]
        assert payload.startswith("*filter\n") and payload.count("COMMIT\n") == 1
        assert (
            "-F OUTPUT" not in payload
            and ":INPUT" not in payload
            and ":FORWARD" not in payload
        )
        assert payload.count("-I OUTPUT 1 -j NATIVE_SITES_OUT") == 1
