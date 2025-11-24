import { useMemo } from 'react';
import { useGraphStore } from '../lib/api';
import type { Channel } from '../types';

interface Props {
  activeChannels: Set<string>;
  onChannelToggle: (channel: Channel) => void;
  minScore: number;
  onScoreChange: (score: number) => void;
}

const channelOrder: Channel[] = ['news', 'social', 'blog', 'pdf'];

export default function Filters({ activeChannels, onChannelToggle, minScore, onScoreChange }: Props) {
  const nodes = useGraphStore((state) => state.nodes);

  const counts = useMemo(() => {
    return channelOrder.reduce<Record<string, number>>((acc, channel) => {
      acc[channel] = Object.values(nodes).filter((node) => node.channel === channel).length;
      return acc;
    }, {});
  }, [nodes]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Channels</h3>
        <div className="mt-3 flex flex-col gap-2">
          {channelOrder.map((channel) => (
            <label key={channel} className="flex items-center gap-2 text-slate-300 text-sm">
              <input
                type="checkbox"
                checked={activeChannels.has(channel)}
                onChange={() => onChannelToggle(channel)}
                className="accent-sky-400"
              />
              <span className="capitalize">{channel}</span>
              <span className="ml-auto text-xs text-slate-500">{counts[channel] ?? 0}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Edge score</h3>
        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={minScore}
            onChange={(event) => onScoreChange(parseFloat(event.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0</span>
            <span>{minScore.toFixed(2)}</span>
            <span>1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

