export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

const CSS_VARIABLE_PATTERN = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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

export function resolveCssColor(element: Element, input: string, fallback: string): string {
  const resolved = resolveVariables(element, input);
  return resolved && !resolved.includes("var(") ? resolved : fallback;
}

function parseHex(input: string): RgbaColor | null {
  const value = input.slice(1);
  if (![3, 4, 6, 8].includes(value.length)) return null;

  const expanded =
    value.length <= 4
      ? value
          .split("")
          .map((character) => character + character)
          .join("")
      : value;
  const numeric = Number.parseInt(expanded, 16);
  if (!Number.isFinite(numeric)) return null;

  const hasAlpha = expanded.length === 8;
  return {
    r: (numeric >> (hasAlpha ? 24 : 16)) & 255,
    g: (numeric >> (hasAlpha ? 16 : 8)) & 255,
    b: (numeric >> (hasAlpha ? 8 : 0)) & 255,
    a: hasAlpha ? (numeric & 255) / 255 : 1
  };
}

function parseRgbChannel(value: string): number {
  return value.endsWith("%")
    ? (clamp(Number.parseFloat(value), 0, 100) / 100) * 255
    : clamp(Number.parseFloat(value), 0, 255);
}

function parseAlpha(value: string | undefined): number {
  if (!value) return 1;
  return value.endsWith("%")
    ? clamp(Number.parseFloat(value) / 100, 0, 1)
    : clamp(Number.parseFloat(value), 0, 1);
}

function parseRgb(input: string): RgbaColor | null {
  const match = input.match(/^rgba?\((.+)\)$/i);
  if (!match?.[1]) return null;

  const normalized = match[1].replace(/\s*\/\s*/, ",");
  const values = normalized.split(/[\s,]+/).filter(Boolean);
  if (values.length < 3) return null;

  const r = parseRgbChannel(values[0] ?? "0");
  const g = parseRgbChannel(values[1] ?? "0");
  const b = parseRgbChannel(values[2] ?? "0");
  const a = parseAlpha(values[3]);
  if (![r, g, b, a].every(Number.isFinite)) return null;
  return { r, g, b, a };
}

function hueToRgb(p: number, q: number, hue: number): number {
  let t = hue;
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function parseHsl(input: string): RgbaColor | null {
  const match = input.match(/^hsla?\((.+)\)$/i);
  if (!match?.[1]) return null;

  const normalized = match[1].replace(/\s*\/\s*/, ",");
  const values = normalized.split(/[\s,]+/).filter(Boolean);
  if (values.length < 3) return null;

  const hue = (((Number.parseFloat(values[0] ?? "0") % 360) + 360) % 360) / 360;
  const saturation = clamp(Number.parseFloat(values[1] ?? "0") / 100, 0, 1);
  const lightness = clamp(Number.parseFloat(values[2] ?? "0") / 100, 0, 1);
  const alpha = parseAlpha(values[3]);
  if (![hue, saturation, lightness, alpha].every(Number.isFinite)) return null;

  if (saturation === 0) {
    const channel = lightness * 255;
    return { r: channel, g: channel, b: channel, a: alpha };
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return {
    r: hueToRgb(p, q, hue + 1 / 3) * 255,
    g: hueToRgb(p, q, hue) * 255,
    b: hueToRgb(p, q, hue - 1 / 3) * 255,
    a: alpha
  };
}

function normalizeWithBrowser(input: string): string | null {
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return null;

  probe.fillStyle = "#010203";
  probe.fillStyle = input;
  const normalized = probe.fillStyle;
  return normalized === "#010203" && input.toLowerCase() !== "#010203" ? null : normalized;
}

export function parseCssColor(input: string, fallback: RgbaColor): RgbaColor {
  const value = input.trim().toLowerCase();
  const parsed =
    (value.startsWith("#") ? parseHex(value) : null) ??
    (value.startsWith("rgb") ? parseRgb(value) : null) ??
    (value.startsWith("hsl") ? parseHsl(value) : null);

  if (parsed) return parsed;
  if (value === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  const normalized = normalizeWithBrowser(input);
  if (!normalized || normalized.toLowerCase() === value) return fallback;
  return parseCssColor(normalized, fallback);
}

export function resolveRgbaColor(
  element: Element,
  input: string,
  fallbackCss: string,
  fallback: RgbaColor
): RgbaColor {
  return parseCssColor(resolveCssColor(element, input, fallbackCss), fallback);
}
