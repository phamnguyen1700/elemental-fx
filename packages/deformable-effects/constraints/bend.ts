import type { Node } from "../engines/constraint-graph";
import { DistanceConstraint } from "./distance";

// A bend constraint preserves the chord between node i-1 and i+1.
export class BendConstraint extends DistanceConstraint {
  constructor(nodeA: Node, nodeC: Node, restLength?: number, stiffness = 0.5) {
    super(nodeA, nodeC, restLength, stiffness);
  }
}
