from __future__ import annotations

import re
from typing import List

import spacy

_nlp = spacy.blank("en")
if "sentencizer" not in _nlp.pipe_names:
    _nlp.add_pipe("sentencizer")

CLAIM_PATTERN = re.compile(
    r"(?P<subject>[A-Z][^.!?]{3,40})\s+(?P<verb>is|are|says|claims|announces|will)\s+(?P<object>[^.!?]{3,80})",
    re.IGNORECASE,
)


def extract_claims(text: str) -> List[str]:
    doc = _nlp(text)
    claims: List[str] = []
    for sent in doc.sents:
        match = CLAIM_PATTERN.search(sent.text)
        if match:
            claims.append(match.group().strip())
    if not claims:
        # fallback to simple noun-verb phrases
        tokens = [t.text for t in doc if not t.is_punct]
        for i in range(len(tokens) - 4):
            window = " ".join(tokens[i : i + 5])
            if re.search(r"(reports|states|confirms|plans)", window, re.IGNORECASE):
                claims.append(window)
    return list(dict.fromkeys(claims))


def extract_quotes(text: str) -> List[str]:
    quotes = re.findall(r"\"([^\"]{10,})\"", text)
    if not quotes:
        quotes = re.findall(r"'([^']{10,})'", text)
    return quotes

