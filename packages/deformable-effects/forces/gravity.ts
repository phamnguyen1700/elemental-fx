import type { Node } from "../engines/constraint-graph";
import type { Force } from "../engines/constraint-graph";
import { Vec3 } from "../core/math/vec3";

export type GravityNodeFilter = (node: Node) => boolean;

export class GravityForce implements Force {
  gravity: Vec3;

  private readonly nodeFilter: GravityNodeFilter | null;

  constructor(
    gravity = new Vec3(0, 9.8, 0),
    nodeFilter: GravityNodeFilter | null = null,
  ) {
    this.gravity = gravity.clone();
    this.nodeFilter = nodeFilter;
  }

  apply(nodes: Node[], dt: number): void {
    const gravityDt = this.gravity.clone().mul(dt);

    for (const node of nodes) {
      if (node.isPinned) {
        continue;
      }

      if (this.nodeFilter && !this.nodeFilter(node)) {
        continue;
      }

      node.position.add(gravityDt);
    }
  }
}
