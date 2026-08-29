import type { Node } from "../engines/constraint-graph";
import type { Force } from "../engines/constraint-graph";
import { Vec3 } from "../core/math/vec3";

export class GravityForce implements Force {
  gravity: Vec3;

  constructor(gravity = new Vec3(0, 9.8, 0)) {
    this.gravity = gravity.clone();
  }

  apply(nodes: Node[], dt: number): void {
    const gravityDt = this.gravity.clone().mul(dt);
    for (const node of nodes) {
      if (!node.isPinned) {
        node.position.add(gravityDt);
      }
    }
  }
}
