import { DeformableEngine } from "../engines/constraint-graph";
import type { EngineConfig, Force } from "../engines/constraint-graph";
import { SpatialHash } from "../core/spatial";
import type { TopologyResult } from "../topologies";
import { resolveQualityBudget } from "./quality";
import type { DeformableQuality, QualityBudget } from "./quality";

export interface SceneConfig {
  quality: DeformableQuality;
  engineConfig?: Partial<EngineConfig>;
  topology?: TopologyResult;
  forces?: Force[];
  renderers?: DeformableRenderer[];
  spatialCellSize?: number;
}

export interface DeformableRenderer {
  resize?(width: number, height: number, dpr: number): void;
  render?(scene: DeformableScene): void;
  destroy?(): void;
}

export class DeformableScene {
  engine: DeformableEngine;
  spatial: SpatialHash;
  quality: DeformableQuality;
  budget: QualityBudget;
  renderers: DeformableRenderer[];
  width = 0;
  height = 0;
  dpr = 1;
  paused = false;
  destroyed = false;

  constructor(config: Partial<SceneConfig> = {}) {
    this.quality = config.quality ?? "medium";
    this.budget = resolveQualityBudget(this.quality, globalThis.devicePixelRatio ?? 1);
    const engineConfig: Partial<EngineConfig> = {
      substeps: this.budget.substeps,
      iterations: this.budget.iterations,
      ...config.engineConfig
    };

    this.engine = new DeformableEngine(engineConfig);
    this.spatial = new SpatialHash(config.spatialCellSize ?? 20);
    this.engine.forceContext.spatial = this.spatial;
    this.renderers = [...(config.renderers ?? [])];
    if (config.topology) this.setTopology(config.topology);
    for (const force of config.forces ?? []) this.engine.addForce(force);
  }

  setTopology(topology: TopologyResult): void {
    this.engine.nodes = [...topology.nodes];
    this.engine.constraints = [...topology.constraints];
    this.spatial.update(this.engine.nodes);
  }

  addForce(force: Force): Force {
    return this.engine.addForce(force);
  }

  addRenderer(renderer: DeformableRenderer): DeformableRenderer {
    this.renderers.push(renderer);
    renderer.resize?.(this.width, this.height, this.dpr);
    return renderer;
  }

  removeRenderer(renderer: DeformableRenderer): void {
    this.renderers = this.renderers.filter((candidate) => candidate !== renderer);
    renderer.destroy?.();
  }

  resize(width: number, height: number, dpr = globalThis.devicePixelRatio ?? 1): void {
    this.dpr = Math.min(dpr, this.budget.dprCap);
    this.width = Math.max(1, Math.floor(width * this.dpr));
    this.height = Math.max(1, Math.floor(height * this.dpr));
    for (const renderer of this.renderers) renderer.resize?.(this.width, this.height, this.dpr);
  }

  update(dt: number): void {
    if (this.paused || this.destroyed) return;
    this.spatial.update(this.engine.nodes);
    this.engine.update(dt);
    this.spatial.update(this.engine.nodes);
  }

  render(): void {
    if (this.destroyed) return;
    for (const renderer of this.renderers) renderer.render?.(this);
  }

  destroy(): void {
    if (this.destroyed) return;
    for (const renderer of this.renderers) renderer.destroy?.();
    this.renderers = [];
    this.engine.dispose();
    this.spatial.clear();
    this.destroyed = true;
  }
}

export function createDeformableScene(config: Partial<SceneConfig> = {}) {
  return new DeformableScene(config);
}

export * from "./quality";
