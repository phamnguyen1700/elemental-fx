import type { Node } from "../engines/constraint-graph";
import type { Constraint } from "../engines/constraint-graph";
import { Vec3 } from "../core/math/vec3";

export class AnchorConstraint implements Constraint {
  node: Node;
  target: Vec3;
  stiffness: number;

  constructor(node: Node, target: Vec3, stiffness = 1.0) {
    this.node = node;
    this.target = target.clone();
    this.stiffness = stiffness;
  }

  solve(_dt: number, invSubsteps: number): void {
    if (this.node.isPinned && this.stiffness === 1.0) {
      this.node.position.copy(this.target);
      return;
    }

    const diff = new Vec3().subVectors(this.target, this.node.position);
    this.node.position.addScaled(diff, this.stiffness * invSubsteps);
  }
}
