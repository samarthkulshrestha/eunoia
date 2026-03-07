export interface Interest {
  id: string;
  name: string;
  description: string | null;
  depth: number;
  source: string;
  color: string | null;
  parentId: string | null;
  posX: number;
  posY: number;
  posZ: number;
  children: Interest[];
  resources: Resource[];
  edgesFrom: (Edge & { to: Interest })[];
  edgesTo: (Edge & { from: Interest })[];
  // Knowledge tree (cached)
  foundations: KnowledgeDimension | null;
  taxonomy: KnowledgeDimension | null;
  thinkers: KnowledgeDimension | null;
  culturalImpact: KnowledgeDimension | null;
  adjacentSurprises: KnowledgeDimension | null;
  controversies: KnowledgeDimension | null;
}

export interface Edge {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  strength: number;
}

export interface Resource {
  id: string;
  type: string;
  title: string;
  author: string | null;
  url: string | null;
  why: string | null;
  detail: string | null;
  dismissed: boolean;
  upvoted: boolean;
}

export interface KnowledgeDimension {
  summary: string;
  items: KnowledgeItem[];
}

export interface KnowledgeItem {
  name: string;
  description: string;
  depth?: string;
  children?: string[];
  works?: string[];
}

export interface BridgeResult {
  bridgeThesis?: string;
  bridges: Interest[];
  cached: boolean;
}
