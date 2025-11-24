from __future__ import annotations

from typing import Dict

from fastapi import APIRouter, Query

from ..core.store import store

router = APIRouter()


@router.get("/search")
async def search(q: str = Query(..., min_length=2)) -> Dict[str, object]:
    results = store.search(lambda node: q.lower() in node.text.lower())
    return {"results": [node.model_dump() for node in results]}


