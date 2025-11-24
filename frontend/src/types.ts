export type Channel = 'news' | 'social' | 'blog' | 'pdf';

export interface GraphNode {
  id: string;
  timestamp?: string;
  channel: Channel;
  source: string;
  url?: string;
  text?: string;
  claims?: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'quote' | 'paraphrase' | 'near-duplicate' | 'summary' | 'reference';
  score: number;
  rationale?: string;
}

export interface TimelineBucket {
  date: string;
  value: number;
}

export interface SimulationProjection {
  id: string;
  parent: string;
  step: number;
  timestamp: string;
  channel: Channel;
}

export interface StakeholderPreset {
  name: string;
  description: string;
  filters: Record<string, unknown>;
}

