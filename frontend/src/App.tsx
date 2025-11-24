import { useEffect, useMemo, useState } from 'react';
import GraphView from './components/GraphView';
import Timeline from './components/Timeline';
import SourcePanel from './components/SourcePanel';
import Filters from './components/Filters';
import StakeholderTabs from './components/StakeholderTabs';
import { fetchGraph, fetchTrace, openWebSocket, simulateSpread, stakeholderPresets, useGraphStore } from './lib/api';
import type { Channel, SimulationProjection } from './types';

const defaultChannels: Channel[] = ['news', 'social', 'blog', 'pdf'];

export default function App() {
  const [channels, setChannels] = useState<Set<string>>(new Set(defaultChannels));
  const [minScore, setMinScore] = useState(0.3);
  const [range, setRange] = useState<[Date | undefined, Date | undefined]>([undefined, undefined]);
  const [tracePath, setTracePath] = useState<string[]>([]);
  const [simulation, setSimulation] = useState<SimulationProjection[]>([]);
  const [activePreset, setActivePreset] = useState('Journalist');
  const [onboarding, setOnboarding] = useState(true);

  useEffect(() => {
    fetchGraph();
    const ws = openWebSocket();
    return () => ws.close();
  }, []);

  useEffect(() => {
    const preset = stakeholderPresets.find((p) => p.name === activePreset);
    if (!preset) return;
    if (preset.filters.channels) {
      setChannels(new Set(preset.filters.channels as string[]));
    }
    if (preset.filters.emphasis === 'origin') {
      setMinScore(0.25);
    } else if (preset.filters.emphasis === 'velocity') {
      setMinScore(0.2);
    } else {
      setMinScore(0.3);
    }
  }, [activePreset]);

  const filter = useMemo(() => ({
    channels,
    minDate: range[0],
    maxDate: range[1],
    minScore
  }), [channels, range, minScore]);

  const handleToggle = (channel: Channel) => {
    const next = new Set(channels);
    if (next.has(channel)) {
      next.delete(channel);
    } else {
      next.add(channel);
    }
    setChannels(next);
  };

  const handleTrace = async (id: string) => {
    const path = await fetchTrace(id);
    setTracePath(path);
  };

  const handleSimulate = async (id: string) => {
    const result = await simulateSpread({
      id,
      r0: 1.4,
      weights: { news: 1, social: 2, blog: 1, pdf: 0 } as Record<string, number>,
      steps: 3
    });
    setSimulation(result);
  };

  const highlightedPath = tracePath;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="px-8 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Information Integrity Observatory</h1>
          <p className="text-sm text-slate-400">
            Mapping provenance, transformations, and spread—never adjudicating truth.
          </p>
        </div>
        <StakeholderTabs activePreset={activePreset} onSelect={setActivePreset} />
      </header>
      <main className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-slate-800 p-4 overflow-y-auto bg-slate-900/60">
          <Filters activeChannels={channels} onChannelToggle={handleToggle} minScore={minScore} onScoreChange={setMinScore} />
        </aside>
        <section className="flex-1 grid grid-rows-[auto_160px]">
          <div className="relative min-h-[520px]">
            <GraphView filter={filter} highlightedPath={highlightedPath} />
            {simulation.length > 0 && (
              <div className="absolute top-4 right-4 bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 px-3 py-2 rounded text-xs">
                Simulation overlays {simulation.length} projected nodes.
              </div>
            )}
          </div>
          <div className="border-t border-slate-800 bg-slate-900/60 p-4">
            <Timeline onRangeChange={(min, max) => setRange([min, max])} activeRange={range} />
          </div>
        </section>
        <aside className="w-96">
          <SourcePanel onTrace={handleTrace} tracePath={tracePath} onSimulate={handleSimulate} simulation={simulation} />
        </aside>
      </main>
      {onboarding && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur flex items-center justify-center z-50">
          <div className="max-w-xl space-y-4 text-center p-8 bg-slate-900 border border-slate-700 rounded">
            <h2 className="text-xl font-semibold">Welcome to the Information Integrity Observatory</h2>
            <p className="text-sm text-slate-300">
              This demo traces where narratives originate and how they transform as they spread across channels.
            </p>
            <ol className="text-left text-sm text-slate-300 space-y-2">
              <li>1. Load the seeded narratives via <code>make seed</code> or ingest your own text.</li>
              <li>2. Use the graph and timeline to filter by channel and time, highlighting provenance paths.</li>
              <li>3. Simulate hypothetical spread to explore potential future propagation.</li>
            </ol>
            <button
              className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded"
              onClick={() => setOnboarding(false)}
            >
              Start exploring
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

