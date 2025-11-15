from __future__ import annotations

import asyncio
from typing import List

from fastapi import WebSocket

from ..core.bus import bus
from ..core.models import Event


class WebSocketHub:
    def __init__(self) -> None:
        self.connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.append(websocket)

    def remove(self, websocket: WebSocket) -> None:
        if websocket in self.connections:
            self.connections.remove(websocket)

    async def broadcast(self, event: Event) -> None:
        disconnected: List[WebSocket] = []
        for connection in self.connections:
            try:
                await connection.send_json(event.model_dump())
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.remove(conn)

    async def start(self) -> None:
        async for event in bus.subscribe():
            await self.broadcast(event)


hub = WebSocketHub()
