import type { Node } from "../engines/constraint-graph";
import type { Constraint } from "../engines/constraint-graph";
import { Vec3 } from "../core/math/vec3";

export class PlaneConstraint implements Constraint {
  node: Node;
  normal: Vec3;
  distance: number; // distance from origin to plane along normal
  restitution: number;

  constructor(node: Node, normal: Vec3, distance = 0, restitution = 0.0) {
    this.node = node;
    this.normal = normal.clone().normalize();
    this.distance = distance;
    this.restitution = restitution;
  }

  solve(): void {
    if (this.node.isPinned) return;

    const d = this.node.position.dot(this.normal) - this.distance;

    // Penetrating the plane?
    if (d < 0) {
      // Move to surface
      this.node.position.addScaled(this.normal, -d);

      // Apply restitution to velocity (reflected in previous position)
      if (this.restitution > 0) {
        const vel = new Vec3().subVectors(this.node.position, this.node.previousPosition);
        const vn = vel.dot(this.normal);
        if (vn < 0) {
          // Add velocity correction to previous position
          const impulse = this.normal.clone().mul(vn * (1 + this.restitution));
          this.node.previousPosition.add(impulse);
        }
      }
    }
  }
}
