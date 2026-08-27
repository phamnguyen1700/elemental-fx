export interface PointerState {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
  deltaX: number;
  deltaY: number;
  velocityX: number;
  velocityY: number;
  inside: boolean;
  down: boolean;
  pointerType: string;
}

export type PointerHandler = (state: Readonly<PointerState>, event: PointerEvent) => void;

export interface PointerTrackerOptions {
  onMove?: PointerHandler;
  onDown?: PointerHandler;
  onUp?: PointerHandler;
  onLeave?: PointerHandler;
  preventDefault?: boolean;
}

export interface PointerTracker {
  getState(): Readonly<PointerState>;
  destroy(): void;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function createPointerTracker(
  element: HTMLCanvasElement,
  options: PointerTrackerOptions = {}
): PointerTracker {
  const state: PointerState = {
    x: 0,
    y: 0,
    normalizedX: 0,
    normalizedY: 0,
    deltaX: 0,
    deltaY: 0,
    velocityX: 0,
    velocityY: 0,
    inside: false,
    down: false,
    pointerType: "mouse"
  };

  let previousTime = 0;
  let destroyed = false;

  const updatePosition = (event: PointerEvent): void => {
    const bounds = element.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const deltaX = state.inside ? x - state.x : 0;
    const deltaY = state.inside ? y - state.y : 0;
    const elapsed = previousTime > 0 ? Math.max(1, event.timeStamp - previousTime) / 1000 : 0;

    state.x = x;
    state.y = y;
    state.normalizedX = clamp01(x / Math.max(1, bounds.width));
    state.normalizedY = clamp01(y / Math.max(1, bounds.height));
    state.deltaX = deltaX;
    state.deltaY = deltaY;
    state.velocityX = elapsed > 0 ? deltaX / elapsed : 0;
    state.velocityY = elapsed > 0 ? deltaY / elapsed : 0;
    state.inside = true;
    state.pointerType = event.pointerType || "mouse";
    previousTime = event.timeStamp;
  };

  const maybePreventDefault = (event: PointerEvent): void => {
    if (options.preventDefault) event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent): void => {
    maybePreventDefault(event);
    updatePosition(event);
    options.onMove?.(state, event);
  };

  const onPointerDown = (event: PointerEvent): void => {
    maybePreventDefault(event);
    updatePosition(event);
    state.down = true;
    element.setPointerCapture?.(event.pointerId);
    options.onDown?.(state, event);
  };

  const onPointerUp = (event: PointerEvent): void => {
    maybePreventDefault(event);
    updatePosition(event);
    state.down = false;
    if (element.hasPointerCapture?.(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    options.onUp?.(state, event);
  };

  const onPointerLeave = (event: PointerEvent): void => {
    if (state.down) return;
    state.inside = false;
    state.deltaX = 0;
    state.deltaY = 0;
    state.velocityX = 0;
    state.velocityY = 0;
    previousTime = 0;
    options.onLeave?.(state, event);
  };

  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onPointerUp);
  element.addEventListener("pointerleave", onPointerLeave);

  return {
    getState: () => state,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
      element.removeEventListener("pointerleave", onPointerLeave);
    }
  };
}
