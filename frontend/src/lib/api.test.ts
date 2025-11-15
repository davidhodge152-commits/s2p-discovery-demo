import { describe, expect, it } from 'vitest';
import { useGraphStore } from './api';

describe('graph store', () => {
  it('upserts nodes and edges', () => {
    const store = useGraphStore.getState();
    store.reset({ nodes: [], edges: [] });
    store.upsertNode({ id: 'a', channel: 'news', source: 'Source A' });
    expect(useGraphStore.getState().nodes['a'].source).toBe('Source A');
    store.addEdge({ source: 'a', target: 'b', type: 'summary', score: 0.5 });
    expect(useGraphStore.getState().edges.length).toBe(1);
  });
});
