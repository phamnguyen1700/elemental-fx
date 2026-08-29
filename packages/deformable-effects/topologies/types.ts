import type { Node } from "../engines/constraint-graph";
import type { Constraint } from "../engines/constraint-graph";

export type NumericProfile<TContext extends object = Record<string, never>> =
  number | ((index: number, total: number, context: TContext) => number);

export interface NodePhysicalConfig<TContext extends object = Record<string, never>> {
  mass?: NumericProfile<TContext>;
  damping?: NumericProfile<TContext>;
  flexibility?: NumericProfile<TContext>;
}

export interface TopologyEdge {
  from: Node;
  to: Node;
  kind?: string;
}

export interface TopologyResult {
  nodes: Node[];
  constraints: Constraint[];
  edges?: TopologyEdge[];
  groups?: Record<string, Node[][]>;
  metadata?: Record<string, unknown>;
}

export function collectEdgeChains(edges: ReadonlyArray<TopologyEdge>): Node[][] {
  if (edges.length === 0) return [];

  const outgoing = new Map<Node, TopologyEdge[]>();
  const incomingCount = new Map<Node, number>();
  for (const edge of edges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge);
    outgoing.set(edge.from, list);
    incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1);
    if (!incomingCount.has(edge.from)) incomingCount.set(edge.from, 0);
  }

  const visited = new Set<TopologyEdge>();
  const chains: Node[][] = [];

  const appendChain = (firstEdge: TopologyEdge) => {
    if (visited.has(firstEdge)) return;
    const chain = [firstEdge.from, firstEdge.to];
    visited.add(firstEdge);
    let current = firstEdge.to;

    while ((incomingCount.get(current) ?? 0) === 1) {
      const nextEdges = outgoing.get(current) ?? [];
      if (nextEdges.length !== 1 || visited.has(nextEdges[0]!)) break;
      const next = nextEdges[0]!;
      visited.add(next);
      chain.push(next.to);
      current = next.to;
    }

    chains.push(chain);
  };

  for (const edge of edges) {
    const fromIncoming = incomingCount.get(edge.from) ?? 0;
    const fromOutgoing = outgoing.get(edge.from)?.length ?? 0;
    if (fromIncoming !== 1 || fromOutgoing !== 1) appendChain(edge);
  }

  for (const edge of edges) appendChain(edge);
  return chains;
}

export function resolveNumericProfile<TContext extends object>(
  profile: NumericProfile<TContext> | undefined,
  fallback: number,
  index: number,
  total: number,
  context: TContext
): number {
  const value = typeof profile === "function" ? profile(index, total, context) : profile;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export type TopologyBuilder = (config: Record<string, unknown>) => TopologyResult;
