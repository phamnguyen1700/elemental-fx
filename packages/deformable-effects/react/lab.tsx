import { useEffect, useMemo, useRef, useState } from "react";

import type { DeformableRenderer, DeformableScene } from "../effects";
import type { SceneConfig } from "../effects";
import { Vec3 } from "../core/math/vec3";
import {
  AttractorForce,
  FlowFieldForce,
  GravityForce,
  PointerSweepForce,
  WindForce
} from "../forces";
import {
  AttachmentRenderer,
  DebugRenderer,
  LineRenderer,
  RibbonRenderer,
  TexturedStripRenderer
} from "../renderers";
import {
  buildHangingStrands,
  buildNetworks,
  buildPoints,
  buildRootedBranches,
  buildSoftChains,
  buildStalks
} from "../topologies";
import type {
  HangingStrandsConfig,
  NetworksConfig,
  PointsConfig,
  RootedBranchesConfig,
  SoftChainsConfig,
  StalksConfig,
  TopologyResult
} from "../topologies";
import { useDeformableScene } from "./index";

export type LabTopology =
  | "points"
  | "rooted-branches"
  | "hanging-strands"
  | "stalks"
  | "network-mesh"
  | "network-paths"
  | "networks"
  | "soft-chains";
export type LabForce = "pointer-sweep" | "gravity" | "wind" | "flow" | "attractor" | "repulsor";
export type LabRenderer = "debug" | "lines" | "textured-strips" | "ribbons";

export type LabTopologyConfig = Partial<
  PointsConfig &
    RootedBranchesConfig &
    HangingStrandsConfig &
    StalksConfig &
    NetworksConfig &
    SoftChainsConfig
>;

export interface LabForceConfig {
  gravity?: Vec3;
  windDirection?: Vec3;
  windStrength?: number;
  windTurbulence?: number;
  windFrequency?: number;
  windSpatialScale?: number;
  windGustVariation?: number;
  windSeed?: number;
  flowStrengthX?: number;
  flowStrengthY?: number;
  flowSpatialScale?: number;
  attractorRadius?: number;
  attractorStrength?: number;
  repulsorRadius?: number;
  repulsorStrength?: number;
  pointerRadius?: number;
  pointerStrength?: number;
  pointerLift?: number;
  pointerVelocityScale?: number;
  pointerDepthFalloff?: number;
}

export interface LabRendererConfig {
  backgroundColor?: readonly [number, number, number, number];
  debugCapacity?: number;
  lineColor?: readonly [number, number, number, number];
  lineWidth?: number;
  attachmentScale?: number;
  attachmentEvery?: number;
  texturedStripWidth?: number;
  texturedStripColor?: readonly [number, number, number, number];
  ribbonWidth?: number;
  ribbonColor?: readonly [number, number, number, number];
}

export interface DeformableLabProps {
  topology?: LabTopology;
  force?: LabForce;
  renderer?: LabRenderer;
  sceneConfig?: Partial<SceneConfig>;
  topologyConfig?: LabTopologyConfig;
  forceConfig?: LabForceConfig;
  rendererConfig?: LabRendererConfig;
}

export function DeformableLab({
  force: initialForce = "pointer-sweep",
  forceConfig = {},
  renderer: initialRenderer = "debug",
  rendererConfig = {},
  sceneConfig = {},
  topology: initialTopology = "rooted-branches",
  topologyConfig = {}
}: DeformableLabProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resolvedSceneConfig = useMemo(
    () => ({ quality: "medium" as const, ...sceneConfig }),
    [sceneConfig]
  );
  const sceneRef = useDeformableScene(canvasRef, resolvedSceneConfig);
  const [topology, setTopology] = useState<LabTopology>(normalizeLabTopology(initialTopology));
  const [force, setForce] = useState<LabForce>(initialForce);
  const [renderer, setRenderer] = useState<LabRenderer>(initialRenderer);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    if (!scene || !canvas) return;

    const gl = canvas.getContext("webgl2");
    if (!gl) {
      setError("WebGL 2 is not available in this browser.");
      return;
    }

    setError(null);
    scene.engine.clear();
    scene.engine.config = { ...scene.engine.config, ...resolvedSceneConfig.engineConfig };
    const result = createLabTopology(topology, topologyConfig);
    scene.setTopology(result);

    const pointerConfig = {
      lift: forceConfig.pointerLift ?? 18,
      radius: forceConfig.pointerRadius ?? 34,
      strength: forceConfig.pointerStrength ?? 8,
      velocityScale: forceConfig.pointerVelocityScale ?? 1.35
    };
    if (forceConfig.pointerDepthFalloff !== undefined) {
      Object.assign(pointerConfig, { depthFalloff: forceConfig.pointerDepthFalloff });
    }
    const pointerForce = new PointerSweepForce(pointerConfig);
    if (force === "pointer-sweep") {
      scene.addForce(pointerForce);
    } else {
      scene.addForce(createLabForce(force, forceConfig));
    }

    const labRenderer = new LabRendererAdapter(gl, renderer, result, pointerForce, rendererConfig);
    scene.addRenderer(labRenderer);

    const updatePointer = (event: PointerEvent, active: boolean) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 220 - 110;
      const y = ((event.clientY - rect.top) / rect.height) * 160 - 80;
      pointerForce.updatePointer(new Vec3(x, y, 0), active);
    };
    const handleMove = (event: PointerEvent) => updatePointer(event, true);
    const handleDown = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId);
      updatePointer(event, true);
    };
    const handleUp = (event: PointerEvent) => {
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      pointerForce.updatePointer(new Vec3(), false);
    };
    const handleCancel = () => pointerForce.updatePointer(new Vec3(), false);
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      scene.paused = true;
    };
    const handleContextRestored = () => {
      scene.paused = false;
    };

    canvas.addEventListener("pointermove", handleMove);
    canvas.addEventListener("pointerdown", handleDown);
    canvas.addEventListener("pointerup", handleUp);
    canvas.addEventListener("pointercancel", handleCancel);
    canvas.addEventListener("pointerleave", handleCancel);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      scene.removeRenderer(labRenderer);
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("pointerdown", handleDown);
      canvas.removeEventListener("pointerup", handleUp);
      canvas.removeEventListener("pointercancel", handleCancel);
      canvas.removeEventListener("pointerleave", handleCancel);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [
    force,
    forceConfig,
    renderer,
    rendererConfig,
    resolvedSceneConfig,
    sceneRef,
    topology,
    topologyConfig
  ]);

  return (
    <div style={{ height: "100%", position: "relative", width: "100%" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          left: 10,
          position: "absolute",
          top: 10,
          zIndex: 10
        }}
      >
        <select
          value={topology}
          onChange={(event) => setTopology(event.target.value as LabTopology)}
        >
          <option value="points">Points</option>
          <option value="rooted-branches">Rooted Branches</option>
          <option value="hanging-strands">Hanging Strands</option>
          <option value="stalks">Stalks</option>
          <option value="network-mesh">Network / Mesh</option>
          <option value="network-paths">Network / Paths</option>
          <option value="soft-chains">Soft Chains</option>
        </select>
        <select value={force} onChange={(event) => setForce(event.target.value as LabForce)}>
          <option value="pointer-sweep">Pointer Sweep</option>
          <option value="gravity">Gravity</option>
          <option value="wind">Wind</option>
          <option value="flow">Flow Field</option>
          <option value="attractor">Attractor</option>
          <option value="repulsor">Repulsor</option>
        </select>
        <select
          value={renderer}
          onChange={(event) => setRenderer(event.target.value as LabRenderer)}
        >
          <option value="debug">Debug Lines</option>
          <option value="lines">Lines / Cables</option>
          <option value="textured-strips">Textured Strips</option>
          <option value="ribbons">Ribbons</option>
        </select>
      </div>
      {error ? (
        <p style={{ left: 12, position: "absolute", top: 48, zIndex: 10 }}>{error}</p>
      ) : null}
      <canvas
        ref={canvasRef}
        style={{ display: "block", height: "100%", touchAction: "none", width: "100%" }}
      />
    </div>
  );
}

class LabRendererAdapter implements DeformableRenderer {
  private readonly isPoints: boolean;
  private debug?: DebugRenderer;
  private lines?: LineRenderer;
  private strips?: TexturedStripRenderer;
  private ribbons?: RibbonRenderer;
  private attachments?: AttachmentRenderer;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly mode: LabRenderer,
    private readonly topology: TopologyResult,
    private readonly pointer: PointerSweepForce,
    private readonly config: LabRendererConfig = {}
  ) {
    this.isPoints = topology.metadata?.topology === "points";
    if (mode === "debug") this.debug = new DebugRenderer(gl, config.debugCapacity);
    if (mode === "lines") {
      this.lines = new LineRenderer(gl, {
        color: config.lineColor ?? [0.78, 0.86, 0.92, 1],
        lineWidth: config.lineWidth ?? 1
      });
      this.attachments = new AttachmentRenderer(gl, 256);
    }
    if (this.isPoints && mode !== "debug" && !this.attachments) {
      this.attachments = new AttachmentRenderer(gl, Math.max(256, topology.nodes.length));
    }
    if (!this.isPoints && mode === "textured-strips") this.strips = new TexturedStripRenderer(gl);
    if (!this.isPoints && mode === "ribbons") this.ribbons = new RibbonRenderer(gl);
  }

  render(scene: DeformableScene): void {
    const background = this.config.backgroundColor ?? [0.08, 0.09, 0.1, 1];
    this.gl.viewport(0, 0, scene.width, scene.height);
    this.gl.clearColor(background[0], background[1], background[2], background[3]);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    const projection = createProjection(scene.width / Math.max(1, scene.height));
    const pointer =
      this.pointer.previousPointer && this.pointer.currentPointer
        ? {
            from: this.pointer.previousPointer,
            to: this.pointer.currentPointer,
            radius: this.pointer.radius
          }
        : undefined;

    if (this.debug)
      this.debug.render(scene.engine.nodes, scene.engine.constraints, projection, pointer);
    if (this.lines) {
      this.lines.renderEdges(this.topology.edges ?? [], projection);
      this.attachments?.render(
        this.isPoints
          ? scene.engine.nodes
          : scene.engine.nodes.filter(
              (_, index) => index % (this.config.attachmentEvery ?? 6) === 0
            ),
        projection,
        this.config.attachmentScale ?? 3.5
      );
    }
    if (this.isPoints && !this.lines && !this.debug) {
      this.attachments?.render(scene.engine.nodes, projection, this.config.attachmentScale ?? 3.5);
    }
    if (this.strips) {
      for (const chain of Object.values(this.topology.groups ?? {}).flat()) {
        this.strips.renderChain(chain, projection, {
          color: this.config.texturedStripColor ?? [0.58, 0.52, 0.42, 1],
          width: this.config.texturedStripWidth ?? 7
        });
      }
    }
    if (this.ribbons) {
      const chains = Object.values(this.topology.groups ?? {}).flat();
      this.ribbons.render(
        chains.length > 0 ? chains : [scene.engine.nodes],
        this.config.ribbonWidth ?? 9,
        projection,
        this.config.ribbonColor ?? [0.25, 0.68, 0.62, 1]
      );
    }
  }

  destroy(): void {
    this.debug?.destroy();
    this.lines?.destroy();
    this.strips?.destroy();
    this.ribbons?.destroy();
    this.attachments?.destroy();
  }
}

function createLabTopology(topology: LabTopology, config: LabTopologyConfig): TopologyResult {
  if (topology === "points") {
    return buildPoints({
      bounds: { min: new Vec3(-105, -72, -36), max: new Vec3(105, 72, 36) },
      count: 96,
      distribution: "grid",
      seed: 5,
      variation: 0.72,
      ...config
    });
  }
  if (topology === "rooted-branches")
    return buildRootedBranches({ branchDepth: 4, rootCount: 3, seed: 7, spread: 0.9, ...config });
  if (topology === "hanging-strands") {
    return buildHangingStrands({
      bendStiffness: 0.08,
      damping: 0.965,
      length: 92,
      nodesPerStrand: 9,
      rootJitter: new Vec3(8, 0, 18),
      seed: 11,
      segmentStiffness: 0.62,
      strandCount: 7,
      ...config
    });
  }
  if (topology === "stalks")
    return buildStalks({
      bendStiffness: 0.18,
      distanceStiffness: 0.82,
      height: 90,
      nodesPerStalk: 7,
      seed: 13,
      stalkCount: 9,
      ...config
    });
  if (topology === "network-mesh" || topology === "networks")
    return buildNetworks({
      diagonalConstraints: true,
      layout: "radial",
      radius: 82,
      rings: 4,
      seed: 17,
      spokes: 8,
      stiffness: 0.72,
      ...config,
      mode: "mesh"
    });
  if (topology === "network-paths") {
    return buildNetworks({
      anchorEvery: 4,
      anchorStiffness: 0.1,
      anchorStrategy: "distributed",
      bendStiffness: 0.08,
      bounds: { min: new Vec3(-105, -72, -30), max: new Vec3(105, 72, 30) },
      curvature: 0.64,
      damping: 0.972,
      density: 1,
      nodesPerPath: 12,
      orientationVariation: 0.88,
      overlap: 0.78,
      pathCount: 10,
      preferredDirection: new Vec3(1, 0, 0),
      seed: 19,
      stiffness: 0.68,
      variation: 0.86,
      ...config,
      mode: "paths"
    });
  }
  return buildSoftChains({
    bendStiffness: 0.12,
    nodeCount: 18,
    startPos: new Vec3(-90, -30, 0),
    endPos: new Vec3(90, -30, 0),
    stiffness: 0.75,
    ...config
  });
}

function normalizeLabTopology(topology: LabTopology): LabTopology {
  return topology === "networks" ? "network-mesh" : topology;
}

function createLabForce(force: LabForce, config: LabForceConfig) {
  if (force === "wind") {
    const windConfig = {
      gustVariation: config.windGustVariation ?? 0.5,
      seed: config.windSeed ?? 3,
      strength: config.windStrength ?? 22,
      turbulence: config.windTurbulence ?? 8
    };
    if (config.windDirection !== undefined)
      Object.assign(windConfig, { direction: config.windDirection });
    if (config.windFrequency !== undefined)
      Object.assign(windConfig, { frequency: config.windFrequency });
    if (config.windSpatialScale !== undefined)
      Object.assign(windConfig, { spatialScale: config.windSpatialScale });
    return new WindForce(windConfig);
  }
  if (force === "flow") {
    const strengthX = config.flowStrengthX ?? 15;
    const strengthY = config.flowStrengthY ?? 10;
    const spatialScale = config.flowSpatialScale ?? 0.08;
    return new FlowFieldForce(
      (position, time) =>
        new Vec3(
          Math.sin(time + position.y * spatialScale) * strengthX,
          Math.cos(time + position.x * spatialScale) * strengthY,
          0
        )
    );
  }
  if (force === "attractor")
    return new AttractorForce(
      (time) => new Vec3(Math.sin(time) * 45, 30, 0),
      config.attractorRadius ?? 110,
      config.attractorStrength ?? 90
    );
  if (force === "repulsor")
    return new AttractorForce(
      new Vec3(0, 0, 0),
      config.repulsorRadius ?? 90,
      config.repulsorStrength ?? -90
    );
  return new GravityForce(config.gravity ?? new Vec3(0, 45, 0));
}

function createProjection(aspect: number): Float32Array {
  const halfHeight = 90;
  const halfWidth = halfHeight * Math.max(1, aspect);
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
    1 / 200,
    0,
    0,
    0,
    0,
    1
  ]);
}
