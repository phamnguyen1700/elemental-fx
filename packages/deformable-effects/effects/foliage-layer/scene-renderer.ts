import type { DeformableRenderer, DeformableScene } from "../scene";
import { DebugRenderer, InstancedFoliageRenderer } from "../../renderers";
import { listVineResources } from "./assets";
import type { FoliageComposition } from "./composition";

export interface FoliageSceneRendererOptions {
  debug: boolean;
  onError?: (error: Error) => void;
  onReady?: () => void;
}

export class FoliageSceneRenderer implements DeformableRenderer {
  private readonly foliage: InstancedFoliageRenderer;
  private readonly debug: DebugRenderer | null;
  private destroyed = false;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly composition: FoliageComposition,
    options: FoliageSceneRendererOptions
  ) {
    this.foliage = new InstancedFoliageRenderer(
      gl,
      listVineResources(composition.assets),
      composition.preset.render,
      {
        depthRange: composition.bounds.depthRange,
        maxInstances: composition.distribution.instances.length,
        requiredResources: composition.assets.branches.resources.map((entry) => entry.resource),
        ...(options.onError ? { onError: options.onError } : {}),
        ...(options.onReady ? { onReady: options.onReady } : {})
      }
    );
    this.debug = options.debug ? new DebugRenderer(gl) : null;
  }

  render(scene: DeformableScene): void {
    if (this.destroyed) return;
    const gl = this.gl;
    const projection = createFoliageProjection(this.composition);

    gl.viewport(0, 0, scene.width, scene.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.foliage.render(
      this.composition.distribution.instances,
      projection,
      this.composition.scene.engine.time
    );

    if (this.debug) {
      gl.disable(gl.DEPTH_TEST);
      this.debug.render(
        scene.engine.nodes,
        scene.engine.constraints,
        projection,
        this.composition.pointerSweep.previousPointer &&
          this.composition.pointerSweep.currentPointer
          ? {
              from: this.composition.pointerSweep.previousPointer,
              to: this.composition.pointerSweep.currentPointer,
              radius: this.composition.pointerSweep.radius
            }
          : undefined
      );
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.foliage.destroy();
    this.debug?.destroy();
  }
}

function createFoliageProjection(composition: FoliageComposition): Float32Array {
  const { halfWidth, halfHeight, depthRange } = composition.bounds;
  return new Float32Array([
    1 / halfWidth,
    0,
    0,
    0,
    0,
    -1 / halfHeight,
    0,
    0,
    0,
    0,
    -1 / depthRange,
    0,
    0,
    0,
    0,
    1
  ]);
}
