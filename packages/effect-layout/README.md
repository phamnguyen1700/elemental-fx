# @elemental-fx/effect-layout

Engine-agnostic normalized composition primitives for Elemental FX.

This package is intentionally placed at the monorepo package layer so it can
be reused by `canvas-effects`, `deformable-effects`, `fluid-effects`, and future
effect engines.

It has no React, Canvas2D, WebGL, fluid, topology, or physics dependency.

## Generic modes

```ts
type EffectLayoutMode =
  | "cover"
  | "fill"
  | "frame"
  | "sides"
  | "corners"
  | "top"
  | "bottom";
```

`canopy` is intentionally not generic. Foliage can later define it as:

```text
canopy = generic layout "top" + hanging vines + foliage-specific density tuning
```

## Usage

```ts
import {
  allocateWeightedCounts,
  resolveEffectLayout,
  resolveEffectLayoutInArea,
} from "@elemental-fx/effect-layout";

const frame = resolveEffectLayout("frame");

const placed = resolveEffectLayoutInArea("frame", {
  width: 0.9,
  height: 0.8,
  alignX: "center",
  alignY: "center",
});

const budgets = allocateWeightedCounts(
  20,
  frame.regions.map((region) => region.weight),
);
```

The package only answers where effect regions are. Each consuming engine decides
what those regions mean visually.

For example, `fill` and `cover` both use a full normalized region, but:

- vines can translate `fill` into more paths and tighter growth spacing;
- particles can translate it into more emitters/spawn density;
- fluid can translate it into broader source coverage;
- Canvas2D effects can translate it into more samples/sprites/strokes.

## Install into this monorepo

Extract the ZIP at the repository root. It creates:

```text
packages/effect-layout/
```

The root workspace already matches `packages/*`, so no workspace edit is needed.

Then run:

```bash
npm install
npm run typecheck -w @elemental-fx/effect-layout
npm run build -w @elemental-fx/effect-layout
npm test
```
