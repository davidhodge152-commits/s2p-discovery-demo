from __future__ import annotations

from typing import Iterable, List

from sklearn.metrics.pairwise import cosine_similarity

from ..config import settings
from ..core.models import Edge, Node, RelationType
from .fingerprint import fingerprinter


def jaccard(a: Iterable[str], b: Iterable[str]) -> float:
    set_a = set(a)
    set_b = set(b)
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)


def compute_similarity(new_node: Node, candidates: List[Node]) -> List[Edge]:
    texts = [new_node.text] + [node.text for node in candidates]
    fingerprinter.update_vectorizer([node.text for node in candidates] + [new_node.text])
    vectors = fingerprinter.vectorizer.transform(texts)
    cosines = cosine_similarity(vectors[0:1], vectors[1:]).flatten()
    edges: List[Edge] = []
    new_shingles = new_node.fingerprint.shingles

    for idx, candidate in enumerate(candidates):
        cosine = float(cosines[idx])
        jaccard_score = jaccard(new_shingles, candidate.fingerprint.shingles)
        relation = classify_relation(new_node, candidate, cosine, jaccard_score)
        if relation is None:
            continue
        rationale = f"cosine={cosine:.2f}, jaccard={jaccard_score:.2f}"
        edges.append(
            Edge(
                source=candidate.id,
                target=new_node.id,
                type=relation,
                score=max(cosine, jaccard_score),
                rationale=rationale,
            )
        )
    return edges


def classify_relation(
    new_node: Node, candidate: Node, cosine: float, jaccard_score: float
) -> RelationType | None:
    if cosine >= settings.near_duplicate_threshold:
        return RelationType.near_duplicate
    if cosine >= settings.paraphrase_threshold and jaccard_score >= settings.jaccard_threshold:
        return RelationType.paraphrase
    if cosine >= settings.summary_threshold and len(new_node.text) <= settings.summary_length_ratio * len(candidate.text):
        return RelationType.summary
    for q in candidate.text.split("\n"):
        if len(q) > 40 and q in new_node.text:
            return RelationType.quote
    if candidate.url and candidate.url in new_node.text:
        return RelationType.reference
    return None


