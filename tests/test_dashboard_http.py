"""Real loopback HTTP checks for the dashboard's local-only client boundary."""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from dashboard import app as dashboard


@pytest.fixture
def local_api(monkeypatch):
    requests = []

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_GET(self):
            requests.append((self.command, self.path, None))
            if self.path == "/redirect":
                self.send_response(302)
                self.send_header("Location", "https://external.invalid/private")
                self.end_headers()
                return
            if self.path == "/invalid":
                body = b"not-json"
            elif self.path == "/array":
                body = b"[]"
            elif self.path == "/large":
                body = b"x" * 65
            elif self.path == "/rejected":
                self.send_response(422)
                self.end_headers()
                self.wfile.write(b"sensitive-input-must-not-appear")
                return
            else:
                body = json.dumps({"data_mode": "synthetic", "investment_advice": False}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            body = self.rfile.read(int(self.headers["Content-Length"]))
            requests.append((self.command, self.path, json.loads(body)))
            result = json.dumps({"accepted": True}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(result)))
            self.end_headers()
            self.wfile.write(result)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    monkeypatch.setattr(dashboard, "API_BASE_URL", f"http://127.0.0.1:{server.server_port}")
    try:
        yield requests
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def test_client_uses_real_loopback_http_and_json(local_api):
    request = {"scenario_id": "scenario_a", "seed": 42, "risk_level": "balanced"}
    assert dashboard.call_api("/simulate", request) == {"accepted": True}
    assert local_api == [("POST", "/simulate", request)]


def test_client_ignores_environment_proxy(local_api, monkeypatch):
    monkeypatch.setenv("HTTP_PROXY", "http://127.0.0.1:1")
    monkeypatch.setenv("http_proxy", "http://127.0.0.1:1")
    monkeypatch.setenv("NO_PROXY", "")
    monkeypatch.setenv("no_proxy", "")
    assert dashboard.call_api("/health")["data_mode"] == "synthetic"
    assert len(local_api) == 1


def test_client_does_not_follow_redirects(local_api):
    with pytest.raises(dashboard.ApiError, match="重新導向"):
        dashboard.call_api("/redirect")
    assert len(local_api) == 1


@pytest.mark.parametrize(
    "base_url",
    [
        "https://example.invalid",
        "http://127.0.0.1@example.invalid",
        "http://user:secret@127.0.0.1:8000",
        "http://127.0.0.1:8000/private",
        "http://127.0.0.1:8000?secret=private",
        "http://127.0.0.1:8000#private",
        "http://127.0.0.1:99999",
        "http://[",
        "file:///private",
    ],
)
def test_client_rejects_nonlocal_or_ambiguous_configuration(base_url, monkeypatch):
    monkeypatch.setattr(dashboard, "API_BASE_URL", base_url)
    with pytest.raises(dashboard.ApiError):
        dashboard.call_api("/health")


@pytest.mark.parametrize("path", ["/invalid", "/array"])
def test_client_rejects_invalid_response_shape(path, local_api):
    with pytest.raises(dashboard.ApiError):
        dashboard.call_api(path)


def test_client_limits_response_size(local_api, monkeypatch):
    monkeypatch.setattr(dashboard, "MAX_RESPONSE_BYTES", 64)
    with pytest.raises(dashboard.ApiError, match="大小"):
        dashboard.call_api("/large")


def test_validation_failure_does_not_echo_backend_body(local_api):
    with pytest.raises(dashboard.ApiError) as error:
        dashboard.call_api("/rejected")
    assert "422" in str(error.value)
    assert "sensitive-input" not in str(error.value)


@pytest.mark.parametrize(
    "response",
    [
        {},
        {"data_mode": "real", "investment_advice": False},
        {"data_mode": "synthetic", "investment_advice": True},
        {"data_mode": "synthetic", "investment_advice": 0},
    ],
)
def test_dashboard_refuses_missing_or_incorrect_synthetic_labels(response):
    with pytest.raises(dashboard.ApiError):
        dashboard.require_synthetic(response)
