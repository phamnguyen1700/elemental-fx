import type { Node } from "../engines/constraint-graph";
import type { Force } from "../engines/constraint-graph";
import type { Vec3 } from "../core/math/vec3";

export class FlowFieldForce implements Force {
  // A generic function that takes position and time, returns a force vector
  sampleFn: (position: Vec3, time: number) => Vec3;

  constructor(sampleFn: (position: Vec3, time: number) => Vec3) {
    this.sampleFn = sampleFn;
  }

  apply(nodes: Node[], dt: number, time: number): void {
    for (const node of nodes) {
      if (node.isPinned) continue;
      const flow = this.sampleFn(node.position, time);
      node.position.addScaled(flow, dt);
    }
  }
}
