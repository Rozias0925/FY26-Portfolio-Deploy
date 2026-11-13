"""Actual Streamlit execution, against real HTTP, including stale/offline states."""
import json
import socket
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from streamlit.testing.v1 import AppTest

ROOT = Path(__file__).resolve().parents[1]


def test_real_http_contract(live_api):
    body = {"scenario_id": "scenario_b", "seed": 17, "risk_level": "low"}
    request = Request(live_api + "/simulate", data=json.dumps(body).encode(),
                      headers={"Content-Type": "application/json"})
    with urlopen(request, timeout=5) as response:
        result = json.load(response)
    assert result["metadata"]["data_mode"] == "synthetic"
    assert result["metadata"]["seed"] == 17
    assert abs(sum(a["weight"] for a in result["allocations"]) - 1) < 1e-8


def test_dashboard_calls_http_and_marks_previous_results(live_api, monkeypatch):
    monkeypatch.setenv("API_BASE_URL", live_api)
    app = AppTest.from_file(str(ROOT / "dashboard" / "app.py"), default_timeout=30).run()
    assert not app.exception
    assert not app.error
    assert not any(item.value == str(urlsplit(live_api).port) for item in app.markdown)
    assert "last_result" not in app.session_state
    next(button for button in app.button if button.label == "呼叫合成 API").click().run()
    assert not app.exception
    assert not app.error
    assert app.session_state["last_request"]["seed"] == 42
    assert app.session_state["last_result"]["metadata"]["investment_advice"] is False
    assert any("目前選擇" in success.value for success in app.success)
    original = app.session_state["last_result"]
    app.number_input[0].set_value(88).run()
    assert any("上一次成功" in warning.value for warning in app.warning)
    assert app.session_state["last_result"] == original
    next(button for button in app.button if button.label == "呼叫合成 API").click().run()
    assert not app.exception
    assert app.session_state["last_result"]["metadata"]["seed"] == 88
    assert any("目前選擇" in success.value for success in app.success)


def test_dashboard_handles_offline_backend(monkeypatch):
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        unused_port = listener.getsockname()[1]
    monkeypatch.setenv("API_BASE_URL", f"http://127.0.0.1:{unused_port}")
    app = AppTest.from_file(str(ROOT / "dashboard" / "app.py"), default_timeout=30).run()
    assert not app.exception
    assert any("無法連線" in message.value for message in app.error)
    assert not any(button.label == "呼叫合成 API" for button in app.button)
