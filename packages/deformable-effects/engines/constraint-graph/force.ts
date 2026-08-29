import type { Node } from "./node";
import type { SpatialHash } from "../../core/spatial";

export interface ForceContext {
  spatial?: SpatialHash;
}

export interface Force {
  apply(nodes: Node[], dt: number, time: number, context?: ForceContext): void;
}
