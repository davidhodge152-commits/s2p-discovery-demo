# Architecture

```mermaid
flowchart LR
    subgraph Client
        A[React App]
        B[D3 Graph]
        C[Timeline]
    end
    subgraph FastAPI Backend
        D[API Routers]
        E[Event Bus]
        F[In-memory Store]
        G[Similarity + Fingerprint]
        H[NetworkX Graph]
    end
    subgraph Data
        I[Seed JSON/JSONL]
        J[Optional Neo4j]
    end

    A -->|REST /api| D
    A -->|WebSocket /ws| E
    D --> F
    D --> G
    G --> F
    F --> H
    H --> D
    E --> A
    I --> D
    F --> J
```

The frontend requests the initial graph and timeline data via REST and maintains live updates from the event bus over WebSockets. Ingestion flows fingerprint text with shingling + MinHash, evaluates similarity, and persists nodes/edges in the in-memory store while also updating the NetworkX graph representation.
