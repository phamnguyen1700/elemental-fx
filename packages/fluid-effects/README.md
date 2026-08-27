# @elemental-fx/fluid-effects

Reusable WebGL fluid effects for elemental-fx, with framework-free APIs and optional React wrappers.

## Install

```bash
npm install @elemental-fx/fluid-effects
```

## Framework-free usage

```ts
import { createInkCursorEffect } from "@elemental-fx/fluid-effects";

const canvas = document.querySelector("canvas");

const effect = createInkCursorEffect(canvas, {
  color: "hsl(222 22% 9%)",
  curl: 28
});
```

## React

```tsx
import { InkCursor } from "@elemental-fx/fluid-effects/react";

export function Background() {
  return (
    <div style={{ width: "100%", height: 500 }}>
      <InkCursor color="hsl(222 22% 9%)" curl={28} />
    </div>
  );
}
```

Requires WebGL 2 support.

## Repository

elemental-fx is developed as a monorepo containing Canvas, WebGL fluid, and CLI packages.

## License

MIT
