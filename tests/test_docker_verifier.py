"""Verifier failure/ownership tests using a fake CLI, not container runtime proof."""
import copy
import json
from pathlib import Path
import subprocess

import pytest
import yaml

from scripts import verify_docker as verifier

PROJECT_ROOT = Path(__file__).resolve().parents[1]


class FakeDocker:
    def __init__(self, *, fail=None, occupied=False, foreign=False, port_output=None):
        self.calls = []
        self.fail = fail
        self.occupied = occupied
        self.foreign = foreign
        self.port_output = port_output
        self.created = False
        self.config = None

    def __call__(self, command, **kwargs):
        args = command[1:]
        self.calls.append(args)
        text, code = "", 0
        if args[0] == "compose" and "config" in args and "--format" in args:
            text = json.dumps(yaml.safe_load((PROJECT_ROOT / "compose.yaml").read_text()))
            if self.fail == "config":
                code = 1
        elif "up" in args:
            self.config = json.loads(Path(args[args.index("-f") + 1]).read_text())
            self.created = True  # partial resources can exist when up fails
            if self.fail == "up":
                code = 1
        elif "down" in args:
            if self.fail == "down":
                code = 1
            else:
                self.created = False
        elif args[:2] == ["ps", "-aq"]:
            text = "container-id" if self.created or self.occupied else ""
        elif args[:2] == ["network", "ls"]:
            text = "network-id" if self.created else ""
        elif "inspect" in args:
            token = "foreign" if self.foreign else self.config["services"]["api"]["labels"][verifier.OWNER_LABEL]
            text = json.dumps({verifier.OWNER_LABEL: token})
        elif "port" in args:
            text = self.port_output if self.port_output is not None else "127.0.0.1:" + ("41001" if "api" in args else "41002")
        return subprocess.CompletedProcess(command, code, text, "")


def fake_http(port, path, payload=None):
    if path == "/health":
        return {"status": "ok", "version": "1.0.0"}
    if path == "/_stcore/health":
        return "ok"
    assert payload == {"scenario_id": "scenario_a", "seed": 42, "risk_level": "balanced"}
    return {"metadata": {"data_mode": "synthetic", "investment_advice": False},
            "allocations": [{"weight": 1 / 6} for _ in range(6)]}


@pytest.fixture
def isolated_root(tmp_path, monkeypatch):
    monkeypatch.setattr(verifier, "ROOT", tmp_path)
    return tmp_path


def test_missing_cli_never_invokes_docker(isolated_root, monkeypatch):
    monkeypatch.setattr(verifier.shutil, "which", lambda name: None)
    fake = FakeDocker()
    output = isolated_root / "result.json"
    assert verifier.verify(output, run=fake) == 2
    report = json.loads(output.read_text())
    assert report["status"] == "not_run" and report["cleanup"] == "not_needed"
    assert not fake.calls


@pytest.mark.parametrize("options", [{"fail": "config"}, {"occupied": True}])
def test_preflight_failure_never_stops_existing_resources(isolated_root, options):
    fake = FakeDocker(**options)
    assert verifier.verify(isolated_root / "result.json", docker="docker", run=fake) == 1
    assert not any("down" in args or "up" in args for args in fake.calls)


@pytest.mark.parametrize("options,expected,cleanup", [
    ({}, 0, "passed"),
    ({"fail": "up"}, 1, "passed"),
    ({"fail": "down"}, 1, "failed"),
    ({"foreign": True}, 1, "failed"),
])
def test_owned_cleanup_and_failure_results(isolated_root, options, expected, cleanup):
    fake = FakeDocker(**options)
    output = isolated_root / "result.json"
    assert verifier.verify(output, docker="docker", run=fake, http=fake_http, token="a" * 32) == expected
    report = json.loads(output.read_text())
    assert report["cleanup"] == cleanup
    assert report["manual_dashboard_operation"] == "not_run"
    assert report["status"] == ("passed" if expected == 0 else "failed")
    assert not any("--remove-orphans" in args for args in fake.calls)
    for args in fake.calls:
        if args[0] == "compose" and "-p" in args:
            assert args[args.index("-p") + 1] == "graph-guide-check-" + "a" * 32
    assert any("down" in args for args in fake.calls) is not options.get("foreign", False)
    assert "41001" not in json.dumps(fake.config)  # host ports come from Docker
    assert all("published" not in s["ports"][0] for s in fake.config["services"].values())
    assert all(s["ports"][0]["host_ip"] == "127.0.0.1" for s in fake.config["services"].values())


def test_http_failure_still_cleans_owned_resources(isolated_root):
    fake = FakeDocker()
    def offline(*args):
        raise OSError("HTTP unavailable")
    output = isolated_root / "result.json"
    assert verifier.verify(output, docker="docker", run=fake, http=offline) == 1
    assert json.loads(output.read_text())["cleanup"] == "passed"
    assert not fake.created


def test_config_preserves_normal_project_and_rejects_shared_resources():
    original = yaml.safe_load((PROJECT_ROOT / "compose.yaml").read_text())
    before = copy.deepcopy(original)
    result = verifier.isolated_config(original, "unique-check", "token")
    assert original == before and result["name"] == "unique-check"
    assert original["name"] == "graph-engineering-guide"
    for name, target in (("api", 8000), ("dashboard", 8501)):
        ports = result["services"][name]["ports"]
        assert len(ports) == 1
        assert ports[0]["target"] == target
        assert ports[0]["host_ip"] == "127.0.0.1"
        assert ports[0]["protocol"] == "tcp"
        assert "published" not in ports[0]
        assert result["services"][name]["labels"][verifier.OWNER_LABEL] == "token"
    assert result["networks"]["local-demo"]["driver"] == "bridge"
    assert result["networks"]["local-demo"]["internal"] is False
    assert not any(network.get("external") for network in result["networks"].values())
    assert result["networks"]["local-demo"]["labels"][verifier.OWNER_LABEL] == "token"
    assert "name" not in result["networks"]["local-demo"]
    result["services"]["api"]["volumes"] = ["/shared:/data"]
    with pytest.raises(ValueError, match="volumes"):
        verifier.isolated_config(result, "unique-check", "token")


def test_config_rejects_existing_external_network_without_modifying_input():
    config = yaml.safe_load((PROJECT_ROOT / "compose.yaml").read_text())
    config["networks"]["local-demo"]["external"] = True
    before = copy.deepcopy(config)
    with pytest.raises(ValueError, match="external networks"):
        verifier.isolated_config(config, "unique-check", "token")
    assert config == before


@pytest.mark.parametrize("value", [":0", "0.0.0.0:12345", "127.0.0.1:0", "[::]:12345", "127.0.0.1:65536"])
def test_host_port_must_be_valid_loopback(value):
    with pytest.raises(ValueError):
        verifier.local_port(value)


@pytest.mark.parametrize("port_output", [":0", "127.0.0.1:0", "0.0.0.0:41001"])
def test_unusable_port_mapping_fails_before_http_and_cleans_owned_resources(isolated_root, port_output):
    fake = FakeDocker(port_output=port_output)
    http_calls = []

    def unexpected_http(*args):
        http_calls.append(args)
        raise AssertionError("Unusable host port must be rejected before HTTP")

    output = isolated_root / "result.json"
    assert verifier.verify(output, docker="docker", run=fake, http=unexpected_http) == 1
    report = json.loads(output.read_text())
    assert report["status"] == "failed"
    assert report["cleanup"] == "passed"
    assert report["manual_dashboard_operation"] == "not_run"
    assert "loopback host port" in report["reason"]
    assert any("down" in args for args in fake.calls)
    assert not fake.created and not http_calls


def test_http_scope_rejects_advice_and_invalid_weights():
    body = fake_http(41001, "/simulate", {"scenario_id": "scenario_a", "seed": 42, "risk_level": "balanced"})
    body["metadata"]["investment_advice"] = True
    with pytest.raises(ValueError, match="scope"):
        verifier.validate_simulation(body)
    body["metadata"]["investment_advice"] = False
    body["allocations"][0]["weight"] = float("nan")
    with pytest.raises(ValueError, match="allocations"):
        verifier.validate_simulation(body)
