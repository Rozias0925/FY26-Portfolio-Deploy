"""Model contracts: reproducibility, independent formulas, and no look-ahead."""

import numpy as np
import pytest

from demo import graph_demo_model
from demo.graph_demo_model import (
    GRAPH_THRESHOLD,
    RISK_PROFILES,
    evaluate_allocations,
    infer_allocations,
    run_simulation,
)
from demo.synthetic_data import (
    ASSET_COUNT,
    ASSET_IDS,
    EVALUATION_DAYS,
    SCENARIO_IDS,
    TRAINING_DAYS,
    SyntheticObservations,
    generate_synthetic_data,
)


@pytest.mark.parametrize("scenario_id", SCENARIO_IDS)
def test_synthetic_windows_are_finite_bounded_separate_and_reproducible(scenario_id):
    first = generate_synthetic_data(scenario_id, 42)
    second = generate_synthetic_data(scenario_id, 42)
    assert first.training_returns.shape == (TRAINING_DAYS, ASSET_COUNT)
    assert first.evaluation_returns.shape == (EVALUATION_DAYS, ASSET_COUNT)
    assert not np.shares_memory(first.training_returns, first.evaluation_returns)
    for values, repeated in [
        (first.training_returns, second.training_returns),
        (first.evaluation_returns, second.evaluation_returns),
    ]:
        np.testing.assert_array_equal(values, repeated)
        assert np.isfinite(values).all()
        assert np.all(np.abs(values) <= 0.15)


@pytest.mark.parametrize("scenario_id", SCENARIO_IDS)
@pytest.mark.parametrize("risk_level", RISK_PROFILES)
@pytest.mark.parametrize("seed", [0, 42, 2_147_483_647])
def test_pipeline_has_deterministic_valid_weights_equity_and_safety(scenario_id, risk_level, seed):
    result = run_simulation(scenario_id, seed, risk_level)
    assert result == run_simulation(scenario_id, seed, risk_level)
    allocations = result["allocations"]
    weights = np.array([allocation["weight"] for allocation in allocations])
    assert [item["asset_id"] for item in allocations] == list(ASSET_IDS)
    assert np.isfinite(weights).all()
    assert np.all((weights >= 0) & (weights <= 1))
    assert weights.sum() == pytest.approx(1.0, abs=1e-8)
    equity = result["equity_curve"]
    assert len(equity) == EVALUATION_DAYS + 1
    assert [point["day"] for point in equity] == list(range(EVALUATION_DAYS + 1))
    assert equity[0] == {"day": 0, "equity": 1.0}
    assert all(point["equity"] > 0 for point in equity)
    assert result["metrics"]["cumulative_return"] == pytest.approx(equity[-1]["equity"] - 1)
    assert 0 <= result["metrics"]["max_drawdown"] <= 1
    metadata = result["metadata"]
    assert metadata["data_mode"] == "synthetic"
    assert metadata["investment_advice"] is False
    assert metadata["original_factor_gcn"] == "NOT INTEGRATED"
    assert metadata["training_window"] == [0, 119]
    assert metadata["evaluation_window"] == [120, 179]


def test_seed_changes_generated_observations_and_outputs():
    assert run_simulation("scenario_a", 42) != run_simulation("scenario_a", 43)


def test_graph_and_allocation_formula_match_independent_calculation():
    training = generate_synthetic_data("scenario_a", 42).training_returns
    fitted = infer_allocations(training, "balanced")
    correlation = np.corrcoef(training, rowvar=False)
    adjacency = np.where(np.abs(correlation) >= 0.25, np.abs(correlation), 0)
    np.fill_diagonal(adjacency, 0)
    with_self = adjacency + np.eye(6)
    transition = with_self / with_self.sum(axis=1, keepdims=True)
    volatility = np.std(training, axis=0, ddof=1)
    signal = training.mean(axis=0) / volatility * np.sqrt(252)
    smoothed = (signal + transition @ signal) / 2
    logits = (smoothed - 0.75 * volatility / volatility.mean()) / 0.9
    scores = np.exp(logits - logits.max())
    expected_weights = 0.35 / 6 + 0.65 * scores / scores.sum()
    np.testing.assert_allclose(fitted.correlation, correlation)
    np.testing.assert_allclose(fitted.adjacency, adjacency)
    np.testing.assert_allclose(fitted.transition, transition)
    np.testing.assert_allclose(fitted.weights, expected_weights)
    assert np.allclose(fitted.transition.sum(axis=1), 1)
    assert np.allclose(fitted.adjacency, fitted.adjacency.T)
    assert not np.any(np.diag(fitted.adjacency))


def test_returned_graph_edges_are_real_thresholded_calibration_correlations():
    training = generate_synthetic_data("scenario_a", 42).training_returns
    correlation = np.corrcoef(training, rowvar=False)
    graph = run_simulation("scenario_a", 42)["graph"]
    expected_edges = {
        (ASSET_IDS[left], ASSET_IDS[right])
        for left in range(6) for right in range(left + 1, 6)
        if abs(correlation[left, right]) >= GRAPH_THRESHOLD
    }
    actual_edges = {(edge["source"], edge["target"]) for edge in graph["edges"]}
    assert actual_edges == expected_edges
    assert expected_edges  # This seed deliberately demonstrates visible edges.
    assert len(actual_edges) == len(graph["edges"])
    for edge in graph["edges"]:
        left, right = ASSET_IDS.index(edge["source"]), ASSET_IDS.index(edge["target"])
        assert left != right
        assert edge["correlation"] == pytest.approx(correlation[left, right], abs=1e-9)
        assert edge["weight"] == pytest.approx(abs(correlation[left, right]), abs=1e-9)


def test_future_observations_cannot_change_graph_or_allocations(monkeypatch):
    original = generate_synthetic_data("scenario_a", 42)
    result = run_simulation("scenario_a", 42)
    changed_future = SyntheticObservations(
        original.training_returns.copy(), np.full((EVALUATION_DAYS, ASSET_COUNT), -0.01),
    )
    monkeypatch.setattr(graph_demo_model, "generate_synthetic_data", lambda *_args: changed_future)
    changed = run_simulation("scenario_a", 42)
    assert changed["allocations"] == result["allocations"]
    assert changed["graph"] == result["graph"]
    assert changed["metrics"] != result["metrics"]
    assert changed["metrics"]["cumulative_return"] == pytest.approx(0.99**60 - 1)


def test_scenario_b_deliberately_changes_only_future_distribution():
    stable = run_simulation("scenario_a", 42)
    shifted = run_simulation("scenario_b", 42)
    assert stable["allocations"] == shifted["allocations"]
    assert stable["graph"] == shifted["graph"]
    assert stable["metrics"] != shifted["metrics"]


def test_risk_levels_change_parameters_and_actual_allocations():
    runs = [run_simulation("scenario_a", 42, risk) for risk in RISK_PROFILES]
    vectors = [np.array([item["weight"] for item in run["allocations"]]) for run in runs]
    assert not np.allclose(vectors[0], vectors[1])
    assert not np.allclose(vectors[1], vectors[2])
    for run, risk in zip(runs, RISK_PROFILES):
        assert run["explainability"]["risk_parameters"] == RISK_PROFILES[risk]


def test_metrics_use_independently_known_held_out_returns_and_initial_peak():
    daily = np.array([-0.10, 0.10, 0.0])
    evaluation = np.repeat(daily[:, None], 6, axis=1)
    result = evaluate_allocations(evaluation, np.full(6, 1 / 6))
    assert [point["equity"] for point in result["equity_curve"]] == [1.0, 0.9, 0.99, 0.99]
    assert result["metrics"]["cumulative_return"] == pytest.approx(-0.01)
    assert result["metrics"]["max_drawdown"] == pytest.approx(0.1)
    assert result["metrics"]["annualized_volatility"] == pytest.approx(0.1 * np.sqrt(252))
    assert result["metrics"]["sharpe_ratio"] == pytest.approx(0)


def test_constant_observations_remain_numerically_finite():
    fitted = infer_allocations(np.zeros((120, 6)), "balanced")
    np.testing.assert_allclose(fitted.weights, np.full(6, 1 / 6))
    result = evaluate_allocations(np.zeros((60, 6)), fitted.weights)
    assert result["metrics"]["sharpe_ratio"] == 0
    assert result["metrics"]["annualized_volatility"] == 0
    assert result["metrics"]["max_drawdown"] == 0


@pytest.mark.parametrize("bad", [np.zeros((1, 6)), np.zeros((120, 5)), np.full((120, 6), np.nan), np.full((120, 6), -1)])
def test_invalid_internal_observations_are_rejected(bad):
    with pytest.raises(ValueError):
        infer_allocations(bad, "balanced")


@pytest.mark.parametrize("bad_seed", [-1, 2_147_483_648, True, "42", 42.5])
def test_generator_rejects_invalid_seed_even_outside_api(bad_seed):
    with pytest.raises(ValueError):
        generate_synthetic_data("scenario_a", bad_seed)


def test_unknown_scenario_and_risk_are_rejected():
    with pytest.raises(ValueError):
        generate_synthetic_data("REAL-TICKER", 42)
    with pytest.raises(ValueError):
        run_simulation("scenario_a", 42, "unbounded")
