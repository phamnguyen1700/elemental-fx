# @elemental-fx/effect-layout

Engine-agnostic normalized composition primitives for Elemental FX.

This package is intentionally placed at the monorepo package layer so it can
be reused by `canvas-effects`, `deformable-effects`, `fluid-effects`, and future
effect engines.

It has no React, Canvas2D, WebGL, fluid, topology, or physics dependency.

## Generic modes

```ts
type EffectLayoutMode =
  "cover" | "fill" | "frame" | "sides" | "corners" | "top" | "bottom";
```

`canopy` is intentionally not generic. Foliage can later define it as:

```text
canopy = generic layout "top" + hanging vines + foliage-specific density tuning
```

## Layout semantics

Each layout mode describes **where effect regions are placed**, not how a specific engine renders them.

The consuming effect decides how much visual density, simulation, or decoration to create inside those regions.

### `cover`

Uses the full available effect area with **natural coverage**.

It is intended for effects that should spread throughout the composition while still allowing organic gaps and variation.

````text
┌────────────────────────────┐
│  ███    █████     ███      │
│      ███      ███      ██  │
│ ███       ███      ███     │
│     ███       ███       ██ │
│ ██      ███        ███     │
└────────────────────────────┘

Typical interpretation:

vines → organic vine coverage with natural empty spaces
particles → particles distributed across the whole area
fluid → sources distributed across the simulation area
Canvas2D → decorative strokes or sprites spread naturally
fill

Uses the full available effect area like cover, but represents dense or aggressive coverage.

The geometry is intentionally the same as cover. The consuming engine decides how to increase visual density.

┌────────────────────────────┐
│████████████████████████████│
│████████████████████████████│
│████████████████████████████│
│████████████████████████████│
│████████████████████████████│
└────────────────────────────┘

Typical interpretation:

vines → more paths, tighter growth spacing, denser foliage
particles → higher spawn density
fluid → broader or stronger source coverage
Canvas2D → more samples, strokes, sprites, or repeated elements
frame

Creates regions around the perimeter while keeping the center available for content.

Useful for hero sections, logos, headings, product names, or interactive UI placed in the middle.

┌████████████████████████████┐
██                          ██
██                          ██
██       CONTENT AREA       ██
██                          ██
██                          ██
└████████████████████████████┘

The resolved regions are:

top
bottom
left
right

Typical interpretation:

vines → foliage growing around a hero title
particles → decorative perimeter particles
fluid → active fluid regions around the outside
Canvas2D → border-like procedural decoration
sides

Creates independent regions on the left and right sides while keeping the center open.

Useful when the middle of the screen needs a large readable content area.

┌────────────────────────────┐
│████                    ████│
│████                    ████│
│████      CONTENT       ████│
│████                    ████│
│████                    ████│
└────────────────────────────┘

The resolved regions are:

left
right

Typical interpretation:

vines → vegetation growing inward from both sides
particles → side emitters
fluid → fluid sources entering from left and right
Canvas2D → decorative side elements
corners

Creates four independent regions around the corners.

This produces a lighter, more editorial composition than frame.

┌████                    ████┐
│████                    ████│
│                            │
│          CONTENT           │
│                            │
│████                    ████│
└████                    ████┘

The resolved regions are:

top-left
top-right
bottom-left
bottom-right

Typical interpretation:

vines → organic foliage clusters in each corner
particles → corner-based emitters or accents
fluid → localized corner disturbances
Canvas2D → decorative corner ornaments
top

Creates a horizontal region along the top of the effect area.

┌████████████████████████████┐
│                            │
│                            │
│          CONTENT           │
│                            │
│                            │
└────────────────────────────┘

Typical interpretation:

vines → upper vegetation or hanging foliage source
particles → particles emitted from above
fluid → top-edge source region
Canvas2D → decorative top border or header effect

Effect-specific packages may build higher-level semantic presets from this mode.

For example:

foliage canopy
=
generic "top" layout
+
hanging vines
+
foliage-specific density and growth tuning
bottom

Creates a horizontal region along the bottom of the effect area.

┌────────────────────────────┐
│                            │
│                            │
│          CONTENT           │
│                            │
│                            │
└████████████████████████████┘

Typical interpretation:

vines → vegetation growing upward from the bottom
particles → ground-level particle emitters
fluid → bottom-edge source region
Canvas2D → decorative footer or ground effect
Layout vs rendering

@elemental-fx/effect-layout only describes composition geometry.

For example:

const layout = resolveEffectLayout("frame");

may return regions conceptually equivalent to:

top
left
right
bottom

The package does not decide whether those regions contain vines, particles, fluid, sprites, or another effect.

That responsibility belongs to the consuming package:

@elemental-fx/effect-layout
        ↓
normalized regions
        ↓
┌───────────────────────┐
│ canvas-effects        │
│ deformable-effects    │
│ fluid-effects         │
│ future effect engines │
└───────────────────────┘

This keeps spatial composition reusable while allowing each effect engine to interpret the same layout differently.

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
````

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
