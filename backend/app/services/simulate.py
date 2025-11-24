from __future__ import annotations

from datetime import datetime, timedelta
from typing import List

from ..core.models import Channel, Node, SimulationNode, SimulationRequest
from ..core.store import store


def simulate_spread(request: SimulationRequest) -> List[SimulationNode]:
    seed = store.get_node(request.id)
    if not seed:
        return []
    projections: List[SimulationNode] = []
    current = [seed]
    for step in range(1, request.steps + 1):
        next_wave: List[Node] = []
        for node in current:
            for channel, weight in request.weights.items():
                expected = max(int(request.r0 * weight), 1)
                for i in range(expected):
                    projections.append(
                        SimulationNode(
                            id=f"sim-{node.id}-{step}-{i}",
                            parent=node.id,
                            step=step,
                            timestamp=(node.timestamp or datetime.utcnow())
                            + timedelta(hours=step * 6 + i),
                            channel=channel,
                        )
                    )
        current = next_wave if next_wave else [seed]
    return projections


