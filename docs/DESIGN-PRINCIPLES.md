# Design principles — elemental-fx

These are the rules this project follows for styling and theming. They exist so that changing a color, a shadow, or an animation curve never requires touching more than one file.

## 1. Styles never live in components

A component file (`button.tsx`, `card.tsx`, an effect's canvas renderer) should never contain a raw color, a raw pixel value for spacing, or a raw easing curve. If you find yourself writing `#3B82F6` or `rgba(0,0,0,0.2)` inside a `.tsx` file, stop — that value belongs in `styles/tokens.css`, referenced by name.

```tsx
// ❌ avoid
<div className="shadow-[0_10px_30px_rgba(59,130,246,0.3)]">

// ✅ instead
<div className="shadow-elegant">
```

## 2. Tokens are named by role, not by value

Don't name a token after what it looks like (`--blue-500`). Name it after what it's _for_ (`--color-primary`). This is what makes a token survive a rebrand: the name stays the same, only the value under it changes.

```css
:root {
  --color-primary: 217 91% 60%; /* HSL components, no hsl() wrapper here */
  --color-danger: 0 84% 60%;
  --space-card-padding: 1.5rem;
  --radius-card: 0.75rem;
}
```

## 3. One color format, everywhere: HSL components only

Store colors as `H S% L%` (no `hsl(...)` wrapper, no `rgb`, no hex) inside `tokens.css`. This is what lets Tailwind apply opacity modifiers correctly:

```ts
// tailwind.config.ts
colors: {
  primary: "hsl(var(--color-primary) / <alpha-value>)",
}
```

```tsx
<div className="bg-primary/40" /> // works because the token is raw HSL components
```

Mixing formats (some tokens in hex, some in HSL) is the most common source of "the opacity slash doesn't work" bugs. Pick HSL and never deviate.

## 4. Every color needs a light and a dark value

No token is complete until it has a `[data-theme="dark"]` override. A token defined only for light mode is a bug waiting to surface the first time someone flips the theme.

```css
:root {
  --color-primary: 217 91% 60%;
  --surface-page: 40 20% 98%;
  --text-primary: 220 15% 15%;
}
[data-theme="dark"] {
  --color-primary: 217 91% 70%;
  --surface-page: 220 15% 10%;
  --text-primary: 40 20% 95%;
}
```

Before shipping any new token, check both modes by eye. The usual failure is light text on a light background after a dark-mode toggle — always verify contrast in both states, not just the one you were looking at while building.

## 5. Reusable visual treatments become variants, not one-offs

If you need a special look for a button used in exactly one place, resist the urge to override it inline. Add a named variant instead — it documents intent and becomes reusable the next time you need the same look.

```tsx
const buttonVariants = cva("...", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      hero: "bg-surface-overlay text-on-overlay border border-overlay-border",
    },
  },
});
```

## 6. Gradients, shadows, and motion are tokens too

Not just colors. Anything that repeats across the app — a signature gradient, an elevation shadow, a transition curve — gets a name in `tokens.css` so it's defined once and reused everywhere.

```css
:root {
  --gradient-primary: linear-gradient(
    135deg,
    hsl(var(--color-primary)),
    hsl(var(--color-primary-glow))
  );
  --shadow-elegant: 0 10px 30px -10px hsl(var(--color-primary) / 0.3);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 7. Radix Colors is the source, `tokens.css` is the interface

Don't hand-pick 9 shades of blue and hope they're accessible. Pull the scale from `@radix-ui/colors` (already contrast-checked) and map only the steps you actually use into semantic names:

```ts
// styles/radix-palette.ts
import { blue, blueDark } from "@radix-ui/colors";

export const primaryScale = {
  light: blue.blue9,
  lightHover: blue.blue10,
  dark: blueDark.blue9,
};
```

`tokens.css` should never import Radix directly — it consumes the already-resolved values from `radix-palette.ts`. That keeps the palette swappable without touching every token.

## 8. Canvas effects read tokens, they don't hardcode colors

Both `grid-effects` and `fluid-effects` accept a color through their config — never bake a hex value into an effect's default. Read it from the resolved CSS variable at mount time, so an effect automatically matches whatever theme is active:

```ts
const primary = getComputedStyle(document.documentElement).getPropertyValue(
  "--color-primary",
);

mountWaterEffect(canvas, { color: `hsl(${primary})` });
```

This is what lets `water`, `sand`, `wind`, `smoke`, and `ink` all stay visually consistent with the rest of the app without each effect maintaining its own palette.

## 9. When in doubt, less token sprawl beats more tokens

Don't create a new token for a one-time value. A token is worth naming only if it will be reused in at least two places, or if it represents a meaningful design decision (brand color, standard elevation, standard easing). Everything else is just a local Tailwind utility class.
