from __future__ import annotations

from datetime import datetime
from typing import Dict, List

import networkx as nx

from ..core.models import Edge, Node
from ..core.store import store


def ensure_graph_consistency() -> None:
    g = store.to_networkx()
    for node_id, node in store.nodes.items():
        if node_id not in g:
            g.add_node(node_id, timestamp=node.timestamp)
    for edge in store.edges:
        if not g.has_edge(edge.source, edge.target):
            g.add_edge(edge.source, edge.target, type=edge.type, score=edge.score)


def provenance_breadcrumb(node_id: str) -> List[str]:
    ensure_graph_consistency()
    trace = store.trace_to_origin(node_id)
    return trace


def timeline_buckets(interval: int = 24) -> Dict[str, int]:
    ensure_graph_consistency()
    buckets: Dict[str, int] = {}
    for node in store.nodes.values():
        if not node.timestamp:
            continue
        key = node.timestamp.strftime("%Y-%m-%d")
        buckets[key] = buckets.get(key, 0) + 1
    return buckets


def as_d3_graph(filtered_nodes: List[str] | None = None) -> Dict[str, object]:
    ensure_graph_consistency()
    nodes = []
    edges = []
    for node in store.nodes.values():
        if filtered_nodes and node.id not in filtered_nodes:
            continue
        nodes.append(
            {
                "id": node.id,
                "channel": node.channel,
                "timestamp": node.timestamp.isoformat() if node.timestamp else None,
                "source": node.source,
                "url": node.url,
            }
        )
    for edge in store.edges:
        if filtered_nodes and (
            edge.source not in filtered_nodes or edge.target not in filtered_nodes
        ):
            continue
        edges.append(
            {
                "source": edge.source,
                "target": edge.target,
                "type": edge.type,
                "score": edge.score,
            }
        )
    return {"nodes": nodes, "edges": edges}


