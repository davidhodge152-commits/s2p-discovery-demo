from backend.app.core.models import Channel
from backend.app.services.graph_builder import provenance_breadcrumb


def test_trace_to_origin_simple(client):
    response = client.post(
        "/api/ingest/text",
        json={
            "text": "Reporter says the festival opens Friday night.",
            "source_name": "Metro News",
            "channel": Channel.news.value,
        },
    )
    node_id = response.json()["id"]
    path = provenance_breadcrumb(node_id)
    assert node_id in path

