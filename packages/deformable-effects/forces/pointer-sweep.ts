import type { Node } from "../engines/constraint-graph";
import type { Force, ForceContext } from "../engines/constraint-graph";
import { Vec3 } from "../core/math/vec3";

export interface PointerSweepConfig {
  radius?: number;
  strength?: number;
  lift?: number;
  velocityScale?: number;
  depthFalloff?: number;
}

export class PointerSweepForce implements Force {
  previousPointer: Vec3 | null = null;
  currentPointer: Vec3 | null = null;
  radius: number;
  strength: number;
  lift: number;
  velocityScale: number;
  depthFalloff: number;
  isActive = false;

  constructor(radiusOrConfig: number | PointerSweepConfig = 50, strength = 2.0) {
    const config =
      typeof radiusOrConfig === "number" ? { radius: radiusOrConfig, strength } : radiusOrConfig;
    this.radius = config.radius ?? 50;
    this.strength = config.strength ?? 2;
    this.lift = config.lift ?? 0;
    this.velocityScale = config.velocityScale ?? 1;
    this.depthFalloff = config.depthFalloff ?? 0.01;
  }

  updatePointer(current: Vec3, isActive: boolean) {
    if (this.isActive && isActive) {
      if (!this.previousPointer) this.previousPointer = current.clone();
      else this.previousPointer.copy(this.currentPointer!);
      if (!this.currentPointer) this.currentPointer = current.clone();
      else this.currentPointer.copy(current);
    } else if (isActive) {
      this.previousPointer = current.clone();
      this.currentPointer = current.clone();
    } else {
      this.previousPointer = null;
      this.currentPointer = null;
    }
    this.isActive = isActive;
  }

  // Segment to point distance
  private closestPointOnSegment(a: Vec3, b: Vec3, p: Vec3): Vec3 {
    const ab = new Vec3().subVectors(b, a);
    const ap = new Vec3().subVectors(p, a);
    const t = ap.dot(ab) / (ab.lengthSq() || 1);

    if (t <= 0) return a.clone();
    if (t >= 1) return b.clone();
    return a.clone().addScaled(ab, t);
  }

  apply(nodes: Node[], dt: number, _time: number, context?: ForceContext): void {
    if (!this.isActive || !this.previousPointer || !this.currentPointer) return;

    // Movement vector of pointer
    const pointerVel = new Vec3().subVectors(this.currentPointer, this.previousPointer);
    const hasMovement = pointerVel.lengthSq() > 1e-4;

    const midpoint = this.previousPointer.clone().lerp(this.currentPointer, 0.5);
    const sweepRadius = this.radius + Math.sqrt(pointerVel.lengthSq()) * 0.5;
    const candidates = context?.spatial?.getNearby(midpoint, sweepRadius) ?? nodes;

    for (const node of candidates) {
      if (node.isPinned) continue;

      const closest = this.closestPointOnSegment(
        this.previousPointer,
        this.currentPointer,
        node.position
      );
      const distSq = node.position.distanceToSq(closest);

      if (distSq < this.radius * this.radius) {
        const dist = Math.sqrt(distSq);
        const flexibility = readNumber(node.metadata.flexibility, 1);
        const depth = Math.abs(node.position.z - closest.z);
        const depthWeight = 1 / (1 + depth * this.depthFalloff);
        const falloff = (1.0 - dist / this.radius) * depthWeight * flexibility;

        // Push force away from capsule core
        const pushDir = new Vec3().subVectors(node.position, closest);
        if (dist > 1e-4) {
          pushDir.normalize();
        } else {
          // If exactly on line, push arbitrarily
          pushDir.set(1, 0, 0);
        }

        // Apply push out of swept volume
        node.position.addScaled(pushDir, falloff * this.strength * dt * 10);
        if (this.lift !== 0) node.position.z += falloff * this.lift * dt;

        // Drag along with pointer
        if (hasMovement) {
          node.position.addScaled(pointerVel, falloff * this.strength * this.velocityScale * dt);
        }
      }
    }
  }
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
