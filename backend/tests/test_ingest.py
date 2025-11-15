from datetime import datetime

from backend.app.core.models import Channel


def test_ingest_text_creates_node(client):
    payload = {
        "text": "City council says the bridge is safe and will reopen tomorrow.",
        "source_name": "City Gazette",
        "channel": Channel.news.value,
    }
    response = client.post("/api/ingest/text", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "City Gazette"
    assert "claims" in data


def test_seed_load(client):
    response = client.get("/api/ingest/seed/load")
    # seed data may not exist during tests but should respond gracefully
    if response.status_code == 404:
        assert response.json()["detail"].startswith("Seed data not found")
    else:
        assert response.status_code == 200

