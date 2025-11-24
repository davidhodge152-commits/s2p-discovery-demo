from backend.app.core.models import Channel, Node
from backend.app.core.models import Channel, Node
from backend.app.services.fingerprint import fingerprinter
from backend.app.services.similarity import compute_similarity


def test_similarity_labels_paraphrase():
    base = Node(
        text="The agency announces new satellite launch next week.",
        source="SpaceWire",
        channel=Channel.news,
        fingerprint=fingerprinter.fingerprint("The agency announces new satellite launch next week."),
        claims=["agency announces new satellite launch"],
    )
    alt = Node(
        text="According to officials, the agency will launch a satellite next week.",
        source="Orbital Blog",
        channel=Channel.blog,
        fingerprint=fingerprinter.fingerprint(
            "According to officials, the agency will launch a satellite next week."
        ),
        claims=["agency will launch a satellite next week"],
    )
    edges = compute_similarity(alt, [base])
    assert edges
    assert edges[0].type.value in {"paraphrase", "near-duplicate"}

