"""Synthetic-only endpoints. No external I/O, tickers, uploads, or trading."""

from fastapi import APIRouter

from backend.app.schemas import (
    HealthResponse,
    ModelInfoResponse,
    ScenariosResponse,
    SimulationRequest,
    SimulationResponse,
)
from backend.app.services.simulation import simulate
from demo.graph_demo_model import FORMULA, METHOD, MODEL_ID, MODEL_VERSION
from demo.synthetic_data import EVALUATION_DAYS, MAX_SEED, SCENARIOS, TRAINING_DAYS

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Service"])
def health() -> dict:
    return {"status": "ok", "version": MODEL_VERSION}


@router.get("/model-info", response_model=ModelInfoResponse, tags=["Education"])
def model_info() -> dict:
    return {
        "model_id": MODEL_ID, "model_version": MODEL_VERSION,
        "original_factor_gcn": "NOT INTEGRATED", "trained_model": False,
        "method": METHOD, "formula": FORMULA,
        "pipeline": ["synthetic generation", "past-only feature calibration", "past-only graph construction", "fixed-rule inference", "held-out evaluation", "typed JSON response"],
        "split": {
            "training_days": TRAINING_DAYS, "evaluation_days": EVALUATION_DAYS,
            "training_window": [0, TRAINING_DAYS - 1],
            "evaluation_window": [TRAINING_DAYS, TRAINING_DAYS + EVALUATION_DAYS - 1],
        },
        "metric_definitions": {
            "cumulative_return": "prod(1 + held-out daily portfolio return) - 1; decimal fraction",
            "annualized_volatility": "sample_std(held-out daily portfolio returns) * sqrt(252); decimal fraction",
            "sharpe_ratio": "mean(held-out daily portfolio returns) / sample_std * sqrt(252); risk-free rate 0; 0 when standard deviation is 0",
            "max_drawdown": "max(1 - equity / running_max(equity)); nonnegative decimal fraction; includes initial equity 1",
            "graph_node_training_volatility": "sample daily standard deviation over calibration days 0..119; decimal fraction",
            "graph_node_training_signal": "calibration mean / sample daily standard deviation * sqrt(252)",
        },
        "limitations": [
            "Fictional data only; no real securities or investment advice.",
            "No original Factor GCN code, weights, research data, or original results are integrated.",
            "Fixed-rule graph propagation is not a trained GCN; no learned model artifact exists.",
            "Risk labels change fixed formula parameters; realized volatility order is not guaranteed.",
            "Only 60 held-out synthetic days; annualization is illustrative and is not a forecast.",
            "Constant target weights are applied each day (implicit daily weight reset); trading/rebalancing execution, turnover, fees, and costs are not modeled.",
            "Repeatability assumes the same source and dependency versions; cross-platform bitwise identity is not promised.",
        ],
    }


@router.get("/scenarios", response_model=ScenariosResponse, tags=["Education"])
def scenarios() -> dict:
    return {
        "scenarios": list(SCENARIOS),
        "allowed_parameters": {
            "seed": {"minimum": 0, "maximum": MAX_SEED, "default": 42},
            "risk_level": ["low", "balanced", "high"],
        },
    }


@router.post("/simulate", response_model=SimulationResponse, tags=["Synthetic Demo"])
def simulate_route(request: SimulationRequest) -> SimulationResponse:
    """Compute a fictional graph example. Accepts only three bounded parameters."""
    return simulate(request)
