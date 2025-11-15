from __future__ import annotations

import asyncio
from typing import AsyncIterator, Dict, List

from .models import Event


class EventBus:
    def __init__(self) -> None:
        self._queue: "asyncio.Queue[Event]" = asyncio.Queue()
        self._subscribers: List[asyncio.Queue[Event]] = []

    async def publish(self, event: Event) -> None:
        await self._queue.put(event)
        for sub in list(self._subscribers):
            await sub.put(event)

    async def subscribe(self) -> AsyncIterator[Event]:
        queue: "asyncio.Queue[Event]" = asyncio.Queue()
        self._subscribers.append(queue)
        try:
            while True:
                event = await queue.get()
                yield event
        finally:
            self._subscribers.remove(queue)

    async def pump(self) -> None:
        while True:
            event = await self._queue.get()
            for sub in list(self._subscribers):
                await sub.put(event)


bus = EventBus()
