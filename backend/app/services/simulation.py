"""The API calls this service; the dashboard consumes the API over HTTP."""

from backend.app.schemas import SimulationRequest, SimulationResponse
from demo.graph_demo_model import run_simulation


def simulate(request: SimulationRequest) -> SimulationResponse:
    result = run_simulation(request.scenario_id, request.seed, request.risk_level)
    return SimulationResponse.model_validate(result)
