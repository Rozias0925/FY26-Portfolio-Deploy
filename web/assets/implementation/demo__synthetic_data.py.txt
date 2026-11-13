"""Generate fictional daily observations without network or file input.

Indices 0..119 are calibration observations; 120..179 are future evaluation
observations. Separate SeedSequence children make the random streams explicit.
Neither stream contains real prices, ticker symbols, or licensed market data.
"""

from dataclasses import dataclass

import numpy as np

ASSET_COUNT = 6
TRAINING_DAYS = 120
EVALUATION_DAYS = 60
ASSET_IDS = tuple(f"SIM-{index:02d}" for index in range(1, ASSET_COUNT + 1))
SCENARIOS = (
    {
        "id": "scenario_a",
        "label": "Scenario A — 平穩群聚",
        "description": "虛構資產共享兩個穩定因子；用來觀察圖的群聚。",
    },
    {
        "id": "scenario_b",
        "label": "Scenario B — 情境轉換",
        "description": "評估期的合成波動與趨勢改變；展示校準後遇到分布變化。",
    },
    {
        "id": "scenario_c",
        "label": "Scenario C — 分散連結",
        "description": "虛構資產的獨立擾動較大；展示較弱的圖連結。",
    },
)
SCENARIO_IDS = tuple(item["id"] for item in SCENARIOS)
MAX_SEED = 2_147_483_647


@dataclass(frozen=True)
class SyntheticObservations:
    """Time-ordered, disjoint calibration and future evaluation arrays."""

    training_returns: np.ndarray
    evaluation_returns: np.ndarray


def generate_synthetic_data(scenario_id: str, seed: int) -> SyntheticObservations:
    """Generate 120 calibration days and 60 held-out future days, six assets.

    These arrays are hypothetical daily fractional returns, not price forecasts.
    Values are clipped to [-0.15, 0.15] to keep this bounded teaching example
    numerically stable. The generator is intentionally not a market simulator.
    """
    if scenario_id not in SCENARIO_IDS:
        raise ValueError("Unknown synthetic scenario.")
    if type(seed) is not int or not 0 <= seed <= MAX_SEED:
        raise ValueError("Seed must be an integer in the supported range.")

    training_seed, evaluation_seed = np.random.SeedSequence(seed).spawn(2)
    loadings = np.array(
        [[0.9, 0.1], [0.8, 0.2], [0.7, 0.3], [0.2, 0.8], [0.1, 0.9], [0.3, 0.7]],
        dtype=float,
    )
    means = np.array([0.0003, 0.0001, 0.0002, -0.0001, 0.00025, 0.00005])
    noise_scales = np.array([0.003, 0.0045, 0.006, 0.008, 0.010, 0.012])

    def make_window(window_seed: np.random.SeedSequence, count: int, future: bool) -> np.ndarray:
        rng = np.random.default_rng(window_seed)
        factor_scale, noise_multiplier = 0.006, 1.0
        drift = means.copy()
        if scenario_id == "scenario_c":
            factor_scale, noise_multiplier = 0.002, 1.5
        elif scenario_id == "scenario_b" and future:
            factor_scale, noise_multiplier = 0.012, 1.4
            drift = -means - 0.00035
        factors = rng.normal(0.0, factor_scale, size=(count, 2))
        independent_noise = rng.normal(size=(count, ASSET_COUNT)) * noise_scales * noise_multiplier
        returns = factors @ loadings.T + independent_noise + drift
        return np.clip(returns, -0.15, 0.15)

    return SyntheticObservations(
        training_returns=make_window(training_seed, TRAINING_DAYS, False),
        evaluation_returns=make_window(evaluation_seed, EVALUATION_DAYS, True),
    )
