# @elemental-fx/canvas-effects

Reusable Canvas 2D effects for elemental-fx, with framework-free APIs and optional React wrappers.

## Install

```bash
npm install @elemental-fx/canvas-effects
```

Framework-free usage
```bash
import { createWaterSurfaceEffect } from "@elemental-fx/canvas-effects";

const canvas = document.querySelector("canvas");

const effect = createWaterSurfaceEffect(canvas, {
  color: "hsl(193 67% 36%)",
  clickStrength: 10,
});
```
React
```bash
import { WaterSurface } from "@elemental-fx/canvas-effects/react";

export function Hero() {
  return (
    <div style={{ width: "100%", height: 500 }}>
      <WaterSurface color="hsl(193 67% 36%)" />
    </div>
  );
}
```
Repository
elemental-fx is developed as a monorepo containing Canvas, WebGL fluid, and CLI packages.
