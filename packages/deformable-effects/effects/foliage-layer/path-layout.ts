import { Vec3 } from "../../core/math/vec3";
import type {
  NetworkBounds,
  NetworkPathEndpointContext,
  NetworkPathEndpointResolver
} from "../../topologies";

export interface FoliagePathLayoutOptions {
  seed: number;
  variation: number;
}

export interface FoliagePathEndpointResolvers {
  startPosition: NetworkPathEndpointResolver;
  endPosition: NetworkPathEndpointResolver;
}

/**
 * Distributes independent climbing paths across the wall instead of arranging
 * them as parallel lanes. The topology remains generic; this is the
 * Bougainvillea-oriented placement policy layered on top of it.
 */
export function createFoliagePathEndpointResolvers(
  options: FoliagePathLayoutOptions
): FoliagePathEndpointResolvers {
  const resolvePair = (context: NetworkPathEndpointContext) =>
    createFoliagePathEndpoints(context, options);

  return {
    startPosition: (context) => resolvePair(context).start,
    endPosition: (context) => resolvePair(context).end
  };
}

export function createFoliagePathEndpoints(
  context: NetworkPathEndpointContext,
  options: FoliagePathLayoutOptions
): { start: Vec3; end: Vec3 } {
  const { bounds, pathIndex, pathCount } = context;
  const variation = clamp01(options.variation);
  const family = pathIndex % 10;
  const coverage = (channel: number) =>
    coverageSample(options.seed, pathIndex, pathCount, channel, variation);
  const depth = lerp(bounds.min.z, bounds.max.z, coverage(13));
  let start: NormalizedPoint;
  let end: NormalizedPoint;

  if (family <= 4) {
    const lane = coverage(1);
    start = {
      x: lane,
      y: lerp(0.78, 1, coverage(2))
    };
    end = {
      x: clamp01(lane + signed(coverage(3)) * lerp(0.08, 0.28, variation)),
      y: lerp(0, 0.22, coverage(4))
    };
  } else if (family === 5) {
    start = { x: lerp(0, 0.18, coverage(1)), y: lerp(0.62, 1, coverage(2)) };
    end = { x: lerp(0.76, 1, coverage(3)), y: lerp(0, 0.42, coverage(4)) };
  } else if (family === 6) {
    start = { x: lerp(0.82, 1, coverage(1)), y: lerp(0.62, 1, coverage(2)) };
    end = { x: lerp(0, 0.24, coverage(3)), y: lerp(0, 0.42, coverage(4)) };
  } else if (family === 7) {
    const lane = coverage(2);
    start = { x: 0, y: lane };
    end = {
      x: lerp(0.82, 1, coverage(3)),
      y: clamp01(lane + signed(coverage(4)) * lerp(0.12, 0.38, variation))
    };
  } else if (family === 8) {
    const lane = coverage(2);
    start = { x: 1, y: lane };
    end = {
      x: lerp(0, 0.18, coverage(3)),
      y: clamp01(lane + signed(coverage(4)) * lerp(0.12, 0.38, variation))
    };
  } else {
    const fromLeft = pathIndex % 2 === 0;
    start = {
      x: fromLeft ? 0 : 1,
      y: lerp(0.45, 0.92, coverage(2))
    };
    end = {
      x: lerp(0.3, 0.7, coverage(3)),
      y: lerp(0, 0.34, coverage(4))
    };
  }

  return {
    start: normalizedToBounds(start, depth, bounds),
    end: normalizedToBounds(end, depth, bounds)
  };
}

interface NormalizedPoint {
  x: number;
  y: number;
}

function normalizedToBounds(point: NormalizedPoint, depth: number, bounds: NetworkBounds): Vec3 {
  return new Vec3(
    lerp(bounds.min.x, bounds.max.x, clamp01(point.x)),
    lerp(bounds.min.y, bounds.max.y, clamp01(point.y)),
    depth
  );
}

function coverageSample(
  seed: number,
  index: number,
  total: number,
  channel: number,
  variation: number
): number {
  const uniform = fract(
    (index + 0.5) * 0.618033988749895 + (channel + 1) * 0.414213562373095 + 0.5 / Math.max(1, total)
  );
  return lerp(uniform, seededSample(seed, index, channel), variation);
}

function seededSample(seed: number, index: number, channel: number): number {
  const value =
    Math.sin(seed * 12.9898 + (index + 1) * 78.233 + (channel + 1) * 37.719) * 43758.5453;
  return fract(value);
}

function signed(value: number): number {
  return value * 2 - 1;
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}
