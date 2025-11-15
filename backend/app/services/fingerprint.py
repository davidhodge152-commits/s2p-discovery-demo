from __future__ import annotations

from typing import Iterable, List

from datasketch import MinHash
from sklearn.feature_extraction.text import TfidfVectorizer

from ..config import settings


class FingerprintService:
    def __init__(self) -> None:
        self.vectorizer = TfidfVectorizer(stop_words="english")
        self.corpus: List[str] = []

    @staticmethod
    def shingles(text: str, size: int = 5) -> List[str]:
        tokens = [tok.lower() for tok in text.split() if tok.strip()]
        return [" ".join(tokens[i : i + size]) for i in range(len(tokens) - size + 1)]

    def minhash(self, shingles: Iterable[str]) -> List[int]:
        m = MinHash(num_perm=settings.minhash_num_perm)
        for shingle in shingles:
            m.update(shingle.encode("utf-8"))
        return list(m.hashvalues)

    def fingerprint(self, text: str) -> dict:
        shingles = self.shingles(text)
        minhash = self.minhash(shingles)
        return {"shingles": shingles, "minhash": minhash}

    def update_vectorizer(self, texts: List[str]) -> None:
        self.corpus = texts
        if not texts:
            return
        self.vectorizer.fit(texts)

    def vectorize(self, texts: List[str]):
        if not self.corpus:
            self.update_vectorizer(texts)
        return self.vectorizer.transform(texts)


fingerprinter = FingerprintService()
