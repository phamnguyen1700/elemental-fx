import type { Node } from "../engines/constraint-graph";
import type { Force } from "../engines/constraint-graph";
import { Vec3 } from "../core/math/vec3";

export class AttractorForce implements Force {
  source: Vec3 | ((time: number) => Vec3);
  radius: number;
  strength: number; // Positive attracts, negative repels

  constructor(source: Vec3 | ((time: number) => Vec3), radius = 100, strength = 1.0) {
    this.source = source instanceof Vec3 ? source.clone() : source;
    this.radius = radius;
    this.strength = strength;
  }

  apply(nodes: Node[], dt: number, time: number): void {
    const r2 = this.radius * this.radius;
    const source = this.source instanceof Vec3 ? this.source : this.source(time);

    for (const node of nodes) {
      if (node.isPinned) continue;

      const distSq = node.position.distanceToSq(source);
      if (distSq < r2 && distSq > 1e-4) {
        const dist = Math.sqrt(distSq);
        const falloff = 1.0 - dist / this.radius;

        const dir = new Vec3().subVectors(source, node.position).normalize();
        node.position.addScaled(dir, this.strength * falloff * dt * 10);
      }
    }
  }
}
