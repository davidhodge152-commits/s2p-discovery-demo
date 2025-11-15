from __future__ import annotations

from typing import Dict, List

from fastapi import APIRouter, HTTPException

from ..core.models import SimulationRequest
from ..core.store import store
from ..services.graph_builder import as_d3_graph, provenance_breadcrumb, timeline_buckets
from ..services.simulate import simulate_spread

router = APIRouter()


@router.get("/node/{node_id}")
async def get_node(node_id: str) -> Dict[str, object]:
    node = store.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="node not found")
    edges = store.get_edges(node_id)
    return {"node": node.model_dump(), "edges": [edge.model_dump() for edge in edges]}


@router.get("/origin/{node_id}")
async def origin(node_id: str) -> Dict[str, object]:
    origins = store.find_origin(node_id)
    return {"origins": [n.model_dump() for n in origins]}


@router.get("/trace/{node_id}")
async def trace(node_id: str) -> Dict[str, object]:
    path = provenance_breadcrumb(node_id)
    return {"path": path}


@router.get("/timeline")
async def timeline() -> Dict[str, int]:
    return timeline_buckets()


@router.get("/graph")
async def full_graph() -> Dict[str, object]:
    return as_d3_graph()


@router.post("/simulate")
async def simulate(payload: SimulationRequest) -> Dict[str, object]:
    projections = simulate_spread(payload)
    return {"projections": [p.model_dump() for p in projections]}


