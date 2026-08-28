# elemental-fx

CLI for adding local elemental-fx effect layers to React, Next, and Vite projects.

## Usage

```bash
npx elemental-fx add water-surface
npx elemental-fx add sand-surface
npx elemental-fx add ink-cursor
```

Generated files are local React layer components. They render a canvas and call the matching framework-free runtime engine:

```txt
src/components/effects/water-surface.tsx
src/components/effects/sand-surface.tsx
src/components/effects/ink-cursor.tsx
```

If the project has no `src/` directory, files are created under `components/effects/`.

## Options

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

## Example

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

## Packages

- `@elemental-fx/canvas-effects` provides Canvas 2D runtime effects.
- `@elemental-fx/fluid-effects` provides WebGL fluid runtime effects.

## License

MIT
