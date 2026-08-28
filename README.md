# elemental-fx

A reusable React and TypeScript foundation for interactive Canvas 2D and WebGL effects. Clone it into a project, customize the neutral tokens or pass colors directly, and import only the runtime family the page needs.

## Implemented Effects

- `WaterSurface`: Canvas 2D height-field waves with hover impulses and click ripples.
- `SandSurface`: Canvas 2D dune height field with mass-displacing trails and granular settling.
- `InkCursor`: WebGL 2 stable-fluid simulation with configurable ink splats.

The framework-free factories are available from each package root. React wrappers are separate entry points so engine code stays independent from React.

```tsx
import { SandSurface, WaterSurface } from "@elemental-fx/canvas-effects/react";
import { InkCursor } from "@elemental-fx/fluid-effects/react";

export function Effects() {
  return (
    <>
      <WaterSurface color="hsl(193 67% 36%)" clickStrength={10} />
      <SandSurface dragRadius={8} duneHeight={8} pressStrength={8} />
      <InkCursor color="hsl(222 22% 9%)" curl={28} />
    </>
  );
}
```

Both components fill their parent. Give the parent a stable width and height. Defaults resolve neutral `--efx-*` variables from `styles/tokens.css`, while any valid browser CSS color can be supplied through props.

## CLI Source Layers

For project-level customization, use the hybrid CLI flow. The CLI creates a local React layer file, while the Canvas/WebGL engine stays inside the package dependency.

```bash
npx elemental-fx add water-surface
npx elemental-fx add sand-surface
npx elemental-fx add ink-cursor
```

Generated files:

```txt
src/components/effects/water-surface.tsx
src/components/effects/sand-surface.tsx
src/components/effects/ink-cursor.tsx
```

If the project has no `src/` directory, files are created under `components/effects/`.

The generated files render canvas layers and call the core engine from the runtime package. They do not own page layout or accept `children`; place them inside an existing positioned container and control stacking with `z-index`.

```tsx
import { WaterSurface } from "@/components/effects/water-surface";

export function Hero() {
  return (
    <section className="relative h-[500px] overflow-hidden">
      <WaterSurface className="absolute inset-0 z-0" color="white" />
      <div className="relative z-10">Launch faster</div>
    </section>
  );
}
```

CLI options:

```bash
npx elemental-fx add water-surface --path app/effects
npx elemental-fx add water-surface --overwrite
npx elemental-fx add water-surface --dry-run
npx elemental-fx add water-surface --no-install
```

- `--path <dir>` writes the generated layer into a custom directory.
- `--overwrite` replaces an existing file.
- `--dry-run` prints the target path and source without writing or installing.
- `--no-install` writes the file but skips package installation.

Runtime flow:

```txt
Generated WaterSurface layer
-> renders <canvas>
-> calls createWaterSurfaceEffect(canvas, config)
-> engine handles pointer input, resize, animation, and cleanup
```

## Playground Example

The repository keeps a Vite playground at `examples/vite`. It is the visual test bed for the library and can later grow into a public component gallery.

```bash
npm run dev
```

Open `http://127.0.0.1:5173` to preview `WaterSurface` and `InkCursor` together. The playground source is committed; generated output such as `examples/vite/dist` and `examples/vite/node_modules` stays ignored.

## Development

```bash
npm install
npm run typecheck
npm test
npm run lint
npm run build
npm run dev
```

`InkCursor` requires WebGL 2 and `EXT_color_buffer_float`; use its `onError` prop to provide a consumer-specific fallback.
