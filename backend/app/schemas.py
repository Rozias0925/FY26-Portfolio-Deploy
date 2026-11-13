"""Typed, finite JSON contracts. No arbitrary asset, URL, or file input exists."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, model_validator

ScenarioId = Literal["scenario_a", "scenario_b", "scenario_c"]
RiskLevel = Literal["low", "balanced", "high"]
Seed = Annotated[int, Field(strict=True, ge=0, le=2_147_483_647)]
UnitFloat = Annotated[FiniteFloat, Field(ge=0, le=1)]
AssetId = Literal["SIM-01", "SIM-02", "SIM-03", "SIM-04", "SIM-05", "SIM-06"]


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class SafetyFields(StrictSchema):
    data_mode: Literal["synthetic"] = "synthetic"
    investment_advice: Literal[False] = False


class SimulationRequest(StrictSchema):
    scenario_id: ScenarioId
    seed: Seed = 42
    risk_level: RiskLevel = "balanced"


class HealthResponse(SafetyFields):
    status: Literal["ok"]
    version: str


class Scenario(StrictSchema):
    id: ScenarioId
    label: str
    description: str


class SeedBounds(StrictSchema):
    minimum: int
    maximum: int
    default: int


class AllowedParameters(StrictSchema):
    seed: SeedBounds
    risk_level: list[RiskLevel]


class ScenariosResponse(SafetyFields):
    scenarios: list[Scenario]
    allowed_parameters: AllowedParameters


class DataSplit(StrictSchema):
    training_days: Literal[120]
    evaluation_days: Literal[60]
    training_window: list[int]
    evaluation_window: list[int]


class ModelInfoResponse(SafetyFields):
    model_id: Literal["demo_synthetic_graph_model"]
    model_version: str
    original_factor_gcn: Literal["NOT INTEGRATED"]
    trained_model: Literal[False]
    method: str
    formula: str
    pipeline: list[str]
    split: DataSplit
    metric_definitions: dict[str, str]
    limitations: list[str]


class Allocation(StrictSchema):
    asset_id: AssetId
    label: str
    weight: UnitFloat


class Metrics(StrictSchema):
    cumulative_return: Annotated[FiniteFloat, Field(gt=-1)]
    annualized_volatility: Annotated[FiniteFloat, Field(ge=0)]
    sharpe_ratio: FiniteFloat
    max_drawdown: UnitFloat
    evaluation_days: Literal[60]


class EquityPoint(StrictSchema):
    day: Annotated[int, Field(ge=0, le=60)]
    equity: Annotated[FiniteFloat, Field(gt=0)]


class GraphNode(StrictSchema):
    id: AssetId
    label: str
    training_volatility: Annotated[FiniteFloat, Field(ge=0)]
    training_signal: FiniteFloat


class GraphEdge(StrictSchema):
    source: AssetId
    target: AssetId
    correlation: Annotated[FiniteFloat, Field(ge=-1, le=1)]
    weight: UnitFloat


class Graph(StrictSchema):
    nodes: list[GraphNode] = Field(min_length=6, max_length=6)
    edges: list[GraphEdge] = Field(max_length=15)


class Metadata(SafetyFields, DataSplit):
    model_id: Literal["demo_synthetic_graph_model"]
    model_version: str
    original_factor_gcn: Literal["NOT INTEGRATED"]
    scenario_id: ScenarioId
    seed: Seed
    risk_level: RiskLevel
    asset_count: Literal[6]


class RiskParameters(StrictSchema):
    volatility_penalty: Annotated[FiniteFloat, Field(ge=0)]
    temperature: Annotated[FiniteFloat, Field(gt=0)]
    concentration: UnitFloat


class Explainability(StrictSchema):
    method: str
    formula: str
    risk_parameters: RiskParameters
    features_used: list[str]
    calibration: str
    evaluation: str


class SimulationResponse(StrictSchema):
    allocations: list[Allocation] = Field(min_length=6, max_length=6)
    metrics: Metrics
    equity_curve: list[EquityPoint] = Field(min_length=61, max_length=61)
    graph: Graph
    metadata: Metadata
    explainability: Explainability

    @model_validator(mode="after")
    def check_consistency(self) -> "SimulationResponse":
        if abs(sum(item.weight for item in self.allocations) - 1.0) > 1e-8:
            raise ValueError("Allocation weights must sum to one.")
        if len({item.asset_id for item in self.allocations}) != 6:
            raise ValueError("Synthetic asset IDs must be unique.")
        if [point.day for point in self.equity_curve] != list(range(61)):
            raise ValueError("Equity curve must include each evaluation day and initial value.")
        if self.equity_curve[0].equity != 1.0:
            raise ValueError("Equity curve must start at one.")
        if abs(self.equity_curve[-1].equity - 1.0 - self.metrics.cumulative_return) > 1e-8:
            raise ValueError("Cumulative return must match final equity.")
        return self
