import { Vec3 } from "../../core/math/vec3";

export type NodeMetadata = Record<string, unknown>;

export class Node {
  id: number;
  position: Vec3;
  previousPosition: Vec3;
  restPosition: Vec3;
  velocity: Vec3; // Derived or explicit, useful for external queries
  mass: number;
  invMass: number;
  isPinned: boolean;
  damping: number;
  metadata: NodeMetadata;

  private static nextId = 0;

  constructor(
    position: Vec3,
    mass = 1.0,
    isPinned = false,
    damping = 0.99,
    metadata: NodeMetadata = {}
  ) {
    this.id = Node.nextId++;
    this.position = position.clone();
    this.previousPosition = position.clone();
    this.restPosition = position.clone();
    this.velocity = new Vec3();
    this.mass = mass;
    this.invMass = mass === 0 || isPinned ? 0 : 1 / mass;
    this.isPinned = isPinned;
    this.damping = damping;
    this.metadata = metadata;
  }

  pin() {
    this.isPinned = true;
    this.invMass = 0;
  }

  unpin(mass = this.mass) {
    this.isPinned = false;
    this.mass = mass;
    this.invMass = mass === 0 ? 0 : 1 / mass;
  }

  setVelocity(velocity: Vec3, dt = 1): void {
    this.velocity.copy(velocity);
    this.previousPosition.copy(this.position).addScaled(velocity, -dt);
  }
}
