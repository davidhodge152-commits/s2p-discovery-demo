import asyncio
from typing import Generator

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.fingerprint import fingerprinter
from backend.app.core.store import store


@pytest.fixture(autouse=True)
def reset_state() -> Generator[None, None, None]:
    store.nodes.clear()
    store.edges.clear()
    store.graph.clear()
    fingerprinter.corpus = []
    yield


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as client:
        yield client

