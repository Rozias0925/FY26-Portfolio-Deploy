"""Reviewable deployment checks; these do NOT replace an actual Docker build."""
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def test_only_loopback_host_ports_and_no_host_volumes():
    config = yaml.safe_load((ROOT / "compose.yaml").read_text(encoding="utf-8"))
    for service in config["services"].values():
        assert service["ports"]
        assert all(port.startswith("127.0.0.1:") for port in service["ports"])
        assert not service.get("volumes")
        assert service["read_only"] is True
        assert "ALL" in service["cap_drop"]
        assert "no-new-privileges:true" in service["security_opt"]
    assert config["services"]["dashboard"]["environment"]["API_BASE_URL"] == "http://api:8000"
    assert config["services"]["dashboard"]["depends_on"]["api"]["condition"] == "service_healthy"
    assert config["name"] == "graph-engineering-guide"
    assert set(config["services"]) == {"api", "dashboard"}
    assert set(config["networks"]) == {"local-demo"}
    assert config["networks"]["local-demo"]["driver"] == "bridge"
    assert config["networks"]["local-demo"]["internal"] is False
    assert all(not network.get("external") for network in config["networks"].values())
    assert all(service["networks"] == ["local-demo"] for service in config["services"].values())


def test_images_have_healthchecks_and_use_non_root_user():
    for name in ("Dockerfile.api", "Dockerfile.ui"):
        text = (ROOT / name).read_text(encoding="utf-8")
        assert "USER learner" in text
        assert "HEALTHCHECK" in text
        assert "127.0.0.1" in text
        assert "COPY . " not in text


def test_build_context_is_an_allowlist():
    lines = (ROOT / ".dockerignore").read_text(encoding="utf-8").splitlines()
    assert lines[0] == "*"
    assert not any(line.startswith("!private") or line.startswith("!web") for line in lines)
