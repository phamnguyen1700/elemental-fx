import { Vec3 } from "../../core/math/vec3";

import type { EffectLayoutRegionRole } from "@elemental-fx/effect-layout";

import type { VineLayoutRegionWeightResolver } from "./vine-layout";
import type {
  NetworkBounds,
  NetworkPathEndpointContext,
  NetworkPathEndpointResolver,
} from "../../topologies";

export interface FoliagePathLayoutOptions {
  seed: number;
  variation: number;
  role?: EffectLayoutRegionRole;

  /**
   * Continuous layout field evaluated in current build-region coordinates.
   */
  fieldWeight?: VineLayoutRegionWeightResolver;
}

export interface FoliagePathEndpointResolvers {
  startPosition: NetworkPathEndpointResolver;
  endPosition: NetworkPathEndpointResolver;
}

interface NormalizedPoint {
  x: number;
  y: number;
}

interface NormalizedEndpointPair {
  start: NormalizedPoint;
  end: NormalizedPoint;
}

const FIELD_ACTIVE_THRESHOLD = 0.2;

/**
 * Foliage uses one biological path grammar: wall-cling.
 *
 * Layout roles do not select different growth algorithms. They only orient
 * the same wall-clinging runner grammar inside the active spatial region.
 */
export function createFoliagePathEndpointResolvers(
  options: FoliagePathLayoutOptions,
): FoliagePathEndpointResolvers {
  const resolvePair = (context: NetworkPathEndpointContext) =>
    createFoliagePathEndpoints(context, options);

  return {
    startPosition: (context) => resolvePair(context).start,
    endPosition: (context) => resolvePair(context).end,
  };
}

export function createFoliagePathEndpoints(
  context: NetworkPathEndpointContext,
  options: FoliagePathLayoutOptions,
): {
  start: Vec3;
  end: Vec3;
} {
  const { bounds, pathIndex, pathCount } = context;

  const role = options.role ?? "full";
  const variation = clamp01(options.variation);

  const sample = (channel: number) =>
    coverageSample(options.seed, pathIndex, pathCount, channel, variation);

  const depth = lerp(bounds.min.z, bounds.max.z, sample(13));

  let endpoints = createWallClingEndpoints(role, pathIndex, sample, variation);

  /**
   * Cover should use the complete wall instead of allowing random path lanes
   * to accumulate around the center.
   *
   * This redistributes the same biological runners across the full width;
   * it does not increase path count or density.
   */
  if (role === "full") {
    endpoints = distributeCoverFlow(
      endpoints,
      pathIndex,
      pathCount,
      sample,
      variation,
    );
  }

  if (role !== "full" && options.fieldWeight) {
    endpoints = constrainEndpointsToField(endpoints, role, options.fieldWeight);
  }

  return {
    start: normalizedToBounds(endpoints.start, depth, bounds),

    end: normalizedToBounds(endpoints.end, depth, bounds),
  };
}

/**
 * One wall-clinging path grammar.
 *
 * The canonical grammar grows predominantly upward, with:
 *
 * - long climbing runners
 * - diagonal runners
 * - shorter lateral runners
 *
 * Layout roles only transform this canonical flow.
 */
function createWallClingEndpoints(
  role: EffectLayoutRegionRole,
  pathIndex: number,
  sample: (channel: number) => number,
  variation: number,
): NormalizedEndpointPair {
  if (isCornerRole(role)) {
    return createCornerWallClingEndpoints(role, pathIndex, sample);
  }

  const canonical = createCanonicalWallClingEndpoints(
    pathIndex,
    sample,
    variation,
  );

  return orientWallClingEndpoints(
    canonical,
    role,
    pathIndex,
    sample,
    variation,
  );
}

/**
 * Canonical biological growth:
 *
 * local +Y = lower wall
 * local -Y = climbing upward
 *
 * Families are not different biological modes. They are variation inside one
 * wall-clinging population.
 */
function createCanonicalWallClingEndpoints(
  pathIndex: number,
  sample: (channel: number) => number,
  variation: number,
): NormalizedEndpointPair {
  const family = pathIndex % 8;

  /**
   * Main climbing runners.
   *
   * These form the primary structural scaffold.
   */
  if (family <= 3) {
    const lane = sample(1);

    const startX = clamp01(
      lane + signed(sample(2)) * lerp(0.015, 0.08, variation),
    );

    return {
      start: {
        x: startX,
        y: lerp(0.76, 1, sample(3)),
      },

      end: {
        x: clamp01(startX + signed(sample(4)) * lerp(0.08, 0.32, variation)),

        y: lerp(0, 0.24, sample(5)),
      },
    };
  }

  /**
   * Diagonal runners.
   *
   * These break the visual rhythm of parallel primary vines and allow
   * neighboring structural systems to overlap naturally.
   */
  if (family <= 5) {
    const fromLeft = (pathIndex + Math.round(sample(6))) % 2 === 0;

    return {
      start: {
        x: fromLeft ? lerp(0.01, 0.28, sample(1)) : lerp(0.72, 0.99, sample(1)),

        y: lerp(0.6, 1, sample(2)),
      },

      end: {
        x: fromLeft ? lerp(0.52, 0.96, sample(3)) : lerp(0.04, 0.48, sample(3)),

        y: lerp(0.02, 0.44, sample(4)),
      },
    };
  }

  /**
   * Lateral / crossing runners.
   *
   * These are deliberately less common. Once VineGrowth adds secondary
   * branches they help the entire layer read as one wall-clinging network
   * instead of independent vertical cables.
   */
  const fromLeft = pathIndex % 2 === 0;

  const baseY = lerp(0.28, 0.82, sample(2));

  const verticalDrift = signed(sample(3)) * lerp(0.08, 0.28, variation);

  return {
    start: {
      x: fromLeft ? 0 : 1,
      y: baseY,
    },

    end: {
      x: fromLeft ? lerp(0.48, 0.9, sample(4)) : lerp(0.1, 0.52, sample(4)),

      y: clamp01(baseY + verticalDrift),
    },
  };
}

/**
 * Orient the canonical wall-cling grammar for a layout region.
 *
 * No new growth model is introduced here.
 */
function orientWallClingEndpoints(
  endpoints: NormalizedEndpointPair,
  role: Exclude<
    EffectLayoutRegionRole,
    "top-left" | "top-right" | "bottom-left" | "bottom-right"
  >,
  pathIndex: number,
  sample: (channel: number) => number,
  variation: number,
): NormalizedEndpointPair {
  if (role === "full") {
    return endpoints;
  }

  const horizontal = rotateVerticalFlowToHorizontal(endpoints);

  /**
   * All edge layouts use the same wall-cling population.
   *
   * About:
   * - 57% follows the edge
   * - 14% crosses the edge
   * - 29% blends into diagonal runners
   *
   * This prevents frame/top layouts from becoming parallel cables.
   */
  const flowFamily = pathIndex % 7;

  const selectFlow = (
    primary: NormalizedEndpointPair,
    cross: NormalizedEndpointPair,
  ): NormalizedEndpointPair => {
    if (flowFamily <= 3) {
      return primary;
    }

    if (flowFamily === 4) {
      return cross;
    }

    const mix = lerp(0.3, 0.58, sample(41));

    return blendEndpointPairs(primary, cross, mix * lerp(0.72, 1, variation));
  };

  switch (role) {
    case "top": {
      const oriented = selectFlow(horizontal, endpoints);

      return createTopFullWidthFlow(oriented, pathIndex, sample, variation);
    }

    case "bottom": {
      const oriented = selectFlow(horizontal, endpoints);

      const localized = localizeEdgeFlow(
        oriented,
        "horizontal",
        sample,
        variation,
      );

      const mirrored = mirrorPairY(localized);

      return pathIndex % 2 === 0 ? mirrored : mirrorPairX(mirrored);
    }

    case "left": {
      const oriented = selectFlow(endpoints, horizontal);

      const localized = localizeEdgeFlow(
        oriented,
        "vertical",
        sample,
        variation,
      );

      return pathIndex % 2 === 0 ? localized : mirrorPairY(localized);
    }

    case "right": {
      const oriented = selectFlow(endpoints, horizontal);

      const localized = localizeEdgeFlow(
        oriented,
        "vertical",
        sample,
        variation,
      );

      const mirrored = mirrorPairX(localized);

      return pathIndex % 2 === 0 ? mirrored : mirrorPairY(mirrored);
    }

    default:
      return assertNever(role);
  }
}

/**
 * Rotate the canonical vertical growth field into a horizontal one.
 *
 * Importantly, canonical lateral runners become vertical/diagonal paths after
 * this transform. Therefore Top no longer degenerates into parallel
 * horizontal cables.
 */
function rotateVerticalFlowToHorizontal(
  endpoints: NormalizedEndpointPair,
): NormalizedEndpointPair {
  return {
    start: rotatePointToHorizontal(endpoints.start),

    end: rotatePointToHorizontal(endpoints.end),
  };
}

function rotatePointToHorizontal(point: NormalizedPoint): NormalizedPoint {
  return {
    x: 1 - point.y,
    y: point.x,
  };
}

/**
 * Corner layouts use the same wall-clinging idea but the available field is a
 * quarter-circle / quarter-ellipse rather than a rectangular strip.
 *
 * Runners start close to the true wall corner and spread along either adjacent
 * perimeter edge.
 */
function createCornerWallClingEndpoints(
  role: "top-left" | "top-right" | "bottom-left" | "bottom-right",
  pathIndex: number,
  sample: (channel: number) => number,
): NormalizedEndpointPair {
  const isLeft = role.endsWith("left");

  const isTop = role.startsWith("top");

  const nearReach = lerp(0.012, 0.2, sample(31));

  const middleReach = lerp(0.18, 0.58, sample(32));

  const farReach = lerp(0.42, 0.94, sample(33));

  const horizontal = (distance: number): NormalizedPoint => ({
    x: isLeft ? distance : 1 - distance,

    y: isTop ? 0 : 1,
  });

  const vertical = (distance: number): NormalizedPoint => ({
    x: isLeft ? 0 : 1,

    y: isTop ? distance : 1 - distance,
  });

  switch (pathIndex % 4) {
    /**
     * Core → horizontal spill.
     */
    case 0:
      return {
        start: vertical(nearReach),
        end: horizontal(farReach),
      };

    /**
     * Core → vertical spill.
     */
    case 1:
      return {
        start: horizontal(nearReach),
        end: vertical(farReach),
      };

    /**
     * Medium crossing runner.
     */
    case 2:
      return {
        start: vertical(middleReach),
        end: horizontal(farReach),
      };

    /**
     * Opposite crossing direction.
     */
    case 3:
    default:
      return {
        start: horizontal(middleReach),
        end: vertical(farReach),
      };
  }
}

/**
 * Apply the continuous spatial field to a complete path pair.
 *
 * Endpoints are constrained first. If their midpoint still falls into an
 * inactive area, both endpoints are pulled toward the relevant outer boundary.
 *
 * This is important for rounded frames where valid endpoints alone do not
 * guarantee that the path chord stays outside the protected center.
 */
function constrainEndpointsToField(
  endpoints: NormalizedEndpointPair,
  role: Exclude<EffectLayoutRegionRole, "full">,
  fieldWeight: VineLayoutRegionWeightResolver,
): NormalizedEndpointPair {
  let start = constrainPointToField(endpoints.start, role, fieldWeight);

  let end = constrainPointToField(endpoints.end, role, fieldWeight);

  for (let iteration = 0; iteration < 4; iteration++) {
    const midpoint: NormalizedPoint = {
      x: (start.x + end.x) * 0.5,
      y: (start.y + end.y) * 0.5,
    };

    if (fieldWeight(midpoint.x, midpoint.y) >= FIELD_ACTIVE_THRESHOLD) {
      break;
    }

    const startOuter = resolveOuterFieldAnchor(role, start);

    const endOuter = resolveOuterFieldAnchor(role, end);

    start = lerpPoint(start, startOuter, 0.18);

    end = lerpPoint(end, endOuter, 0.18);
  }

  return {
    start,
    end,
  };
}

/**
 * Final endpoint guard.
 */
function constrainPointToField(
  point: NormalizedPoint,
  role: Exclude<EffectLayoutRegionRole, "full">,
  fieldWeight: VineLayoutRegionWeightResolver,
): NormalizedPoint {
  const resolvedPoint = {
    x: clamp01(point.x),
    y: clamp01(point.y),
  };

  if (fieldWeight(resolvedPoint.x, resolvedPoint.y) >= FIELD_ACTIVE_THRESHOLD) {
    return resolvedPoint;
  }

  const outer = resolveOuterFieldAnchor(role, resolvedPoint);

  if (fieldWeight(outer.x, outer.y) < FIELD_ACTIVE_THRESHOLD) {
    return outer;
  }

  let active = outer;
  let inactive = resolvedPoint;

  for (let iteration = 0; iteration < 10; iteration++) {
    const middle = {
      x: (active.x + inactive.x) * 0.5,

      y: (active.y + inactive.y) * 0.5,
    };

    if (fieldWeight(middle.x, middle.y) >= FIELD_ACTIVE_THRESHOLD) {
      active = middle;
    } else {
      inactive = middle;
    }
  }

  return lerpPoint(active, outer, 0.1);
}

function resolveOuterFieldAnchor(
  role: Exclude<EffectLayoutRegionRole, "full">,
  point: NormalizedPoint,
): NormalizedPoint {
  switch (role) {
    case "top":
      return {
        x: point.x,
        y: 0,
      };

    case "bottom":
      return {
        x: point.x,
        y: 1,
      };

    case "left":
      return {
        x: 0,
        y: point.y,
      };

    case "right":
      return {
        x: 1,
        y: point.y,
      };

    case "top-left":
      return {
        x: 0,
        y: 0,
      };

    case "top-right":
      return {
        x: 1,
        y: 0,
      };

    case "bottom-left":
      return {
        x: 0,
        y: 1,
      };

    case "bottom-right":
      return {
        x: 1,
        y: 1,
      };

    default:
      return assertNever(role);
  }
}

function mirrorPairX(
  endpoints: NormalizedEndpointPair,
): NormalizedEndpointPair {
  return {
    start: {
      x: 1 - endpoints.start.x,
      y: endpoints.start.y,
    },

    end: {
      x: 1 - endpoints.end.x,
      y: endpoints.end.y,
    },
  };
}

function mirrorPairY(
  endpoints: NormalizedEndpointPair,
): NormalizedEndpointPair {
  return {
    start: {
      x: endpoints.start.x,
      y: 1 - endpoints.start.y,
    },

    end: {
      x: endpoints.end.x,
      y: 1 - endpoints.end.y,
    },
  };
}

function anchorCoverFlowToEdge(
  endpoints: NormalizedEndpointPair,
  edge: "left" | "right",
): NormalizedEndpointPair {
  if (edge === "left") {
    const minX = Math.min(endpoints.start.x, endpoints.end.x);

    return {
      start: {
        ...endpoints.start,
        x: clamp01(endpoints.start.x - minX),
      },

      end: {
        ...endpoints.end,
        x: clamp01(endpoints.end.x - minX),
      },
    };
  }

  const maxX = Math.max(endpoints.start.x, endpoints.end.x);

  const offset = 1 - maxX;

  return {
    start: {
      ...endpoints.start,
      x: clamp01(endpoints.start.x + offset),
    },

    end: {
      ...endpoints.end,
      x: clamp01(endpoints.end.x + offset),
    },
  };
}

function distributeCoverFlow(
  endpoints: NormalizedEndpointPair,
  pathIndex: number,
  pathCount: number,
  sample: (channel: number) => number,
  variation: number,
): NormalizedEndpointPair {
  const count = Math.max(1, pathCount);

  /**
   * Stratified horizontal lane.
   *
   * Every path owns a section of the wall instead of drawing its horizontal
   * position completely at random.
   */
  const lane = count <= 1 ? 0.5 : pathIndex / (count - 1);

  /**
   * Keep organic jitter, but never enough to destroy overall coverage.
   */
  const jitter = signed(sample(61)) * lerp(0.01, 0.055, variation);

  const targetX = clamp01(lane + jitter);

  const centerX = (endpoints.start.x + endpoints.end.x) * 0.5;

  const shiftX = targetX - centerX;

  let distributed: NormalizedEndpointPair = {
    start: {
      x: clamp01(endpoints.start.x + shiftX),
      y: endpoints.start.y,
    },

    end: {
      x: clamp01(endpoints.end.x + shiftX),
      y: endpoints.end.y,
    },
  };

  /**
   * Reserve edge families so Cover always reaches the complete wall.
   */
  if (pathIndex === 0) {
    distributed = anchorCoverFlowToEdge(distributed, "left");
  } else if (pathIndex === count - 1) {
    distributed = anchorCoverFlowToEdge(distributed, "right");
  }

  return distributed;
}

/**
 * Top canopy uses the normal wall-clinging population but reserves
 * deterministic runners for both outer edges.
 *
 * This prevents the visual canopy from shrinking toward the center while
 * preserving local organic runners through the interior.
 */
function createTopFullWidthFlow(
  endpoints: NormalizedEndpointPair,
  pathIndex: number,
  sample: (channel: number) => number,
  variation: number,
): NormalizedEndpointPair {
  const family = pathIndex % 8;

  /**
   * Left-edge structural runner.
   *
   * Keep it local rather than stretching a single path across the complete
   * canopy, but guarantee that the topology actually reaches x = 0.
   */
  if (family === 0) {
    const span = lerp(0.46, 0.72, sample(54));

    const localized = localizeHorizontalFlowToRange(
      endpoints,
      0,
      span,
      sample,
      variation,
    );

    return anchorHorizontalFlowToEdge(localized, "left");
  }

  /**
   * Right-edge structural runner.
   */
  if (family === 1) {
    const span = lerp(0.46, 0.72, sample(54));

    const localized = localizeHorizontalFlowToRange(
      endpoints,
      1 - span,
      1,
      sample,
      variation,
    );

    return anchorHorizontalFlowToEdge(localized, "right");
  }

  /**
   * Remaining runners stay locally distributed and organic.
   */
  const localized = localizeEdgeFlow(
    endpoints,
    "horizontal",
    sample,
    variation,
  );

  return pathIndex % 2 === 0 ? localized : mirrorPairX(localized);
}

function localizeHorizontalFlowToRange(
  endpoints: NormalizedEndpointPair,
  minX: number,
  maxX: number,
  sample: (channel: number) => number,
  variation: number,
): NormalizedEndpointPair {
  const drift = signed(sample(55)) * lerp(0.015, 0.07, variation);

  return {
    start: {
      x: remap01(endpoints.start.x, minX, maxX),

      y: clamp01(endpoints.start.y + drift),
    },

    end: {
      x: remap01(endpoints.end.x, minX, maxX),

      y: clamp01(endpoints.end.y - drift),
    },
  };
}

function anchorHorizontalFlowToEdge(
  endpoints: NormalizedEndpointPair,
  edge: "left" | "right",
): NormalizedEndpointPair {
  if (edge === "left") {
    if (endpoints.start.x <= endpoints.end.x) {
      return {
        ...endpoints,

        start: {
          ...endpoints.start,
          x: 0,
        },
      };
    }

    return {
      ...endpoints,

      end: {
        ...endpoints.end,
        x: 0,
      },
    };
  }

  if (endpoints.start.x >= endpoints.end.x) {
    return {
      ...endpoints,

      start: {
        ...endpoints.start,
        x: 1,
      },
    };
  }

  return {
    ...endpoints,

    end: {
      ...endpoints.end,
      x: 1,
    },
  };
}

function localizeEdgeFlow(
  endpoints: NormalizedEndpointPair,
  axis: "horizontal" | "vertical",
  sample: (channel: number) => number,
  variation: number,
): NormalizedEndpointPair {
  /**
   * A wall-clinging runner should occupy a local section of an edge instead
   * of stretching mechanically across the entire frame side.
   */
  const span = lerp(0.28, 0.68, sample(51));

  const center = lerp(span * 0.5, 1 - span * 0.5, sample(52));

  const start = center - span * 0.5;
  const drift = signed(sample(53)) * lerp(0.015, 0.07, variation);

  if (axis === "horizontal") {
    return {
      start: {
        x: remap01(endpoints.start.x, start, start + span),
        y: clamp01(endpoints.start.y + drift),
      },

      end: {
        x: remap01(endpoints.end.x, start, start + span),
        y: clamp01(endpoints.end.y - drift),
      },
    };
  }

  return {
    start: {
      x: clamp01(endpoints.start.x + drift),
      y: remap01(endpoints.start.y, start, start + span),
    },

    end: {
      x: clamp01(endpoints.end.x - drift),
      y: remap01(endpoints.end.y, start, start + span),
    },
  };
}

function remap01(value: number, min: number, max: number): number {
  return lerp(min, max, clamp01(value));
}

function blendEndpointPairs(
  from: NormalizedEndpointPair,
  to: NormalizedEndpointPair,
  amount: number,
): NormalizedEndpointPair {
  const t = clamp01(amount);

  return {
    start: lerpPoint(from.start, to.start, t),

    end: lerpPoint(from.end, to.end, t),
  };
}

function lerpPoint(
  from: NormalizedPoint,
  to: NormalizedPoint,
  amount: number,
): NormalizedPoint {
  return {
    x: lerp(from.x, to.x, amount),
    y: lerp(from.y, to.y, amount),
  };
}

function isCornerRole(
  role: EffectLayoutRegionRole,
): role is "top-left" | "top-right" | "bottom-left" | "bottom-right" {
  return (
    role === "top-left" ||
    role === "top-right" ||
    role === "bottom-left" ||
    role === "bottom-right"
  );
}

function assertNever(value: never): never {
  throw new Error(`Unhandled foliage layout role: ${String(value)}`);
}

function normalizedToBounds(
  point: NormalizedPoint,
  depth: number,
  bounds: NetworkBounds,
): Vec3 {
  return new Vec3(
    lerp(bounds.min.x, bounds.max.x, clamp01(point.x)),

    lerp(bounds.min.y, bounds.max.y, clamp01(point.y)),

    depth,
  );
}

function coverageSample(
  seed: number,
  index: number,
  total: number,
  channel: number,
  variation: number,
): number {
  const uniform = fract(
    (index + 0.5) * 0.618033988749895 +
      (channel + 1) * 0.414213562373095 +
      0.5 / Math.max(1, total),
  );

  return lerp(uniform, seededSample(seed, index, channel), variation);
}

function seededSample(seed: number, index: number, channel: number): number {
  const value =
    Math.sin(seed * 12.9898 + (index + 1) * 78.233 + (channel + 1) * 37.719) *
    43758.5453;

  return fract(value);
}

function signed(value: number): number {
  return value * 2 - 1;
}

function fract(value: number): number {
  return value - Math.floor(value);
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
