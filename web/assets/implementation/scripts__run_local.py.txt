"""Start the local stack without PowerShell script policy changes.

python scripts/run_local.py          # Ctrl+C stops owned process trees
python scripts/run_local.py --smoke  # check readiness and cleanup, then exit
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import ProxyHandler, build_opener

ROOT = Path(__file__).resolve().parents[1]
SERVICES = [
    ("API", 8000, "/health", ["-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000", "--no-access-log"]),
    ("Dashboard", 8501, "/_stcore/health", ["-m", "streamlit", "run", "dashboard/app.py", "--server.address=127.0.0.1", "--server.port=8501", "--server.headless=true", "--browser.gatherUsageStats=false", "--server.fileWatcherType=none"]),
    ("Guide", 8080, "/", ["scripts/serve_web.py"]),
]


def listening(port):
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.25):
            return True
    except OSError:
        return False


def stop_owned_process(process):
    if process.poll() is not None:
        return
    if os.name == "nt":
        # Windows venv uses a redirector parent: terminate its owned child tree too.
        subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15,
                       creationflags=subprocess.CREATE_NO_WINDOW)
    else:
        os.killpg(process.pid, signal.SIGTERM)
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--smoke", action="store_true")
    args = parser.parse_args()
    if sys.version_info[:2] != (3, 12):
        parser.error("Use this project's CPython 3.12 .venv. See README.md.")
    for name, port, _, _ in SERVICES:
        if listening(port):
            parser.error(f"{name} port {port} is already in use; stop the existing service first.")
    children = []
    readiness = {}
    outcome = 0
    opener = build_opener(ProxyHandler({}))
    try:
        for name, port, path, arguments in SERVICES:
            options = {"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {"start_new_session": True}
            child = subprocess.Popen([sys.executable, *arguments], cwd=ROOT, **options)
            children.append(child)
        deadline = time.monotonic() + 120
        while len(readiness) < len(SERVICES):
            if any(child.poll() is not None for child in children):
                raise RuntimeError("A local service exited during startup; inspect the error above.")
            for name, port, path, _ in SERVICES:
                if name in readiness:
                    continue
                try:
                    with opener.open(f"http://127.0.0.1:{port}{path}", timeout=1) as response:
                        if response.status == 200:
                            readiness[name] = response.status
                            print(f"READY {name}: http://127.0.0.1:{port}", flush=True)
                except (URLError, OSError, TimeoutError):
                    pass
            if time.monotonic() > deadline:
                raise RuntimeError("Local stack did not become ready within 120 seconds.")
            time.sleep(0.1)
        if args.smoke:
            subprocess.run([sys.executable, "scripts/capture_local_proof.py"], cwd=ROOT, check=True, timeout=30)
        else:
            print("API docs: http://127.0.0.1:8000/docs | Ctrl+C stops all owned services.", flush=True)
            while all(child.poll() is None for child in children):
                time.sleep(0.5)
            raise RuntimeError("A local service stopped unexpectedly.")
    except KeyboardInterrupt:
        print("Stopping local services...", flush=True)
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr, flush=True)
        outcome = 1
    finally:
        for child in reversed(children):
            stop_owned_process(child)
        remaining = [port for _, port, _, _ in SERVICES if listening(port)]
        if remaining:
            print(f"ERROR: listeners remain on {remaining}", file=sys.stderr)
            outcome = 1
        else:
            print("CLEANUP: no listeners remain on 8000, 8501, 8080.", flush=True)
        if args.smoke:
            from datetime import datetime, timezone, timedelta
            evidence = {"captured_at": datetime.now(timezone(timedelta(hours=8))).isoformat(),
                        "command": "python scripts/run_local.py --smoke", "readiness_http_status": readiness,
                        "remaining_listeners": remaining, "exit_code": outcome}
            target = ROOT / "docs/evidence/launcher-smoke.json"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    return outcome


if __name__ == "__main__":
    raise SystemExit(main())
