"""Run reproducible checks and record real results; never marks Docker as run.

Use: python scripts/verify.py
"""
from __future__ import annotations

import hashlib
import importlib.metadata
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import tomllib
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "evidence"


def taipei_time():
    try:
        return datetime.now(ZoneInfo("Asia/Taipei")).isoformat()
    except ZoneInfoNotFoundError:
        from datetime import timezone, timedelta
        return datetime.now(timezone(timedelta(hours=8))).isoformat()


def run(name, command):
    environment = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8",
                       OMP_NUM_THREADS="1", OPENBLAS_NUM_THREADS="1", MKL_NUM_THREADS="1", NUMEXPR_NUM_THREADS="1")
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, env=environment,
                            encoding="utf-8", errors="replace", timeout=180,
                            creationflags=(subprocess.BELOW_NORMAL_PRIORITY_CLASS | subprocess.CREATE_NO_WINDOW) if os.name=="nt" else 0)
    # Store no machine-specific absolute path in public evidence.
    output = (result.stdout + result.stderr).replace(str(ROOT), "<project>")
    (OUTPUT / f"{name}.txt").write_text(output, encoding="utf-8")
    print(f"{name}: {'PASS' if result.returncode == 0 else 'FAIL'}", flush=True)
    if result.returncode:
        print(output[-6000:], flush=True)
    return {"name": name, "status": "passed" if result.returncode == 0 else "failed",
            "detail": output[-1500:].strip(), "exit_code": result.returncode,
            "command": " ".join("python" if p == sys.executable else "node" if Path(p).name.lower() in {"node", "node.exe"} else p for p in command)}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (ROOT / ".tmp").mkdir(exist_ok=True)
    scratch = Path(tempfile.mkdtemp(prefix="verify-", dir=ROOT / ".tmp"))
    checks = [run("pytest", [sys.executable, "-m", "pytest", "-q", "--basetemp", str((scratch / "pytest").relative_to(ROOT))]),
              run("pip-check", [sys.executable, "-m", "pip", "check"])]
    node = shutil.which("node")
    if node:
        for path in sorted((ROOT / "web" / "scripts").glob("*.js")):
            checks.append(run(f"javascript-{path.stem}", [node, "--check", str(path.relative_to(ROOT))]))
        if (ROOT / "scripts" / "check_web.mjs").exists():
            checks.append(run("website-contract", [node, "scripts/check_web.mjs"]))
    else:
        checks.append({"name": "javascript syntax", "status": "not_run", "detail": "Node.js unavailable"})
    for check in checks:
        if check["name"] == "pip-check":
            check["detail"] += " (dependency consistency; not a CVE audit)"
    docker = shutil.which("docker")
    checks.append({"name": "Docker Compose runtime", "status": "not_run",
                   "detail": "Docker CLI unavailable in this verification environment; runtime checks run separately." if not docker
                   else "Run scripts/verify_docker.ps1 separately; not covered by this command."})
    distributions = sorted(importlib.metadata.distributions(), key=lambda d: d.metadata["Name"].lower())
    versions = {d.metadata["Name"]: d.version for d in distributions}
    (OUTPUT / "versions.json").write_text(json.dumps(versions, indent=2), encoding="utf-8")
    # Publish new cache keys after checks finish. Stage the final HTML bytes so
    # its source hash matches the published file without a self-hash cycle.
    stamp = taipei_time()
    cache_token = re.sub(r"\D", "", stamp)
    def cache_key(match):
        attribute, relative = match.group(1), match.group(2)
        key = cache_token if relative == "assets/evidence.js" else hashlib.sha256((ROOT / "web" / relative).read_bytes()).hexdigest()[:16]
        return f'{attribute}="{relative}?v={key}"'
    staged_index = re.sub(r'(src|href)="((?:assets|scripts|styles)/[^"?]+\.(?:js|css))(?:\?[^\"]*)?"',
                          cache_key, (ROOT / "web/index.html").read_text(encoding="utf-8")).encode("utf-8")
    manifest = {}
    for folder in ("backend", "demo", "dashboard", "web", "tests", "scripts"):
        for path in sorted((ROOT / folder).rglob("*")):
            if path.is_file() and path.suffix in (".py", ".js", ".mjs", ".html", ".css", ".svg", ".ps1") and "__pycache__" not in path.parts and path.name != "evidence.js":
                manifest[path.relative_to(ROOT).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    for name in ("requirements.txt", "requirements.in", "requirements-api.txt", "requirements-ui.txt", "compose.yaml", "Dockerfile.api", "Dockerfile.ui", "pyproject.toml", ".dockerignore", ".gitignore", ".streamlit/config.toml"):
        manifest[name] = hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
    manifest["web/index.html"] = hashlib.sha256(staged_index).hexdigest()
    encoded = json.dumps(manifest, sort_keys=True).encode()
    project_version = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))["project"]["version"]
    evidence = {"generated_at": stamp, "version": project_version,
                "source_sha256": hashlib.sha256(encoded).hexdigest(),
                "python": sys.version.split()[0], "checks": checks,
                "limitations": ["Synthetic graph demonstration; original Factor GCN NOT INTEGRATED.",
                                "Docker runtime not verified by this script.",
                                "This verification command runs local checks and does not publish a website or repository."]}
    (OUTPUT / "source-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (OUTPUT / "verification.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")
    assets = ROOT / "web" / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    (assets / "evidence.js").write_text("window.ENGINEERING_EVIDENCE = " + json.dumps(evidence, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    (ROOT / "web/index.html").write_bytes(staged_index)
    artifact_manifest = {path.relative_to(ROOT / "web").as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
                         for path in sorted((ROOT / "web").rglob("*")) if path.is_file()}
    (OUTPUT / "web-artifact-manifest.json").write_text(json.dumps(artifact_manifest, indent=2), encoding="utf-8")
    return int(any(c["status"] == "failed" for c in checks))


if __name__ == "__main__":
    raise SystemExit(main())
