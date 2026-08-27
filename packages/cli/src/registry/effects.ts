import { inkCursorTemplate } from "./templates/ink-cursor";
import { waterSurfaceTemplate } from "./templates/water-surface";

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
    dependencies: ["@elemental-fx/canvas-effects"],
    template: waterSurfaceTemplate
  },
  "ink-cursor": {
    name: "ink-cursor",
    fileName: "ink-cursor.tsx",
    dependencies: ["@elemental-fx/fluid-effects"],
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
