"""Exercise interpreter selection with a local stub; never invokes Docker."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
PWSH = shutil.which("pwsh")
pytestmark = pytest.mark.skipif(os.name != "nt" or not PWSH, reason="Windows PowerShell wrapper requires pwsh")


@pytest.fixture
def wrapper_project(tmp_path):
    scripts = tmp_path / "scripts"
    scripts.mkdir()
    shutil.copyfile(ROOT / "scripts/verify_docker.ps1", scripts / "verify_docker.ps1")
    (scripts / "verify_docker.py").write_text(
        "import argparse,json,sys\nfrom pathlib import Path\n"
        "p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args()\n"
        "Path(a.output).write_text(json.dumps({'python':sys.executable,'stub':True}),encoding='utf-8')\n"
        "raise SystemExit(2)\n", encoding="utf-8")
    return tmp_path


def invoke(project, *arguments):
    return subprocess.run(
        [PWSH, "-NoProfile", "-NonInteractive", "-File", str(project / "scripts/verify_docker.ps1"), *arguments],
        cwd=project, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )


@pytest.mark.parametrize("environment", [".venv-repro", ".venv"])
def test_wrapper_discovers_project_environment_and_preserves_exit_code(wrapper_project, environment):
    python_env = wrapper_project / environment
    subprocess.run([sys.executable, "-m", "venv", "--without-pip", str(python_env)],
                   check=True, capture_output=True, timeout=30,
                   creationflags=subprocess.CREATE_NO_WINDOW)
    output = wrapper_project / "stub-result.json"
    result = invoke(wrapper_project, "-Output", str(output))
    assert result.returncode == 2, result.stderr
    record = json.loads(output.read_text(encoding="utf-8"))
    assert Path(record["python"]).resolve() == (python_env / "Scripts/python.exe").resolve()
    assert record["stub"] is True


def test_wrapper_accepts_explicit_python_and_output(wrapper_project):
    output = wrapper_project / "explicit-result.json"
    result = invoke(wrapper_project, "-Python", sys.executable, "-Output", str(output))
    assert result.returncode == 2, result.stderr
    assert Path(json.loads(output.read_text())["python"]).resolve() == Path(sys.executable).resolve()


def test_wrapper_stops_before_verifier_when_no_environment_exists(wrapper_project):
    output = wrapper_project / "must-not-exist.json"
    result = invoke(wrapper_project, "-Output", str(output))
    assert result.returncode != 0
    assert not output.exists()
    assert "Create .venv-repro" in result.stderr
