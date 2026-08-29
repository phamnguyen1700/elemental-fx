import type { Node } from "./node";
import type { Constraint } from "./constraint";
import type { Force, ForceContext } from "./force";

export interface EngineConfig {
  substeps: number;
  iterations: number;
  fixedTimeStep: number;
  maxFrameTime: number;
}

export class DeformableEngine {
  nodes: Node[] = [];
  constraints: Constraint[] = [];
  forces: Force[] = [];
  config: EngineConfig;
  time = 0;
  accumulator = 0;
  disposed = false;
  forceContext: ForceContext = {};

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = {
      substeps: config.substeps ?? 4,
      iterations: config.iterations ?? 2,
      fixedTimeStep: config.fixedTimeStep ?? 1 / 60,
      maxFrameTime: config.maxFrameTime ?? 1 / 15
    };
  }

  addNode(node: Node): Node {
    this.nodes.push(node);
    return node;
  }

  addConstraint(constraint: Constraint): Constraint {
    this.constraints.push(constraint);
    return constraint;
  }

  addForce(force: Force): Force {
    this.forces.push(force);
    return force;
  }

  clear(): void {
    this.nodes = [];
    this.constraints = [];
    this.forces = [];
    this.time = 0;
    this.accumulator = 0;
  }

  dispose(): void {
    this.clear();
    this.disposed = true;
  }

  update(frameDt: number): number {
    if (this.disposed || frameDt <= 0) return 0;

    this.accumulator += Math.min(frameDt, this.config.maxFrameTime);
    let steps = 0;

    while (this.accumulator >= this.config.fixedTimeStep) {
      this.step(this.config.fixedTimeStep);
      this.accumulator -= this.config.fixedTimeStep;
      steps++;
    }

    return steps;
  }

  step(dt: number): void {
    if (this.disposed || dt <= 0) return;

    const { substeps, iterations } = this.config;
    const subDt = dt / substeps;
    const invSubsteps = 1 / substeps;

    for (let s = 0; s < substeps; s++) {
      // 1. Apply forces
      for (const force of this.forces) {
        force.apply(this.nodes, subDt, this.time, this.forceContext);
      }

      // 2. Integrate (Verlet)
      for (const node of this.nodes) {
        if (node.isPinned) continue;

        // Current velocity from previous position
        node.velocity.subVectors(node.position, node.previousPosition);
        node.velocity.mul(node.damping);

        node.previousPosition.copy(node.position);
        node.position.add(node.velocity);
      }

      // 3. Solve Constraints
      for (let i = 0; i < iterations; i++) {
        for (const constraint of this.constraints) {
          constraint.solve(subDt, invSubsteps);
        }
      }

      this.time += subDt;
    }
  }
}
