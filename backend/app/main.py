from __future__ import annotations

import argparse
import asyncio

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from .api import api_router
from .api.ingest import load_seed
from .config import settings
from .ws.hub import hub

app = FastAPI(title=settings.app_name)
app.include_router(api_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    asyncio.create_task(hub.start())


@app.websocket(settings.websocket_path)
async def websocket_endpoint(websocket: WebSocket) -> None:
    await hub.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        hub.remove(websocket)


async def seed_data() -> None:
    await load_seed()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IIO demo seed loader")
    parser.add_argument("--seed", action="store_true")
    parser.add_argument("--seed-initial", action="store_true")
    args = parser.parse_args()
    if args.seed or args.seed_initial:
        asyncio.run(seed_data())
