"""Future private integration contract; intentionally not wired to any route."""

from abc import ABC, abstractmethod
from collections.abc import Sequence


class FactorGCNAdapter(ABC):
    """NOT INTEGRATED: implement only after explicit rights and local-file review."""

    integration_status = "NOT INTEGRATED"

    @abstractmethod
    def infer(self, approved_features: Sequence[Sequence[float]]) -> Sequence[float]:
        """Private interface only; this project includes no implementation."""
        raise NotImplementedError("Original Factor GCN integration requires human approval.")
