"""Endpoint contracts and malicious/invalid input boundaries."""

import json
from html.parser import HTMLParser

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.app import routes
from backend.app.main import app
from backend.app.schemas import SimulationResponse
from demo.graph_demo_model import run_simulation


@pytest.fixture
def client():
    with TestClient(app) as instance:
        yield instance


def test_health_is_explicitly_synthetic(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.0.0", "data_mode": "synthetic", "investment_advice": False}


def test_model_info_states_original_model_not_integrated_and_exact_formulas(client):
    response = client.get("/model-info")
    assert response.status_code == 200
    info = response.json()
    assert info["model_id"] == "demo_synthetic_graph_model"
    assert info["original_factor_gcn"] == "NOT INTEGRATED"
    assert info["trained_model"] is False
    assert info["data_mode"] == "synthetic"
    assert info["investment_advice"] is False
    assert info["split"]["training_window"] == [0, 119]
    assert info["split"]["evaluation_window"] == [120, 179]
    assert "P=row_normalize(A+I)" in info["formula"]
    assert "sample_std" in info["metric_definitions"]["annualized_volatility"]
    assert len(info["limitations"]) >= 6


def test_scenarios_advertise_only_bounded_parameters(client):
    response = client.get("/scenarios")
    assert response.status_code == 200
    data = response.json()
    assert [item["id"] for item in data["scenarios"]] == ["scenario_a", "scenario_b", "scenario_c"]
    assert data["allowed_parameters"]["risk_level"] == ["low", "balanced", "high"]
    assert data["allowed_parameters"]["seed"] == {"minimum": 0, "maximum": 2_147_483_647, "default": 42}


def test_simulation_is_typed_repeatable_and_defaults_match(client):
    minimum = client.post("/simulate", json={"scenario_id": "scenario_a"})
    explicit = client.post("/simulate", json={"scenario_id": "scenario_a", "seed": 42, "risk_level": "balanced"})
    assert minimum.status_code == explicit.status_code == 200
    assert minimum.json() == explicit.json()
    validated = SimulationResponse.model_validate(minimum.json())
    assert len(validated.allocations) == 6
    assert sum(item.weight for item in validated.allocations) == pytest.approx(1, abs=1e-8)
    assert validated.metadata.investment_advice is False


@pytest.mark.parametrize("scenario_id", ["scenario_a", "scenario_b", "scenario_c"])
@pytest.mark.parametrize("risk_level", ["low", "balanced", "high"])
def test_all_supported_scenario_risk_combinations_work(client, scenario_id, risk_level):
    response = client.post("/simulate", json={"scenario_id": scenario_id, "risk_level": risk_level, "seed": 0})
    assert response.status_code == 200
    assert response.json()["metadata"]["scenario_id"] == scenario_id
    assert response.json()["metadata"]["risk_level"] == risk_level


@pytest.mark.parametrize("payload", [
    {},
    {"scenario_id": "2330"},
    {"scenario_id": "https://example.invalid/secret-data"},
    {"scenario_id": "../../private/secret-data.csv"},
    {"scenario_id": "scenario_a", "ticker": "SECRET-TICKER"},
    {"scenario_id": "scenario_a", "url": "https://example.invalid/secret-data"},
    {"scenario_id": "scenario_a", "file_path": "C:\\private\\secret-data.csv"},
    {"scenario_id": "scenario_a", "C:\\private\\secret-data.csv": "secret-data"},
    {"scenario_id": "scenario_a", "model": "original_factor_gcn"},
    {"scenario_id": "scenario_a", "data_mode": "real"},
    {"scenario_id": "scenario_a", "seed": -1},
    {"scenario_id": "scenario_a", "seed": 2_147_483_648},
    {"scenario_id": "scenario_a", "seed": True},
    {"scenario_id": "scenario_a", "seed": "42"},
    {"scenario_id": "scenario_a", "seed": 42.5},
    {"scenario_id": "scenario_a", "seed": None},
    {"scenario_id": "scenario_a", "risk_level": "unlimited"},
    {"scenario_id": "scenario_a", "risk_level": 1},
    {"scenario_id": "scenario_a", "risk_level": {"url": "secret-data"}},
    [],
    None,
])
def test_invalid_or_real_data_inputs_are_422_without_echoing_values(client, payload):
    response = client.post("/simulate", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert isinstance(data["detail"], list)
    for error in data["detail"]:
        assert set(error) == {"type", "loc", "msg"}
    serialized = json.dumps(data)
    assert "secret-data" not in serialized
    assert "SECRET-TICKER" not in serialized
    assert "original_factor_gcn" not in serialized


def test_nonfinite_seed_json_is_rejected(client):
    response = client.post("/simulate", content='{"scenario_id":"scenario_a","seed":NaN}', headers={"Content-Type": "application/json"})
    assert response.status_code == 422


def test_malformed_json_is_rejected_without_body_leak(client):
    response = client.post("/simulate", content='{"secret-data":', headers={"Content-Type": "application/json"})
    assert response.status_code == 422
    assert "secret-data" not in response.text


def test_internal_exception_returns_sanitized_500(monkeypatch):
    def fail(_request):
        raise RuntimeError("C:\\private\\secret-data.csv contains private data")
    monkeypatch.setattr(routes, "simulate", fail)
    with TestClient(app, raise_server_exceptions=False) as safe_client:
        response = safe_client.post("/simulate", json={"scenario_id": "scenario_a"})
    assert response.status_code == 500
    assert response.json() == {"detail": "Simulation failed safely."}
    assert "secret-data" not in response.text


def test_response_schema_rejects_nan_and_inconsistent_weights():
    result = run_simulation("scenario_a", 42)
    result["allocations"][0]["weight"] = float("nan")
    with pytest.raises(ValidationError):
        SimulationResponse.model_validate(result)
    result = run_simulation("scenario_a", 42)
    result["allocations"][0]["weight"] = 0.99
    with pytest.raises(ValidationError):
        SimulationResponse.model_validate(result)


def test_openapi_documents_strict_request_and_typed_response(client):
    spec = client.get("/openapi.json").json()
    request = spec["components"]["schemas"]["SimulationRequest"]
    assert request["additionalProperties"] is False
    assert request["properties"]["seed"]["maximum"] == 2_147_483_647
    assert spec["paths"]["/simulate"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("SimulationResponse")
    assert client.get("/docs").status_code == 200


def test_no_real_model_or_upload_routes_exist(client):
    assert client.post("/predict", json={"ticker": "EXAMPLE"}).status_code == 404
    assert client.post("/upload", content=b"secret-data").status_code == 404
    assert client.get("/simulate").status_code == 405


def test_local_docs_has_no_remote_assets_and_disables_cdn_based_alternatives(client):
    class AssetParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.references = []
            self.form_ids = []
            self.endpoints = []

        def handle_starttag(self, tag, attrs):
            attributes = dict(attrs)
            for name in ("src", "href", "action"):
                if name in attributes:
                    self.references.append(attributes[name])
            if tag == "form":
                self.form_ids.append(attributes.get("id"))
            if "data-endpoint" in attributes:
                self.endpoints.append(attributes["data-endpoint"])

    response = client.get("/docs")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "connect-src 'self'" in response.headers["content-security-policy"]
    assert response.headers["referrer-policy"] == "no-referrer"
    document = response.text
    parser = AssetParser()
    parser.feed(document)
    assert parser.references == ["/openapi.json"]
    assert parser.form_ids == ["simulate-form"]
    assert set(parser.endpoints) == {"/health", "/model-info", "/scenarios", "/openapi.json"}
    assert "runRequest(\"/simulate\", payload" in document
    assert "responseOutput.textContent = JSON.stringify(result" in document
    assert "innerHTML" not in document
    assert "cdn.jsdelivr" not in document
    assert "https://" not in document
    assert client.get("/redoc").status_code == 404
    assert client.get("/docs/oauth2-redirect").status_code == 404
