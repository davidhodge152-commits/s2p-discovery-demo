from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class Channel(str, Enum):
    news = "news"
    social = "social"
    blog = "blog"
    pdf = "pdf"


class RelationType(str, Enum):
    quote = "quote"
    paraphrase = "paraphrase"
    near_duplicate = "near-duplicate"
    summary = "summary"
    reference = "reference"


class Fingerprint(BaseModel):
    minhash: List[int]
    shingles: List[str]


class NodeCreate(BaseModel):
    id: Optional[str] = None
    text: str
    source: str
    channel: Channel
    url: Optional[str] = None
    timestamp: Optional[datetime] = None
    claims: Optional[List[str]] = None


class Node(NodeCreate):
    id: str = Field(default_factory=lambda: f"node-{uuid4()}")
    fingerprint: Fingerprint


class Edge(BaseModel):
    source: str
    target: str
    type: RelationType
    score: float
    rationale: Optional[str] = None


class SearchResponse(BaseModel):
    nodes: List[Node]


class TraceResponse(BaseModel):
    path: List[str]


class SimulationRequest(BaseModel):
    id: str
    r0: float = 1.2
    weights: Dict[Channel, float]
    steps: int = 3


class SimulationNode(BaseModel):
    id: str
    parent: str
    step: int
    timestamp: datetime
    channel: Channel


class SimulationResult(BaseModel):
    seeds: Node
    projections: List[SimulationNode]


class Event(BaseModel):
    type: str
    payload: Dict[str, object]


class StakeholderPreset(BaseModel):
    name: str
    description: str
    filters: Dict[str, object]


