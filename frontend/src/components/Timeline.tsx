import { useMemo } from 'react';
import * as d3 from 'd3';
import { useGraphStore } from '../lib/api';

interface Props {
  onRangeChange: (min?: Date, max?: Date) => void;
  activeRange: [Date | undefined, Date | undefined];
}

export default function Timeline({ onRangeChange, activeRange }: Props) {
  const timeline = useGraphStore((state) => state.timeline);

  const buckets = useMemo(() => {
    return Object.entries(timeline)
      .map(([date, value]) => ({ date: new Date(date), value }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [timeline]);

  const width = 600;
  const height = 120;
  const margin = { top: 10, right: 20, bottom: 30, left: 30 };

  const x = d3
    .scaleBand()
    .domain(buckets.map((b) => b.date.toISOString()))
    .range([margin.left, width - margin.right])
    .padding(0.2);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(buckets, (d) => d.value) ?? 5])
    .nice()
    .range([height - margin.bottom, margin.top]);

  return (
    <div className="w-full">
      <svg width={width} height={height}>
        {buckets.map((bucket) => {
          const isActive =
            (!activeRange[0] || bucket.date >= activeRange[0]) &&
            (!activeRange[1] || bucket.date <= activeRange[1]);
          return (
            <rect
              key={bucket.date.toISOString()}
              x={x(bucket.date.toISOString())}
              y={y(bucket.value)}
              width={x.bandwidth()}
              height={y(0) - y(bucket.value)}
              fill={isActive ? '#60a5fa' : '#1e293b'}
              rx={4}
              onClick={() => {
                const rangeStart = new Date(bucket.date);
                const rangeEnd = new Date(bucket.date);
                rangeEnd.setHours(23, 59, 59);
                onRangeChange(rangeStart, rangeEnd);
              }}
            />
          );
        })}
        <g transform={`translate(0,${height - margin.bottom})`}>
          {buckets.map((bucket) => (
            <text
              key={`label-${bucket.date.toISOString()}`}
              x={(x(bucket.date.toISOString()) ?? 0) + x.bandwidth() / 2}
              y={20}
              textAnchor="middle"
              className="fill-slate-300 text-xs"
            >
              {bucket.date.toISOString().split('T')[0].slice(5)}
            </text>
          ))}
        </g>
      </svg>
      <div className="flex items-center gap-3 text-xs text-slate-300 mt-2">
        <button
          className="bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded"
          onClick={() => onRangeChange(undefined, undefined)}
        >
          Reset Range
        </button>
        {activeRange[0] && activeRange[1] && (
          <span>
            Showing {activeRange[0].toISOString().slice(0, 10)} →{' '}
            {activeRange[1].toISOString().slice(0, 10)}
          </span>
        )}
      </div>
    </div>
  );
}

