export interface FluidColor {
  r: number;
  g: number;
  b: number;
}

const CSS_VARIABLE_PATTERN = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g;

function resolveVariables(element: Element, input: string): string {
  let result = input;

  for (let depth = 0; depth < 8 && result.includes("var("); depth += 1) {
    const computedStyle = window.getComputedStyle(element);
    const next = result.replace(
      CSS_VARIABLE_PATTERN,
      (_match: string, name: string, fallback?: string) =>
        computedStyle.getPropertyValue(name).trim() || fallback?.trim() || ""
    );
    if (next === result) break;
    result = next;
  }

  return result.trim();
}

function parseHex(value: string): FluidColor | null {
  const hex = value.slice(1);
  if (![3, 4, 6, 8].includes(hex.length)) return null;
  const expanded =
    hex.length <= 4
      ? hex
          .split("")
          .map((character) => character + character)
          .join("")
      : hex;
  const rgb = expanded.slice(0, 6);
  const numeric = Number.parseInt(rgb, 16);
  if (!Number.isFinite(numeric)) return null;
  return {
    r: ((numeric >> 16) & 255) / 255,
    g: ((numeric >> 8) & 255) / 255,
    b: (numeric & 255) / 255
  };
}

function parseRgb(value: string): FluidColor | null {
  const match = value.match(/^rgba?\((.+)\)$/i);
  if (!match?.[1]) return null;
  const parts = match[1]
    .replace(/\s*\/\s*/, ",")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 3) return null;

  const channel = (part: string): number =>
    part.endsWith("%")
      ? Math.min(1, Math.max(0, Number.parseFloat(part) / 100))
      : Math.min(1, Math.max(0, Number.parseFloat(part) / 255));
  const color = {
    r: channel(parts[0] ?? "0"),
    g: channel(parts[1] ?? "0"),
    b: channel(parts[2] ?? "0")
  };
  return Object.values(color).every(Number.isFinite) ? color : null;
}

function normalizeColor(input: string): string | null {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return null;
  context.fillStyle = "#010203";
  context.fillStyle = input;
  const normalized = context.fillStyle;
  return normalized === "#010203" && input.toLowerCase() !== "#010203" ? null : normalized;
}

export function resolveFluidColor(
  element: Element,
  input: string,
  fallback: FluidColor = { r: 0.08, g: 0.08, b: 0.08 }
): FluidColor {
  const resolved = resolveVariables(element, input);
  if (!resolved || resolved.includes("var(")) return fallback;

  const normalized = normalizeColor(resolved)?.toLowerCase();
  if (!normalized) return fallback;
  return (
    (normalized.startsWith("#") ? parseHex(normalized) : null) ??
    (normalized.startsWith("rgb") ? parseRgb(normalized) : null) ??
    fallback
  );
}
