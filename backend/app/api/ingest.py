from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from ..config import settings
from ..core.bus import bus
from ..core.models import Channel, Edge, Event, Node, NodeCreate, RelationType
from ..core.store import store
from ..services.extract import extract_claims
from ..services.fingerprint import fingerprinter
from ..services.similarity import compute_similarity
from ..services.graph_builder import timeline_buckets

router = APIRouter()


async def _persist_node(data: NodeCreate) -> Node:
    timestamp = data.timestamp or datetime.utcnow()
    fingerprint_data = fingerprinter.fingerprint(data.text)
    claims = data.claims or extract_claims(data.text)
    payload = data.model_dump(exclude={"timestamp"}, exclude_none=True)
    if not data.id and "id" in payload:
        payload.pop("id")
    node = Node(
        **payload,
        timestamp=timestamp,
        fingerprint=fingerprint_data,
        claims=claims,
    )
    store.upsert_node(node)
    await bus.publish(Event(type="node", payload=node.model_dump()))
    await bus.publish(Event(type="metric", payload={"timeline": timeline_buckets()}))

    existing = [n for n in store.nodes.values() if n.id != node.id]
    edges = compute_similarity(node, existing)
    for edge in edges:
        store.add_edge(edge)
        await bus.publish(Event(type="edge", payload=edge.model_dump()))
    return node


@router.post("/url")
async def ingest_url(payload: Dict[str, Any]) -> Dict[str, Any]:
    url = payload.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="url is required")
    text = f"Fetched content for {url}."
    node = await _persist_node(
        NodeCreate(
            text=text,
            source=payload.get("source_name", url),
            channel=Channel(payload.get("channel", Channel.news)),
            url=url,
        )
    )
    return node.model_dump()


@router.post("/text")
async def ingest_text(payload: Dict[str, Any]) -> Dict[str, Any]:
    text = payload.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    node = await _persist_node(
        NodeCreate(
            id=payload.get("id"),
            text=text,
            source=payload.get("source_name", "Ad-hoc submission"),
            channel=Channel(payload.get("channel", Channel.blog)),
            url=payload.get("url"),
        )
    )
    return node.model_dump()


@router.get("/seed/load")
async def load_seed() -> Dict[str, Any]:
    data_dir = Path(settings.seed_data_dir)
    if not data_dir.exists():
        raise HTTPException(status_code=404, detail="Seed data not found")
    items_path = data_dir / "seed_items.json"
    if not items_path.exists():
        raise HTTPException(status_code=404, detail="seed_items.json missing")

    with items_path.open() as fh:
        items = json.load(fh)
    created: List[str] = []
    for item in items:
        node = NodeCreate(
            id=item.get("id"),
            text=item["text"],
            source=item["source"],
            channel=Channel(item["channel"]),
            url=item.get("url"),
            timestamp=datetime.fromisoformat(item["timestamp"]),
            claims=item.get("claims"),
        )
        new_node = await _persist_node(node)
        created.append(new_node.id)

    pairs_path = data_dir / "seed_pairs.jsonl"
    if pairs_path.exists():
        with pairs_path.open() as fh:
            for line in fh:
                rec = json.loads(line)
                relation = RelationType(rec["relation"])
                score = rec.get("score", 0.6)
                if not store.get_node(rec["ancestor_id"]) or not store.get_node(rec["descendant_id"]):
                    continue
                edge = Edge(
                    source=rec["ancestor_id"],
                    target=rec["descendant_id"],
                    type=relation,
                    score=score,
                    rationale=rec.get("rationale"),
                )
                store.add_edge(edge)
                await bus.publish(Event(type="edge", payload=edge.model_dump()))
    return {"created": created}


