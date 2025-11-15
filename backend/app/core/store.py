from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import networkx as nx

from ..config import settings
from .models import Edge, Node, RelationType


class InMemoryStore:
    def __init__(self) -> None:
        self.nodes: Dict[str, Node] = {}
        self.edges: List[Edge] = []
        self.graph: nx.DiGraph = nx.DiGraph()

    def upsert_node(self, node: Node) -> None:
        self.nodes[node.id] = node
        self.graph.add_node(
            node.id,
            timestamp=node.timestamp,
            channel=node.channel,
            source=node.source,
            url=node.url,
        )

    def add_edge(self, edge: Edge) -> None:
        self.edges.append(edge)
        self.graph.add_edge(edge.source, edge.target, type=edge.type, score=edge.score)

    def get_node(self, node_id: str) -> Optional[Node]:
        return self.nodes.get(node_id)

    def get_edges(self, node_id: Optional[str] = None) -> List[Edge]:
        if node_id is None:
            return list(self.edges)
        return [e for e in self.edges if e.source == node_id or e.target == node_id]

    def find_origin(self, node_id: str) -> List[Node]:
        if node_id not in self.graph:
            return []
        ancestors = nx.ancestors(self.graph, node_id)
        if not ancestors:
            node = self.get_node(node_id)
            return [node] if node else []
        min_time = min(
            (self.nodes[a].timestamp or datetime.utcnow(), a) for a in ancestors
        )[0]
        earliest = [self.nodes[a] for a in ancestors if self.nodes[a].timestamp == min_time]
        return earliest

    def trace_to_origin(self, node_id: str) -> List[str]:
        if node_id not in self.graph:
            return []
        ancestors = nx.ancestors(self.graph, node_id)
        if not ancestors:
            return [node_id]
        earliest = min(
            ancestors,
            key=lambda a: self.nodes[a].timestamp or datetime.utcnow(),
        )
        return list(nx.shortest_path(self.graph, earliest, node_id))

    def search(self, predicate) -> List[Node]:
        return [node for node in self.nodes.values() if predicate(node)]

    def to_networkx(self) -> nx.DiGraph:
        return self.graph


store = InMemoryStore()


class Neo4jAdapter:
    """Placeholder adapter for future expansion."""

    def __init__(self, uri: str, user: str, password: str) -> None:
        self.uri = uri
        self.user = user
        self.password = password

    def is_available(self) -> bool:
        try:
            import neo4j  # type: ignore

            return True
        except Exception:
            return False

    def describe(self) -> str:
        return (
            "Neo4j adapter configured but optional."
            " Set IIO_NEO4J_URI to enable full connectivity."
        )


