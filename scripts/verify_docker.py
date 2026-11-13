"""Verify an isolated local Compose stack; exit 2 means prerequisites are missing.

Uses a unique project, Docker-assigned loopback ports and ownership labels.
Never operates on the normal graph-engineering-guide project or removes images.
"""
from __future__ import annotations

import argparse
import copy
import json
import math
from pathlib import Path
import shutil
import subprocess
import tempfile
from datetime import datetime, timedelta, timezone
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener
import uuid

ROOT = Path(__file__).resolve().parents[1]
OWNER_LABEL = "io.rozias.guide.verification"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def isolated_config(config, project, token):
    result = copy.deepcopy(config)
    if set(result["services"]) != {"api", "dashboard"}:
        raise ValueError("Expected only the API and dashboard services")
    result["name"] = project
    for name, target in (("api", 8000), ("dashboard", 8501)):
        service = result["services"][name]
        if service.get("volumes") or service.get("container_name"):
            raise ValueError("Verification does not allow host volumes or fixed container names")
        # Omit the host port so Docker assigns an available one. Keep the
        # explicit loopback address rather than binding all host interfaces.
        service["ports"] = [{"target": target, "host_ip": "127.0.0.1", "protocol": "tcp"}]
        service.setdefault("labels", {})[OWNER_LABEL] = token
    if result.get("volumes"):
        raise ValueError("Verification does not use volumes")
    for network in result.get("networks", {}).values():
        if network.get("external"):
            raise ValueError("Verification does not use external networks")
        network.pop("name", None)
        network.setdefault("labels", {})[OWNER_LABEL] = token
    return result


def local_port(value):
    host, port = value.strip().rsplit(":", 1)
    if host != "127.0.0.1" or not 0 < int(port) < 65536:
        raise ValueError("Docker did not assign a loopback host port")
    return int(port)


def validate_simulation(body):
    metadata = body["metadata"]
    weights = [row["weight"] for row in body["allocations"]]
    if metadata["data_mode"] != "synthetic" or metadata["investment_advice"] is not False:
        raise ValueError("Unexpected model scope")
    if len(weights) != 6 or any(not math.isfinite(w) or w < 0 for w in weights) or abs(sum(weights) - 1) > 1e-6:
        raise ValueError("Invalid allocations")


def verify(output, *, docker=None, run=subprocess.run, http=None, token=None):
    token = token or uuid.uuid4().hex
    project = "graph-guide-check-" + token
    report = {"captured_at": datetime.now(timezone(timedelta(hours=8))).isoformat(),
              "status": "not_run", "project": project, "checks": [],
              "manual_dashboard_operation": "not_run", "cleanup": "not_needed"}
    docker = docker or shutil.which("docker")
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    started = False
    temporary = None

    def command(arguments, timeout=60):
        result = run([docker, *arguments], cwd=ROOT, capture_output=True, text=True,
                     encoding="utf-8", errors="replace", timeout=timeout)
        report["checks"].append({"command": "docker " + " ".join(arguments).replace(str(ROOT), "<project>"),
                                 "exit_code": result.returncode,
                                 "output": (result.stdout + result.stderr).replace(str(ROOT), "<project>")[-12000:]})
        if result.returncode:
            raise RuntimeError("Docker command failed: " + " ".join(arguments[:3]))
        return result.stdout.strip()

    def resources():
        selector = "label=com.docker.compose.project=" + project
        containers = command(["ps", "-aq", "--filter", selector]).split()
        networks = command(["network", "ls", "-q", "--filter", selector]).split()
        return containers, networks

    def fetch(port, path, payload=None):
        request = Request(f"http://127.0.0.1:{port}{path}",
                          data=None if payload is None else json.dumps(payload).encode(),
                          headers={"Content-Type": "application/json"})
        opener = build_opener(ProxyHandler({}), NoRedirect())
        with opener.open(request, timeout=8) as response:
            body = response.read(2_000_001)
            if response.status != 200 or len(body) > 2_000_000:
                raise ValueError("Unexpected HTTP response")
            return json.loads(body) if path != "/_stcore/health" else body.decode()

    try:
        if not docker:
            report["reason"] = "Docker CLI unavailable; container build and runtime NOT RUN."
            return 2
        command(["compose", "version"])
        command(["info", "--format", "{{.ServerVersion}}"])
        if any(resources()):
            raise RuntimeError("Project identity already exists; refusing to touch existing resources")
        config = json.loads(command(["compose", "-p", project, "-f", str(ROOT / "compose.yaml"), "config", "--format", "json"]))
        config = isolated_config(config, project, token)
        runtime = ROOT / ".runtime"
        runtime.mkdir(exist_ok=True)
        temporary = Path(tempfile.mkdtemp(prefix="docker-check-", dir=runtime))
        compose_file = temporary / "compose.json"
        compose_file.write_text(json.dumps(config), encoding="utf-8")
        base = ["compose", "-p", project, "-f", str(compose_file)]
        command([*base, "config", "--quiet"])
        # From this point a failed/partial up may have created owned resources.
        started = True
        command([*base, "up", "--build", "--wait", "--wait-timeout", "180"], timeout=900)
        ports = {name: local_port(command([*base, "port", name, str(target)]))
                 for name, target in (("api", 8000), ("dashboard", 8501))}
        get = http or fetch
        health = get(ports["api"], "/health")
        if health.get("status") != "ok":
            raise ValueError("API unhealthy")
        payload = {"scenario_id": "scenario_a", "seed": 42, "risk_level": "balanced"}
        response = get(ports["api"], "/simulate", payload)
        validate_simulation(response)
        if get(ports["dashboard"], "/_stcore/health").strip() != "ok":
            raise ValueError("Dashboard unhealthy")
        report.update(status="passed", ports=ports, health=health, request=payload, response=response)
    except KeyboardInterrupt:
        report.update(status="failed", reason="Verification interrupted")
    except Exception as error:
        report.update(status="failed", reason=str(error).replace(str(ROOT), "<project>"))
    finally:
        if started:
            try:
                containers, networks = resources()
                for object_id in containers:
                    labels = json.loads(command(["inspect", object_id, "--format", "{{json .Config.Labels}} "]))
                    if labels.get(OWNER_LABEL) != token:
                        raise RuntimeError("Container ownership mismatch; cleanup refused")
                for object_id in networks:
                    labels = json.loads(command(["network", "inspect", object_id, "--format", "{{json .Labels}} "]))
                    if labels.get(OWNER_LABEL) != token:
                        raise RuntimeError("Network ownership mismatch; cleanup refused")
                command([*base, "down", "--timeout", "15"], timeout=90)
                if any(resources()):
                    raise RuntimeError("Verification resources remain")
                report["cleanup"] = "passed"
            except Exception as error:
                report.update(status="failed", cleanup="failed", cleanup_error=str(error).replace(str(ROOT), "<project>"))
        if temporary:
            # Preserve the private config if cleanup needs manual inspection.
            if report["cleanup"] == "failed":
                report["recovery"] = "Inspect the recorded unique project only; private config retained under .runtime."
            else:
                if temporary.resolve().parent != (ROOT / ".runtime").resolve():
                    raise RuntimeError("Temporary config path escaped the private runtime directory")
                shutil.rmtree(temporary)
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "docs/evidence/docker-runtime.json")
    args = parser.parse_args()
    code = verify(args.output)
    print(f"Docker verification exit={code}; evidence: {args.output.name}")
    raise SystemExit(code)
