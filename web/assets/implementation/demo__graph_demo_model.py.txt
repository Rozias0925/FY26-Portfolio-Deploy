"""A deterministic fixed-rule graph demo, NOT a trained Factor GCN.

Only R_train (indices 0..119) determines graph/features/weights. Let C be its
Pearson correlation matrix. Set A_ij=abs(C_ij) for distinct assets with
abs(C_ij)>=0.25, otherwise zero. Add self-loops and row-normalize: P=D^-1(A+I).
The per-node feature s=mean(R_train)/sample_std(R_train)*sqrt(252) is smoothed
once: z=0.5*s+0.5*P@s. For risk profile (penalty, temperature, concentration),
q=softmax((z-penalty*vol/mean(vol))/temperature),
w=(1-concentration)/N+concentration*q. Parameters are fixed teaching choices;
there is no optimization, gradient training, checkpoint, or real market input.

Evaluate fixed w using ONLY the subsequent R_test (indices 120..179). Daily
portfolio r=R_test@w; equity starts at 1 and compounds product(1+r). Metrics:
* cumulative_return = final equity - 1 (fraction, not percent)
* annualized_volatility = sample_std(r)*sqrt(252)
* sharpe_ratio = mean(r)/sample_std(r)*sqrt(252), zero risk-free rate
* max_drawdown = max(1-equity/running_max(equity)), a nonnegative loss
Annualization is a convention applied to a short toy sample, not a prediction.
Risk profiles change the calculation, but cannot guarantee realized risk order.
The same target weights are applied each day, which implicitly resets weights
daily. Trading/rebalancing execution, turnover, fees, and costs are not modeled.
"""

from dataclasses import dataclass

import numpy as np

from demo.synthetic_data import (
    ASSET_COUNT,
    ASSET_IDS,
    EVALUATION_DAYS,
    TRAINING_DAYS,
    generate_synthetic_data,
)

MODEL_ID = "demo_synthetic_graph_model"
MODEL_VERSION = "1.0.0"
METHOD = "Fixed-rule single-step graph propagation on synthetic calibration observations"
GRAPH_THRESHOLD = 0.25
ANNUALIZATION_DAYS = 252
EPSILON = 1e-12
RISK_PROFILES = {
    "low": {"volatility_penalty": 1.5, "temperature": 1.5, "concentration": 0.35},
    "balanced": {"volatility_penalty": 0.75, "temperature": 0.9, "concentration": 0.65},
    "high": {"volatility_penalty": 0.15, "temperature": 0.5, "concentration": 0.9},
}
FORMULA = (
    "C=corr(R_train); A_ij=abs(C_ij) if i!=j and abs(C_ij)>=0.25 else 0; "
    "P=row_normalize(A+I); s=mean(R_train)/sample_std(R_train)*sqrt(252); "
    "z=0.5*s+0.5*P@s; q=softmax((z-penalty*vol/mean(vol))/temperature); "
    "w=(1-concentration)/6+concentration*q"
)


@dataclass(frozen=True)
class Calibration:
    weights: np.ndarray
    correlation: np.ndarray
    adjacency: np.ndarray
    transition: np.ndarray
    volatility: np.ndarray
    signal: np.ndarray


def _validated_returns(values: np.ndarray, *, rows: int | None = None) -> np.ndarray:
    data = np.asarray(values, dtype=float)
    if data.ndim != 2 or data.shape[1] != ASSET_COUNT or data.shape[0] < 2:
        raise ValueError("Expected at least two observations of six synthetic assets.")
    if rows is not None and data.shape[0] != rows:
        raise ValueError("Unexpected synthetic window length.")
    if not np.isfinite(data).all() or np.any(data <= -1):
        raise ValueError("Synthetic returns must be finite and greater than -1.")
    return data


def infer_allocations(training_returns: np.ndarray, risk_level: str) -> Calibration:
    """Fit summary statistics to past observations; no future data is accepted."""
    if risk_level not in RISK_PROFILES:
        raise ValueError("Unknown risk level.")
    training = _validated_returns(training_returns)
    volatility = np.maximum(training.std(axis=0, ddof=1), EPSILON)
    # Safe covariance normalization also handles a constant synthetic feature.
    covariance = np.cov(training, rowvar=False, ddof=1)
    correlation = np.clip(covariance / np.outer(volatility, volatility), -1.0, 1.0)
    np.fill_diagonal(correlation, 1.0)
    adjacency = np.where(np.abs(correlation) >= GRAPH_THRESHOLD, np.abs(correlation), 0.0)
    np.fill_diagonal(adjacency, 0.0)
    with_self = adjacency + np.eye(ASSET_COUNT)
    transition = with_self / with_self.sum(axis=1, keepdims=True)
    signal = training.mean(axis=0) / volatility * np.sqrt(ANNUALIZATION_DAYS)
    smoothed_signal = 0.5 * signal + 0.5 * transition @ signal
    profile = RISK_PROFILES[risk_level]
    logits = (smoothed_signal - profile["volatility_penalty"] * volatility / volatility.mean())
    logits /= profile["temperature"]
    exp_scores = np.exp(logits - logits.max())
    probability = exp_scores / exp_scores.sum()
    concentration = profile["concentration"]
    weights = (1 - concentration) / ASSET_COUNT + concentration * probability
    return Calibration(weights, correlation, adjacency, transition, volatility, signal)


def evaluate_allocations(evaluation_returns: np.ndarray, weights: np.ndarray) -> dict:
    """Evaluate constant daily target weights; implicit reset, no execution model."""
    evaluation = _validated_returns(evaluation_returns)
    weights = np.asarray(weights, dtype=float)
    if weights.shape != (ASSET_COUNT,) or not np.isfinite(weights).all():
        raise ValueError("Expected six finite weights.")
    if np.any(weights < 0) or not np.isclose(weights.sum(), 1.0, atol=1e-8, rtol=0):
        raise ValueError("Weights must be nonnegative and sum to one.")
    portfolio_returns = evaluation @ weights
    equity = np.concatenate(([1.0], np.cumprod(1.0 + portfolio_returns)))
    standard_deviation = float(portfolio_returns.std(ddof=1))
    sharpe = (
        float(portfolio_returns.mean() / standard_deviation * np.sqrt(ANNUALIZATION_DAYS))
        if standard_deviation > EPSILON else 0.0
    )
    metrics = {
        "cumulative_return": round(float(equity[-1] - 1.0), 10),
        "annualized_volatility": round(standard_deviation * float(np.sqrt(ANNUALIZATION_DAYS)), 10),
        "sharpe_ratio": round(sharpe, 10),
        "max_drawdown": round(float(np.max(1.0 - equity / np.maximum.accumulate(equity))), 10),
        "evaluation_days": int(evaluation.shape[0]),
    }
    return {
        "metrics": metrics,
        "equity_curve": [{"day": day, "equity": round(float(value), 10)} for day, value in enumerate(equity)],
    }


def run_simulation(scenario_id: str, seed: int = 42, risk_level: str = "balanced") -> dict:
    """Execute the full generator → calibration → inference → evaluation pipeline."""
    observations = generate_synthetic_data(scenario_id, seed)
    training = _validated_returns(observations.training_returns, rows=TRAINING_DAYS)
    evaluation = _validated_returns(observations.evaluation_returns, rows=EVALUATION_DAYS)
    fitted = infer_allocations(training, risk_level)
    result = evaluate_allocations(evaluation, fitted.weights)
    nodes = [
        {
            "id": asset_id,
            "label": f"Synthetic Asset {index + 1}",
            "training_volatility": round(float(fitted.volatility[index]), 10),
            "training_signal": round(float(fitted.signal[index]), 10),
        }
        for index, asset_id in enumerate(ASSET_IDS)
    ]
    edges = [
        {
            "source": ASSET_IDS[left], "target": ASSET_IDS[right],
            "correlation": round(float(fitted.correlation[left, right]), 10),
            "weight": round(float(fitted.adjacency[left, right]), 10),
        }
        for left in range(ASSET_COUNT)
        for right in range(left + 1, ASSET_COUNT)
        if fitted.adjacency[left, right] > 0
    ]
    return {
        "allocations": [
            {"asset_id": asset_id, "label": f"Synthetic Asset {index + 1}", "weight": round(float(fitted.weights[index]), 10)}
            for index, asset_id in enumerate(ASSET_IDS)
        ],
        **result,
        "graph": {"nodes": nodes, "edges": edges},
        "metadata": {
            "data_mode": "synthetic", "investment_advice": False,
            "model_id": MODEL_ID, "model_version": MODEL_VERSION,
            "original_factor_gcn": "NOT INTEGRATED", "scenario_id": scenario_id,
            "seed": seed, "risk_level": risk_level,
            "training_days": TRAINING_DAYS, "evaluation_days": EVALUATION_DAYS,
            "asset_count": ASSET_COUNT, "training_window": [0, TRAINING_DAYS - 1],
            "evaluation_window": [TRAINING_DAYS, TRAINING_DAYS + EVALUATION_DAYS - 1],
        },
        "explainability": {
            "method": METHOD, "formula": FORMULA,
            "risk_parameters": dict(RISK_PROFILES[risk_level]),
            "features_used": ["calibration daily mean", "calibration sample daily volatility", "calibration Pearson correlation"],
            "calibration": "Only synthetic observations 0..119 determine graph, features, and fixed allocations. No gradient training or model artifact.",
            "evaluation": "Only subsequent synthetic observations 120..179 determine displayed metrics. Constant target weights are applied daily (implicit daily weight reset). Trading/rebalancing execution, turnover, fees, and costs are not modeled.",
        },
    }
