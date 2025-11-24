import { useEffect } from 'react';
import { fetchNode, useGraphStore } from '../lib/api';
import type { SimulationProjection } from '../types';

interface Props {
  onTrace: (id: string) => void;
  tracePath: string[];
  onSimulate: (id: string) => void;
  simulation: SimulationProjection[];
}

export default function SourcePanel({ onTrace, tracePath, onSimulate, simulation }: Props) {
  const { selectedId, edges, nodes } = useGraphStore((state) => ({
    selectedId: state.selectedNode,
    edges: state.edges,
    nodes: state.nodes
  }));
  const node = selectedId ? nodes[selectedId] : undefined;
  const relevantEdges = edges.filter((edge) => edge.source === selectedId || edge.target === selectedId);

  useEffect(() => {
    if (selectedId) {
      fetchNode(selectedId).catch((error) => console.error('Failed to fetch node', error));
    }
  }, [selectedId]);

  if (!selectedId || !node) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
        <p>Select a node in the graph to inspect its provenance.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-4 p-4 bg-slate-900/60 border-l border-slate-800">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{node.source}</h2>
        <p className="text-xs uppercase tracking-wide text-slate-400">{node.channel}</p>
        {node.url && (
          <a href={node.url} target="_blank" rel="noreferrer" className="text-sky-400 text-sm">
            Open source
          </a>
        )}
        <p className="text-xs text-slate-400 mt-1">
          {node.timestamp ? new Date(node.timestamp).toLocaleString() : 'Timestamp unavailable'}
        </p>
      </div>
      {node.claims && node.claims.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-2">Extracted claims</h3>
          <div className="flex flex-wrap gap-2">
            {node.claims.map((claim) => (
              <span key={claim} className="bg-slate-800/80 px-2 py-1 rounded text-xs text-slate-200">
                {claim}
              </span>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Connections</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          {relevantEdges.map((edge) => {
            const neighborId = edge.source === selectedId ? edge.target : edge.source;
            const neighbor = nodes[neighborId];
            return (
              <li key={`${edge.source}-${edge.target}`} className="border border-slate-800 rounded p-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{edge.type}</span>
                  <span>score {edge.score.toFixed(2)}</span>
                </div>
                <div className="text-slate-100">{neighbor?.source ?? neighborId}</div>
                {edge.rationale && <div className="text-xs text-slate-500">{edge.rationale}</div>}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex gap-2">
        <button
          className="bg-sky-500/80 hover:bg-sky-500 text-white px-3 py-2 rounded text-sm"
          onClick={() => onTrace(selectedId)}
        >
          Trace to Origin
        </button>
        <button
          className="bg-emerald-500/80 hover:bg-emerald-500 text-white px-3 py-2 rounded text-sm"
          onClick={() => onSimulate(selectedId)}
        >
          Simulate Spread
        </button>
      </div>
      {tracePath.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Provenance path</h3>
          <ol className="text-xs text-slate-300 space-y-1">
            {tracePath.map((id) => {
              const item = useGraphStore.getState().nodes[id];
              return (
                <li key={id} className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-slate-500 rounded-full" />
                  <span>{item?.source ?? id}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {simulation.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Projected spread</h3>
          <ul className="text-xs text-slate-300 space-y-1">
            {simulation.map((sim) => (
              <li key={sim.id}>
                Step {sim.step}: {sim.channel} node via {nodes[sim.parent]?.source ?? sim.parent} on{' '}
                {new Date(sim.timestamp).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

