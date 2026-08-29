import { Vec3 } from "../core/math/vec3";
import type { Constraint, Node } from "../engines/constraint-graph";

/** Keeps a carrier at a normalized position on a moving segment. */
export class SegmentAttachmentConstraint implements Constraint {
  readonly carrier: Node;
  readonly segmentStart: Node;
  readonly segmentEnd: Node;
  readonly t: number;
  readonly stiffness: number;

  constructor(
    carrier: Node,
    segmentStart: Node,
    segmentEnd: Node,
    t: number,
    stiffness = 1
  ) {
    this.carrier = carrier;
    this.segmentStart = segmentStart;
    this.segmentEnd = segmentEnd;
    this.t = clamp01(t);
    this.stiffness = clamp01(stiffness);
  }

  getTarget(): Vec3 {
    return this.segmentStart.position.clone().lerp(this.segmentEnd.position, this.t);
  }

  solve(_dt: number, invSubsteps: number): void {
    const correction = this.getTarget().sub(this.carrier.position);
    this.carrier.position.addScaled(correction, this.stiffness * invSubsteps);
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
