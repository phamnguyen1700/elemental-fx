import type { Node } from "../engines/constraint-graph";
import type { Force } from "../engines/constraint-graph";
import { Vec3 } from "../core/math/vec3";

export interface WindForceConfig {
  direction?: Vec3;
  strength?: number;
  frequency?: number;
  turbulence?: number;
  spatialScale?: number;
  gustVariation?: number;
  seed?: number;
}

export class WindForce implements Force {
  direction: Vec3;
  strength: number;
  frequency: number;
  turbulence: number;
  spatialScale: number;
  gustVariation: number;
  seed: number;

  constructor(config: WindForceConfig = {}) {
    this.direction = (config.direction ?? new Vec3(1, 0, 0)).clone().normalize();
    this.strength = config.strength ?? 1.0;
    this.frequency = config.frequency ?? 1.0;
    this.turbulence = config.turbulence ?? 0.5;
    this.spatialScale = config.spatialScale ?? 0.1;
    this.gustVariation = config.gustVariation ?? 0.5;
    this.seed = config.seed ?? 0;
  }

  // Simple pseudo-random hash
  private hash(x: number, y: number, z: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + this.seed) * 43758.5453;
    return n - Math.floor(n);
  }

  sample(position: Vec3, time: number): Vec3 {
    // Basic procedural wind field
    const px = position.x * this.spatialScale;
    const py = position.y * this.spatialScale;
    const pz = position.z * this.spatialScale;

    const t = time * this.frequency;

    // Gust based on time
    const gust = 1.0 + Math.sin(t) * this.gustVariation;

    // Turbulence based on position + time
    const tx = this.hash(px, py + t, pz) * 2 - 1;
    const ty = this.hash(px + t, py, pz) * 2 - 1;
    const tz = this.hash(px, py, pz + t) * 2 - 1;

    const turbVec = new Vec3(tx, ty, tz).mul(this.turbulence);

    return this.direction
      .clone()
      .mul(this.strength * gust)
      .add(turbVec);
  }

  apply(nodes: Node[], dt: number, time: number): void {
    for (const node of nodes) {
      if (node.isPinned) continue;
      const windForce = this.sample(node.position, time).mul(dt);
      node.position.add(windForce);
    }
  }
}
