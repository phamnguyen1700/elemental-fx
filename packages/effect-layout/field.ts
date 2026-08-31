import type { PlacedEffectLayout, ResolvedEffectLayout } from "./types";

export function getEffectLayoutWeight(
  layout: ResolvedEffectLayout,
  x: number,
  y: number,
): number {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
  if (x < 0 || x > 1 || y < 0 || y > 1) return 0;

  switch (layout.mode) {
    case "cover":
    case "fill":
      return 1;

    case "top":
      return edgeBandWeight(y, layout.extent, layout.feather);

    case "bottom":
      return edgeBandWeight(1 - y, layout.extent, layout.feather);

    case "sides":
      return Math.max(
        edgeBandWeight(x, layout.extent, layout.feather),
        edgeBandWeight(1 - x, layout.extent, layout.feather),
      );

    case "corners":
      return cornerFieldWeight(x, y, layout.extent, layout.feather);

    case "frame":
      return roundedFrameWeight(
        x,
        y,
        layout.extent,
        layout.cornerRadius,
        layout.feather,
      );

    default:
      return 0;
  }
}

export function getPlacedEffectLayoutWeight(
  layout: PlacedEffectLayout,
  x: number,
  y: number,
): number {
  const { area } = layout;

  if (
    x < area.x ||
    x > area.x + area.width ||
    y < area.y ||
    y > area.y + area.height
  ) {
    return 0;
  }

  const localX = area.width > 0 ? (x - area.x) / area.width : 0;
  const localY = area.height > 0 ? (y - area.y) / area.height : 0;

  return getEffectLayoutWeight(layout, localX, localY);
}

export function isPointInEffectLayout(
  layout: ResolvedEffectLayout,
  x: number,
  y: number,
  threshold = 0.001,
): boolean {
  return getEffectLayoutWeight(layout, x, y) >= clamp01(threshold);
}

function edgeBandWeight(
  distanceFromOuterEdge: number,
  extent: number,
  feather: number,
): number {
  if (distanceFromOuterEdge < 0 || distanceFromOuterEdge > extent) {
    return 0;
  }

  const resolvedFeather = Math.min(Math.max(0, feather), extent);

  if (resolvedFeather <= 0) return 1;

  return (
    1 - smoothstep(extent - resolvedFeather, extent, distanceFromOuterEdge)
  );
}

function cornerFieldWeight(
  x: number,
  y: number,
  radius: number,
  feather: number,
): number {
  const nearestCornerDistance = Math.min(
    Math.hypot(x, y),
    Math.hypot(1 - x, y),
    Math.hypot(x, 1 - y),
    Math.hypot(1 - x, 1 - y),
  );

  if (nearestCornerDistance > radius) return 0;

  const resolvedFeather = Math.min(Math.max(0, feather), radius);

  if (resolvedFeather <= 0) return 1;

  return (
    1 - smoothstep(radius - resolvedFeather, radius, nearestCornerDistance)
  );
}

function roundedFrameWeight(
  x: number,
  y: number,
  extent: number,
  cornerRadius: number,
  feather: number,
): number {
  const innerHalfWidth = Math.max(0, 0.5 - extent);
  const innerHalfHeight = Math.max(0, 0.5 - extent);

  if (innerHalfWidth <= 0 || innerHalfHeight <= 0) {
    return 1;
  }

  const maxRadius = Math.min(innerHalfWidth, innerHalfHeight);
  const radius = clamp(cornerRadius, 0, maxRadius);

  const signedDistance = signedDistanceToRoundedRect(
    x - 0.5,
    y - 0.5,
    innerHalfWidth,
    innerHalfHeight,
    radius,
  );

  const resolvedFeather = Math.max(0, feather);

  if (resolvedFeather <= 0) {
    return signedDistance >= 0 ? 1 : 0;
  }

  return smoothstep(-resolvedFeather, 0, signedDistance);
}

function signedDistanceToRoundedRect(
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
  radius: number,
): number {
  const coreHalfWidth = Math.max(0, halfWidth - radius);
  const coreHalfHeight = Math.max(0, halfHeight - radius);

  const qx = Math.abs(x) - coreHalfWidth;
  const qy = Math.abs(y) - coreHalfHeight;

  const outsideDistance = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));

  const insideDistance = Math.min(Math.max(qx, qy), 0);

  return outsideDistance + insideDistance - radius;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }

  const amount = clamp01((value - edge0) / (edge1 - edge0));
  return amount * amount * (3 - 2 * amount);
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
