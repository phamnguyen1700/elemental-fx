import type { Node } from "../engines/constraint-graph";
import type { Constraint } from "../engines/constraint-graph";
import { Vec3 } from "../core/math/vec3";

export class AngularConstraint implements Constraint {
  nodeA: Node; // parent
  nodeB: Node; // child
  restDir: Vec3;
  restLength: number;
  stiffness: number;

  constructor(nodeA: Node, nodeB: Node, restDir?: Vec3, restLength?: number, stiffness = 0.5) {
    this.nodeA = nodeA;
    this.nodeB = nodeB;

    if (restDir) {
      this.restDir = restDir.clone().normalize();
    } else {
      const delta = new Vec3().subVectors(nodeB.restPosition, nodeA.restPosition);
      this.restDir = delta.clone().normalize();
    }

    this.restLength = restLength ?? nodeA.restPosition.distanceTo(nodeB.restPosition);
    this.stiffness = stiffness;
  }

  solve(_dt: number, invSubsteps: number): void {
    const wB = this.nodeB.invMass;
    if (wB === 0) return; // if child is pinned, can't correct

    // The target position of B based purely on A's position and the rest direction
    const targetB = this.nodeA.position.clone().addScaled(this.restDir, this.restLength);

    // We only pull B towards targetB. A is considered the anchor for this angle.
    // Full angular constraint would also torque A, but XPBD often uses simple directional pull.
    const diff = new Vec3().subVectors(targetB, this.nodeB.position);
    this.nodeB.position.addScaled(diff, this.stiffness * invSubsteps);
  }
}
