import type { NormalizedRect } from "./types";

export function clampNormalizedRect(rect: NormalizedRect): NormalizedRect {
  const x = clamp01(finiteOr(rect.x, 0));
  const y = clamp01(finiteOr(rect.y, 0));
  const width = clamp(finiteOr(rect.width, 0), 0, 1 - x);
  const height = clamp(finiteOr(rect.height, 0), 0, 1 - y);

  return { x, y, width, height };
}

export function mapNormalizedRect(
  parent: NormalizedRect,
  child: NormalizedRect,
): NormalizedRect {
  const resolvedParent = clampNormalizedRect(parent);
  const resolvedChild = clampNormalizedRect(child);

  return clampNormalizedRect({
    x: resolvedParent.x + resolvedChild.x * resolvedParent.width,
    y: resolvedParent.y + resolvedChild.y * resolvedParent.height,
    width: resolvedChild.width * resolvedParent.width,
    height: resolvedChild.height * resolvedParent.height,
  });
}

export function containsNormalizedPoint(
  rect: NormalizedRect,
  x: number,
  y: number,
): boolean {
  const resolved = clampNormalizedRect(rect);

  return (
    x >= resolved.x &&
    x <= resolved.x + resolved.width &&
    y >= resolved.y &&
    y <= resolved.y + resolved.height
  );
}

export function intersectsNormalizedRect(
  left: NormalizedRect,
  right: NormalizedRect,
): boolean {
  const a = clampNormalizedRect(left);
  const b = clampNormalizedRect(right);

  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
