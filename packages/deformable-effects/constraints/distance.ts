import type { Node } from "../engines/constraint-graph";
import type { Constraint } from "../engines/constraint-graph";
import { Vec3 } from "../core/math/vec3";

export class DistanceConstraint implements Constraint {
  nodeA: Node;
  nodeB: Node;
  restLength: number;
  stiffness: number;

  constructor(nodeA: Node, nodeB: Node, restLength?: number, stiffness = 1.0) {
    this.nodeA = nodeA;
    this.nodeB = nodeB;
    this.restLength = restLength ?? nodeA.position.distanceTo(nodeB.position);
    this.stiffness = stiffness;
  }

  solve(_dt: number, invSubsteps: number): void {
    const wA = this.nodeA.invMass;
    const wB = this.nodeB.invMass;
    const wSum = wA + wB;

    if (wSum === 0) return;

    const delta = new Vec3().subVectors(this.nodeB.position, this.nodeA.position);
    const len = delta.length();

    if (len < 1e-6) return;

    const error = len - this.restLength;
    const correction = (error / len) * this.stiffness * invSubsteps;
    const correctionVector = delta.mul(correction);

    if (wA > 0) {
      this.nodeA.position.addScaled(correctionVector, wA / wSum);
    }
    if (wB > 0) {
      this.nodeB.position.addScaled(correctionVector, -wB / wSum);
    }
  }
}
