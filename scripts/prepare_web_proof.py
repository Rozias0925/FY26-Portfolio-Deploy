"""Export reviewed synthetic HTTP evidence and selected source files to web/.

Run after capture_local_proof.py and before verify.py. Does not contact services.
Only the explicit allowlist is copied; no private assets or environment files.
"""
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import shutil

from verify_docker import validate_simulation

ROOT = Path(__file__).resolve().parents[1]
SOURCES = (
    "backend/app/main.py", "backend/app/routes.py", "backend/app/schemas.py",
    "demo/synthetic_data.py", "demo/graph_demo_model.py", "dashboard/app.py",
    "Dockerfile.api", "Dockerfile.ui", "compose.yaml",
    "tests/test_api.py", "tests/test_demo_model.py", "tests/test_integration.py",
    "scripts/run_local.py", "scripts/verify_docker.py",
)


def docker_proof(folder):
    """Publish a small receipt and reviewed synthetic screenshots, not raw logs."""
    evidence_root = ROOT / "docs/evidence"
    runtime_path = evidence_root / "docker-runtime-20261113.json"
    if not runtime_path.exists():
        return None
    runtime = json.loads(runtime_path.read_text(encoding="utf-8"))
    ui = json.loads((evidence_root / "docker-dashboard-ui-20261113.json").read_text(encoding="utf-8"))
    http = json.loads((evidence_root / "docker-http-20261113.json").read_text(encoding="utf-8"))
    if not (runtime.get("status") == ui.get("status") == http.get("status") == "passed"
            and runtime.get("cleanup") == runtime.get("engine_stop") == "passed"
            and runtime.get("project") == ui.get("project") == http.get("project")
            and ui.get("checks") and all(check.get("status") == "passed" for check in ui["checks"])):
        return None
    for relative, expected in runtime.get("tested_source_sha256", {}).items():
        source = (ROOT / relative).resolve()
        if (not source.is_relative_to(ROOT.resolve()) or not source.is_file()
                or hashlib.sha256(source.read_bytes()).hexdigest() != expected):
            return None
    if len(runtime.get("tested_source_sha256", {})) < 20:
        return None
    screenshots = ("docker-dashboard-20261113.jpg", "docker-dashboard-metadata-20261113.jpg")
    for name in screenshots:
        shutil.copyfile(evidence_root / name, folder / name)
    receipt = {
        "status": "passed", "verified_at": runtime["captured_at"],
        "data_mode": "synthetic", "investment_advice": False,
        "original_factor_gcn": "NOT INTEGRATED",
        "http_checks": len(http["checks"]), "ui_checks": len(ui["checks"]),
        "ui_check_results": [{"name": check["name"], "status": check["status"]} for check in ui["checks"]],
        "container_python": http["environment"]["api"]["python"],
        "container_platform": http["environment"]["api"]["platform"],
        "cleanup": runtime["cleanup"], "engine_stop": runtime["engine_stop"],
        "tested_source_files": len(runtime["tested_source_sha256"]),
        "images_reused_after_source_and_id_check": runtime.get("cache_verified") is True,
        "host_access": "127.0.0.1", "container_network": "project bridge; outbound connections allowed",
        "screenshots": ["assets/implementation/" + name for name in screenshots],
        "receipt_href": "assets/implementation/docker-verification.json",
    }
    (folder / "docker-verification.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    return receipt


def main():
    evidence = json.loads((ROOT / "docs/evidence/local-http.json").read_text(encoding="utf-8"))
    sample = evidence["responses"]["scenario_a"]
    if sample["status"] != 200:
        raise ValueError("HTTP proof must contain a successful real request")
    validate_simulation(sample["body"])
    folder = ROOT / "web/assets/implementation"
    folder.mkdir(parents=True, exist_ok=True)
    sources = {}
    for relative in SOURCES:
        content = (ROOT / relative).read_bytes()
        name = relative.replace("/", "__") + ".txt"
        (folder / name).write_bytes(content)
        sources[relative] = {"href": "assets/implementation/" + name,
                             "sha256": hashlib.sha256(content).hexdigest()}
    for name in ("dashboard.jpg", "api-explorer.jpg"):
        shutil.copyfile(ROOT / "docs/evidence" / name, folder / name)
    data = {"exported_at": datetime.now(timezone(timedelta(hours=8))).isoformat(),
            "captured_at": evidence["captured_at"], "screenshot_date": "2026-10-18",
            "source": "saved_local_python_http", "live_api_connected": False,
            "original_factor_gcn": "NOT INTEGRATED", "request": sample["request"],
            "http_status": sample["status"], "response": sample["body"], "sources": sources,
            "docker": docker_proof(folder)}
    for name, value in (("request.json", data["request"]), ("response.json", data["response"]), ("record.json", data)):
        (folder / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    (ROOT / "web/assets/implementation.js").write_text(
        "window.LOCAL_IMPLEMENTATION = " + json.dumps(data, ensure_ascii=False, indent=2).replace("<", "\\u003c") + ";\n", encoding="utf-8")
    print(f"Prepared saved HTTP evidence, reviewed screenshots, Docker receipt, and {len(sources)} selected source snapshots.")


if __name__ == "__main__":
    main()
