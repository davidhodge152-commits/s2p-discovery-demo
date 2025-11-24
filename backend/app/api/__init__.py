from fastapi import APIRouter

from .ingest import router as ingest_router
from .graph import router as graph_router
from .search import router as search_router

api_router = APIRouter()
api_router.include_router(ingest_router, prefix="/ingest", tags=["ingest"])
api_router.include_router(graph_router, prefix="/graph", tags=["graph"])
api_router.include_router(search_router, prefix="/graph", tags=["search"])
