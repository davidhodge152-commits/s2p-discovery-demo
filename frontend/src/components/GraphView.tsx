import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useGraphStore } from '../lib/api';
import type { GraphNode } from '../types';

interface Props {
  filter: {
    channels: Set<string>;
    minDate?: Date;
    maxDate?: Date;
    minScore: number;
  };
  highlightedPath: string[];
}

const channelColor: Record<string, string> = {
  news: '#60a5fa',
  social: '#fb923c',
  blog: '#34d399',
  pdf: '#c084fc'
};

export default function GraphView({ filter, highlightedPath }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const nodes = Object.values(useGraphStore((state) => state.nodes));
  const edges = useGraphStore((state) => state.edges);
  const setSelected = useGraphStore((state) => state.setSelected);
  const selected = useGraphStore((state) => state.selectedNode);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;
    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();
    const width = svgElement.clientWidth || 700;
    const height = svgElement.clientHeight || 520;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const filteredNodes = nodes.filter((node) => {
      const date = node.timestamp ? new Date(node.timestamp) : undefined;
      if (filter.channels.size && !filter.channels.has(node.channel)) return false;
      if (filter.minDate && date && date < filter.minDate) return false;
      if (filter.maxDate && date && date > filter.maxDate) return false;
      return true;
    });
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = edges.filter(
      (edge) =>
        nodeIds.has(edge.source) &&
        nodeIds.has(edge.target) &&
        edge.score >= filter.minScore
    );

    const sim = d3
      .forceSimulation(filteredNodes as any)
      .force('link', d3.forceLink(filteredEdges as any).id((d: any) => d.id).distance(140))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2));

    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#64748b');

    const link = svg
      .append('g')
      .attr('stroke', '#64748b')
      .attr('stroke-opacity', 0.4)
      .selectAll('line')
      .data(filteredEdges)
      .join('line')
      .attr('stroke-width', (d) => 2 + d.score * 2)
      .attr('stroke-dasharray', (d) => (d.type === 'summary' ? '4 2' : ''))
      .attr('marker-end', 'url(#arrow)');

    const node = svg
      .append('g')
      .attr('stroke', '#1f2937')
      .selectAll('circle')
      .data(filteredNodes)
      .join('circle')
      .attr('r', (d) => (highlightedPath.includes(d.id) ? 14 : 10))
      .attr('fill', (d) => channelColor[d.channel] || '#facc15')
      .attr('stroke-width', (d) => (d.id === selected ? 3 : 1.5))
      .call(
        d3
          .drag<SVGCircleElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            (d as any).fx = d.x;
            (d as any).fy = d.y;
          })
          .on('drag', (event, d) => {
            (d as any).fx = event.x;
            (d as any).fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            (d as any).fx = null;
            (d as any).fy = null;
          })
      )
      .on('click', (_, d) => {
        setSelected(d.id);
      })
      .append('title')
      .text((d) => `${d.source}\n${d.timestamp ?? 'No timestamp'}`);

    sim.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      svg
        .selectAll('circle')
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);
    });

    return () => {
      sim.stop();
    };
  }, [
    nodes,
    edges,
    Array.from(filter.channels).join(','),
    filter.minDate?.getTime(),
    filter.maxDate?.getTime(),
    filter.minScore,
    highlightedPath.join(','),
    selected,
    setSelected
  ]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

