import axios from 'axios';
import { create } from 'zustand';
import type { GraphEdge, GraphNode, SimulationProjection, StakeholderPreset } from '../types';

const client = axios.create({ baseURL: '/api' });

export interface GraphState {
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
  timeline: Record<string, number>;
  selectedNode?: string;
  setSelected: (id?: string) => void;
  upsertNode: (node: GraphNode) => void;
  addEdge: (edge: GraphEdge) => void;
  reset: (payload: { nodes: GraphNode[]; edges: GraphEdge[] }) => void;
  setTimeline: (timeline: Record<string, number>) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  nodes: {},
  edges: [],
  timeline: {},
  selectedNode: undefined,
  setSelected: (id) => set({ selectedNode: id }),
  upsertNode: (node) => set((state) => ({
    nodes: { ...state.nodes, [node.id]: { ...state.nodes[node.id], ...node } }
  })),
  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges.filter((e) => !(e.source === edge.source && e.target === edge.target)), edge]
    })),
  reset: ({ nodes, edges }) =>
    set({
      nodes: nodes.reduce<Record<string, GraphNode>>((acc, node) => {
        acc[node.id] = node;
        return acc;
      }, {}),
      edges
    }),
  setTimeline: (timeline) => set({ timeline })
}));

export async function fetchGraph() {
  const [graphRes, timelineRes] = await Promise.all([
    client.get('/graph/graph'),
    client.get('/graph/timeline')
  ]);
  useGraphStore.getState().reset(graphRes.data);
  useGraphStore.getState().setTimeline(timelineRes.data);
}

export async function fetchNode(nodeId: string) {
  const res = await client.get(`/graph/node/${nodeId}`);
  const node: GraphNode = res.data.node;
  useGraphStore.getState().upsertNode(node);
  return res.data;
}

export async function fetchTrace(nodeId: string) {
  const res = await client.get(`/graph/trace/${nodeId}`);
  return res.data.path as string[];
}

export async function simulateSpread(params: {
  id: string;
  r0: number;
  weights: Record<string, number>;
  steps: number;
}): Promise<SimulationProjection[]> {
  const res = await client.post('/graph/simulate', params);
  return res.data.projections;
}

export const stakeholderPresets: StakeholderPreset[] = [
  {
    name: 'Journalist',
    description: 'Highlights earliest sources and quote chains.',
    filters: { emphasis: 'origin' }
  },
  {
    name: 'Platform',
    description: 'Focuses on velocity and social amplification.',
    filters: { emphasis: 'velocity', channels: ['social', 'news'] }
  },
  {
    name: 'Civil Society',
    description: 'Surface community impact and references.',
    filters: { emphasis: 'community', edgeTypes: ['reference', 'summary'] }
  },
  {
    name: 'Enterprise/Gov',
    description: 'Shows supply chain + resilience metrics.',
    filters: { emphasis: 'resilience' }
  }
];

export function openWebSocket() {
  const origin = window.location.origin;
  const protocol = origin.startsWith('https') ? 'wss' : 'ws';
  const host = origin.replace(/^https?:\/\//, '');
  const ws = new WebSocket(`${protocol}://${host}/ws`);
  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === 'node') {
        useGraphStore.getState().upsertNode(payload.payload as GraphNode);
      }
      if (payload.type === 'edge') {
        useGraphStore.getState().addEdge(payload.payload as GraphEdge);
      }
      if (payload.type === 'metric' && payload.payload.timeline) {
        useGraphStore.getState().setTimeline(payload.payload.timeline as Record<string, number>);
      }
    } catch (error) {
      console.error('WS message parse failed', error);
    }
  };
  return ws;
}

