import { ELEMENTAL_FX_VERSION } from "../version";
import { inkCursorTemplate } from "./templates/ink-cursor/react-layer";
import { sandSurfaceTemplate } from "./templates/sand-surface/react-layer";
import { waterSurfaceTemplate } from "./templates/water-surface/react-layer";

export interface EffectDefinition {
  name: string;
  fileName: string;
  dependencies: string[];
  template(): string;
}

const EFFECTS: Record<string, EffectDefinition> = {
  "water-surface": {
    name: "water-surface",
    fileName: "water-surface.tsx",
    dependencies: [`@elemental-fx/canvas-effects@${ELEMENTAL_FX_VERSION}`],
    template: waterSurfaceTemplate
  },

  "sand-surface": {
    name: "sand-surface",
    fileName: "sand-surface.tsx",
    dependencies: [`@elemental-fx/canvas-effects@${ELEMENTAL_FX_VERSION}`],
    template: sandSurfaceTemplate
  },

  "ink-cursor": {
    name: "ink-cursor",
    fileName: "ink-cursor.tsx",
    dependencies: [`@elemental-fx/fluid-effects@${ELEMENTAL_FX_VERSION}`],
    template: inkCursorTemplate
  }
};

export function getEffectDefinition(name: string): EffectDefinition {
  const effect = EFFECTS[name];

  if (!effect) {
    const names = Object.keys(EFFECTS).join(", ");
    throw new Error(`Unknown effect "${name}". Available effects: ${names}.`);
  }

  return effect;
}
