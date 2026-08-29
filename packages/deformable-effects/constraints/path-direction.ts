import { Vec3 } from "../core/math/vec3";
import type { Constraint, Node } from "../engines/constraint-graph";

/** Keeps a child direction relative to the live tangent of a path segment. */
export class PathDirectionConstraint implements Constraint {
  readonly root: Node;
  readonly child: Node;
  readonly segmentStart: Node;
  readonly segmentEnd: Node;
  readonly angle: number;
  readonly restLength: number;
  readonly stiffness: number;
  private readonly fallbackTangent: Vec3;

  constructor(
    root: Node,
    child: Node,
    segmentStart: Node,
    segmentEnd: Node,
    angle: number,
    restLength?: number,
    stiffness = 0.15
  ) {
    this.root = root;
    this.child = child;
    this.segmentStart = segmentStart;
    this.segmentEnd = segmentEnd;
    this.angle = angle;
    this.restLength =
      restLength ?? root.restPosition.distanceTo(child.restPosition);
    this.stiffness = clamp01(stiffness);
    this.fallbackTangent = segmentEnd.restPosition
      .clone()
      .sub(segmentStart.restPosition)
      .normalize();
    if (this.fallbackTangent.lengthSq() < 0.0001) {
      this.fallbackTangent.set(1, 0, 0);
    }
  }

  getTarget(): Vec3 {
    const tangent = this.segmentEnd.position
      .clone()
      .sub(this.segmentStart.position);
    if (tangent.lengthSq() < 0.0001) tangent.copy(this.fallbackTangent);
    else tangent.normalize();

    const cosine = Math.cos(this.angle);
    const sine = Math.sin(this.angle);
    const direction = new Vec3(
      tangent.x * cosine - tangent.y * sine,
      tangent.x * sine + tangent.y * cosine,
      tangent.z
    ).normalize();
    return this.root.position.clone().addScaled(direction, this.restLength);
  }

  solve(_dt: number, invSubsteps: number): void {
    if (this.child.invMass === 0) return;
    const correction = this.getTarget().sub(this.child.position);
    this.child.position.addScaled(correction, this.stiffness * invSubsteps);
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
