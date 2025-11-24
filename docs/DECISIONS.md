# Architectural Decisions

## Fingerprinting strategy
We use lightweight 5-gram shingles with MinHash signatures to quickly narrow similarity candidates. TF-IDF cosine scoring (scikit-learn) refines relation labels without needing heavyweight embeddings, ensuring deterministic performance in Codespaces.

## spaCy configuration
Instead of relying on pre-trained models, we bootstrap a blank English pipeline with a sentencizer and regex-driven claim extraction. This keeps the container lean, avoids download issues, and still highlights narrative statements.

## Storage choice
An in-memory store backed by NetworkX keeps the demo fast. A placeholder Neo4j adapter communicates how to extend the system without requiring a running graph database.

## WebSocket event bus
A minimal asyncio-based event bus fans out ingestion updates and simulation projections to all connected clients. This avoids external dependencies like Kafka while still showcasing streaming updates.

## Frontend stack
Vite + React + Tailwind deliver quick iteration speed. D3 renders the force-directed graph and timeline so the visualization remains responsive even with frequent updates.
