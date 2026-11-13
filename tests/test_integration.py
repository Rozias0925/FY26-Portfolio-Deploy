"""In-process HTTP integration through schema → service → model → response.

This proves the connected Python pipeline; it does not claim Docker execution
or socket binding. Root-level verification records separate process/container
smoke evidence when the local tools are available.
"""

import numpy as np
from fastapi.testclient import TestClient

from backend.app.main import app
from demo.graph_demo_model import evaluate_allocations, infer_allocations
from demo.synthetic_data import generate_synthetic_data


def test_discover_then_execute_every_advertised_scenario():
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        info = client.get("/model-info").json()
        scenarios = client.get("/scenarios").json()
        for scenario in scenarios["scenarios"]:
            request = {"scenario_id": scenario["id"], "seed": 123, "risk_level": "balanced"}
            response = client.post("/simulate", json=request)
            assert response.status_code == 200
            data = response.json()
            assert data["metadata"]["model_version"] == info["model_version"]
            assert data["metadata"]["model_id"] == info["model_id"]
            assert data["metadata"]["original_factor_gcn"] == "NOT INTEGRATED"
            assert data["metadata"]["training_window"][1] < data["metadata"]["evaluation_window"][0]
            observations = generate_synthetic_data(scenario["id"], 123)
            fitted = infer_allocations(observations.training_returns, "balanced")
            expected = evaluate_allocations(observations.evaluation_returns, fitted.weights)
            assert data["metrics"] == expected["metrics"]
            assert data["equity_curve"] == expected["equity_curve"]
            np.testing.assert_allclose([item["weight"] for item in data["allocations"]], fitted.weights, atol=1e-9)


def test_sequential_requests_do_not_mutate_or_reuse_other_request_results():
    with TestClient(app) as client:
        first_request = {"scenario_id": "scenario_a", "seed": 42, "risk_level": "balanced"}
        first = client.post("/simulate", json=first_request).json()
        client.post("/simulate", json={"scenario_id": "scenario_c", "seed": 123, "risk_level": "high"})
        last = client.post("/simulate", json=first_request).json()
    assert first == last


def test_private_factor_gcn_adapter_cannot_be_instantiated():
    from private_adapters.factor_gcn import FactorGCNAdapter

    try:
        FactorGCNAdapter()
    except TypeError:
        pass
    else:
        raise AssertionError("The private interface must not imply a usable original model.")
    assert FactorGCNAdapter.integration_status == "NOT INTEGRATED"
