import {
  allocateWeightedCounts,
  getEffectLayoutWeight,
  resolveEffectLayout,
  type EffectLayoutRegion,
  type ResolvedEffectLayout,
} from "@elemental-fx/effect-layout";
import { Vec3 } from "../../core/math/vec3";
import type { NetworkBounds, TopologyResult } from "../../topologies";
import type { VineCornerShape, VineLayout } from "./types";
export interface ResolvedVineLayout {
  spatial: ResolvedEffectLayout;

  /**
   * Foliage-specific shape policy for corner layouts.
   *
   * Generic effect-layout still owns normalized regions/extents.
   */
  cornerShape: VineCornerShape | null;

  pathCountScale: number;
  growthDensityScale: number;
  spacingScale: number;
}
/**
 * Resolves how strongly a region-local normalized point belongs to the final
 * spatial layout.
 *
 * Input coordinates are local to the build region:
 *   x = 0..1
 *   y = 0..1
 *
 * Output:
 *   0 = rejected / outside the spatial field
 *   1 = fully active
 *   0..1 = feathered transition
 */
export type VineLayoutRegionWeightResolver = (x: number, y: number) => number;

/**
 * Adapts the generic @elemental-fx/effect-layout contract to vine-specific
 * density/path semantics without leaking foliage behavior into the generic
 * package.
 */
export function resolveVineLayout(
  input: VineLayout | undefined,
  fallbackVariation = 1,
): ResolvedVineLayout {
  const spatial = resolveEffectLayout(input ?? "cover", fallbackVariation);
  const cornerShape = resolveVineCornerShape(input);
  const coveragePathScale = spatial.coverage;
  const coverageGrowthScale = clamp(
    1 + (spatial.coverage - 1) * 0.35,
    0.72,
    1.45,
  );
  const coverageSpacingScale = clamp(
    1 / Math.sqrt(spatial.coverage),
    0.72,
    1.35,
  );

  switch (spatial.mode) {
    case "corners":
      return {
        spatial,
        pathCountScale: 3.6 * coveragePathScale,
        cornerShape,
        growthDensityScale: 3.35 * coverageGrowthScale,
        spacingScale: 2.65 * coverageSpacingScale,
      };

    case "top":
      return {
        spatial,
        cornerShape,
        pathCountScale: 0.85 * coveragePathScale,
        growthDensityScale: 1.05 * coverageGrowthScale,
        spacingScale: 0.9 * coverageSpacingScale,
      };

    case "cover":
    default:
      return {
        spatial,
        cornerShape,
        pathCountScale: 0.75 * coveragePathScale,
        growthDensityScale: 0.85 * coverageGrowthScale,
        spacingScale: 1.12 * coverageSpacingScale,
      };
  }
}

/**
 * Allocate one global vine-path budget across the generic layout regions.
 */
export function resolveVineLayoutPathCounts(
  totalPathCount: number,
  layout: ResolvedVineLayout,
): number[] {
  return allocateWeightedCounts(
    totalPathCount,
    layout.spatial.regions.map((region) => region.weight),
  );
}

/**
 * Resolve the coarse build rectangle used to generate a region topology.
 *
 * Most layouts use their generic region directly.
 *
 * Frame is special: its top/bottom build strips are expanded inward enough to
 * contain the rounded inner-corner field. The spatial field will later reject
 * points that fall inside the rounded safe area.
 *
 * This keeps @elemental-fx/effect-layout generic while letting the vine engine
 * generate geometry inside the complete rounded-frame support area.
 */
export function resolveVineLayoutBuildRegion(
  layout: ResolvedVineLayout,
  region: EffectLayoutRegion,
): EffectLayoutRegion {
  if (layout.spatial.mode !== "corners" || layout.cornerShape === null) {
    return region;
  }

  return resolveCornerBuildRegion(layout, region);
}

/**
 * Converts region-local normalized coordinates into the full layout coordinate
 * system and evaluates the generic spatial field.
 *
 * This is the bridge between:
 *
 * @elemental-fx/effect-layout
 *          ↓
 * continuous spatial field
 *          ↓
 * foliage path placement
 */
export function createVineLayoutRegionWeightResolver(
  layout: ResolvedVineLayout,
  region: EffectLayoutRegion,
): VineLayoutRegionWeightResolver {
  const buildRegion = resolveVineLayoutBuildRegion(layout, region);

  return (localX, localY) => {
    const normalizedLocalX = clamp01(localX);

    const normalizedLocalY = clamp01(localY);

    /**
     * Rect corners use their coarse region as the field itself.
     *
     * The region expands with thickness until overlapping corner regions
     * naturally converge toward a filled composition.
     */
    if (layout.spatial.mode === "corners" && layout.cornerShape === "rect") {
      return resolveRectCornerWeight(
        normalizedLocalX,
        normalizedLocalY,
        region,
        layout.spatial.feather,
      );
    }

    /**
     * Round corners continue to use the generic radial spatial field:
     *
     * ellipse / circular corner
     * → expanding radial field
     * → full area.
     */
    if (layout.spatial.mode === "corners" && layout.cornerShape === "round") {
      return resolveRoundCornerWeight(
        normalizedLocalX,
        normalizedLocalY,
        region,
        buildRegion,
        layout.spatial.feather,
      );
    }

    const x = buildRegion.x + normalizedLocalX * buildRegion.width;

    const y = buildRegion.y + normalizedLocalY * buildRegion.height;

    return getEffectLayoutWeight(layout.spatial, x, y);
  };
}

/**
 * Convert a normalized generic layout region into the deformable engine's
 * world-space NetworkBounds.
 */
export function resolveVineLayoutRegionBounds(
  parent: NetworkBounds,
  region: EffectLayoutRegion,
  layout?: ResolvedVineLayout,
): NetworkBounds {
  const buildRegion =
    layout === undefined
      ? region
      : resolveVineLayoutBuildRegion(layout, region);

  const width = parent.max.x - parent.min.x;

  const height = parent.max.y - parent.min.y;

  const minX = parent.min.x + width * buildRegion.x;

  const minY = parent.min.y + height * buildRegion.y;

  return {
    min: new Vec3(minX, minY, parent.min.z),

    max: new Vec3(
      minX + width * buildRegion.width,

      minY + height * buildRegion.height,

      parent.max.z,
    ),
  };
}

/**
 * Give every path/node a stable global path index and record which layout
 * region produced it. This becomes useful later for role-aware hanging roots,
 * debugging, and additional effect-specific adapters.
 */
export function annotateVineLayoutRegion(
  topology: TopologyResult,
  region: EffectLayoutRegion,
  globalPathOffset: number,
): number {
  const paths = topology.groups?.paths ?? [];

  paths.forEach((path, localPathIndex) => {
    const globalPathIndex = globalPathOffset + localPathIndex;

    for (const node of path) {
      node.metadata.pathIndex = globalPathIndex;
      node.metadata.layoutRegion = region.id;
      node.metadata.layoutRole = region.role;
    }
  });

  topology.metadata = {
    ...topology.metadata,
    layoutRegion: region.id,
    layoutRole: region.role,
  };

  return globalPathOffset + paths.length;
}

/**
 * Merge independently generated region networks back into one path topology so
 * VineGrowth, forces, distribution, and rendering remain unaware of the macro
 * layout split.
 */
export function combineVineLayoutTopologies(
  topologies: readonly TopologyResult[],
): TopologyResult {
  const paths = topologies.flatMap((topology) => topology.groups?.paths ?? []);

  if (paths.length === 0) {
    throw new Error("Vine layout produced no network paths.");
  }

  return {
    nodes: topologies.flatMap((topology) => topology.nodes),
    constraints: topologies.flatMap((topology) => topology.constraints),
    edges: topologies.flatMap((topology) => topology.edges ?? []),
    groups: {
      paths,
    },
    metadata: {
      layoutNetwork: true,
      mode: "paths",
      regionCount: topologies.length,
      topology: "networks",
    },
  };
}
function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function resolveVineCornerShape(
  input: VineLayout | undefined,
): VineCornerShape | null {
  if (typeof input !== "object" || input.mode !== "corners") {
    return null;
  }

  return input.shape ?? "round";
}

function resolveRoundCornerWeight(
  x: number,
  y: number,
  region: EffectLayoutRegion,
  buildRegion: EffectLayoutRegion,
  feather: number,
): number {
  const localX = clamp01(x);
  const localY = clamp01(y);

  /**
   * Corner center in region-local coordinates.
   */
  const cornerX = region.role.endsWith("left") ? 0 : 1;

  const cornerY = region.role.startsWith("top") ? 0 : 1;

  const dx = localX - cornerX;

  const dy = localY - cornerY;

  /**
   * Because x/y are normalized inside buildRegion, radius=1 represents
   * the boundary of the ellipse defined by buildRegion width/height.
   */
  const radius = Math.sqrt(dx * dx + dy * dy);

  /**
   * Convert global normalized feather into approximately region-local
   * ellipse-radius units.
   */
  const localScale = Math.max(
    0.0001,
    Math.min(buildRegion.width, buildRegion.height),
  );

  const localFeather = clamp(feather / localScale, 0, 0.45);

  if (localFeather <= 0) {
    return radius <= 1 ? 1 : 0;
  }

  return 1 - smoothstep(1 - localFeather, 1, radius);
}

function resolveRectCornerWeight(
  x: number,
  y: number,
  region: EffectLayoutRegion,
  feather: number,
): number {
  if (feather <= 0) {
    return 1;
  }

  const localX = clamp01(x);
  const localY = clamp01(y);

  /**
   * Distance toward the inner boundary of this particular corner.
   */
  const innerX = region.role.endsWith("left") ? 1 - localX : localX;

  const innerY = region.role.startsWith("top") ? 1 - localY : localY;

  const innerDistance = Math.min(innerX, innerY);

  const normalizedFeather = Math.min(0.5, feather);

  return smoothstep(0, normalizedFeather, innerDistance);
}
function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }

  const t = clamp01((value - edge0) / (edge1 - edge0));

  return t * t * (3 - 2 * t);
}

function resolveCornerBuildRegion(
  layout: ResolvedVineLayout,
  region: EffectLayoutRegion,
): EffectLayoutRegion {
  const extent = layout.spatial.extent;

  /**
   * Semantic thickness progresses toward full composition around thickness 3.
   */
  const progress = clamp01(layout.spatial.thickness / 3);

  if (layout.cornerShape === "rect") {
    return resolveRectCornerRegion(region, extent, progress);
  }

  return resolveRoundCornerRegion(region, extent, progress);
}

function resolveRectCornerRegion(
  region: EffectLayoutRegion,
  extent: number,
  progress: number,
): EffectLayoutRegion {
  /**
   * Phase 1:
   * rectangle → square
   */
  const squareProgress = smoothstep(0, 0.55, progress);

  /**
   * Phase 2:
   * square → filled
   */
  const fillProgress = smoothstep(0.55, 1, progress);

  const initialWidth = clamp01(extent * 1.55);

  const initialHeight = clamp01(extent * 0.72);

  const squareExtent = clamp01(Math.max(initialWidth, initialHeight));

  const widthAtSquare = lerp(initialWidth, squareExtent, squareProgress);

  const heightAtSquare = lerp(initialHeight, squareExtent, squareProgress);

  const width = lerp(widthAtSquare, 1, fillProgress);

  const height = lerp(heightAtSquare, 1, fillProgress);

  return placeCornerRegion(region, width, height);
}

function resolveRoundCornerRegion(
  region: EffectLayoutRegion,
  extent: number,
  progress: number,
): EffectLayoutRegion {
  /**
   * Phase 1:
   * ellipse → circle
   */
  const circleProgress = smoothstep(0, 0.55, progress);

  /**
   * Phase 2:
   * circle → filled
   */
  const fillProgress = smoothstep(0.55, 1, progress);

  const initialWidth = clamp01(extent * 1.35);

  const initialHeight = clamp01(extent * 0.78);

  const circleExtent = clamp01(Math.max(initialWidth, initialHeight));

  const widthAtCircle = lerp(initialWidth, circleExtent, circleProgress);

  const heightAtCircle = lerp(initialHeight, circleExtent, circleProgress);

  const width = lerp(widthAtCircle, 1, fillProgress);

  const height = lerp(heightAtCircle, 1, fillProgress);

  return placeCornerRegion(region, width, height);
}
function placeCornerRegion(
  region: EffectLayoutRegion,
  width: number,
  height: number,
): EffectLayoutRegion {
  const resolvedWidth = clamp01(width);

  const resolvedHeight = clamp01(height);

  switch (region.role) {
    case "top-left":
      return {
        ...region,
        x: 0,
        y: 0,
        width: resolvedWidth,
        height: resolvedHeight,
      };

    case "top-right":
      return {
        ...region,
        x: 1 - resolvedWidth,
        y: 0,
        width: resolvedWidth,
        height: resolvedHeight,
      };

    case "bottom-left":
      return {
        ...region,
        x: 0,
        y: 1 - resolvedHeight,
        width: resolvedWidth,
        height: resolvedHeight,
      };

    case "bottom-right":
      return {
        ...region,
        x: 1 - resolvedWidth,
        y: 1 - resolvedHeight,
        width: resolvedWidth,
        height: resolvedHeight,
      };

    default:
      return region;
  }
}
