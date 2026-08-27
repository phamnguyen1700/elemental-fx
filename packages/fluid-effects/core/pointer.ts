export interface FluidPointerState {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  deltaX: number;
  deltaY: number;
  down: boolean;
  inside: boolean;
}

export interface FluidPointerOptions {
  onMove?(state: Readonly<FluidPointerState>): void;
  onDown?(state: Readonly<FluidPointerState>): void;
  onUp?(state: Readonly<FluidPointerState>): void;
}

export interface FluidPointerTracker {
  destroy(): void;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function createFluidPointerTracker(
  canvas: HTMLCanvasElement,
  options: FluidPointerOptions
): FluidPointerTracker {
  const state: FluidPointerState = {
    x: 0,
    y: 0,
    previousX: 0,
    previousY: 0,
    deltaX: 0,
    deltaY: 0,
    down: false,
    inside: false
  };
  let destroyed = false;

  const update = (event: PointerEvent): void => {
    const bounds = canvas.getBoundingClientRect();
    const x = clamp01((event.clientX - bounds.left) / Math.max(1, bounds.width));
    const y = clamp01((event.clientY - bounds.top) / Math.max(1, bounds.height));
    state.previousX = state.inside ? state.x : x;
    state.previousY = state.inside ? state.y : y;
    state.x = x;
    state.y = y;
    state.deltaX = x - state.previousX;
    state.deltaY = y - state.previousY;
    state.inside = true;
  };

  const onMove = (event: PointerEvent): void => {
    event.preventDefault();
    update(event);
    options.onMove?.(state);
  };

  const onDown = (event: PointerEvent): void => {
    event.preventDefault();
    update(event);
    state.down = true;
    canvas.setPointerCapture?.(event.pointerId);
    options.onDown?.(state);
  };

  const onUp = (event: PointerEvent): void => {
    event.preventDefault();
    update(event);
    state.down = false;
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    options.onUp?.(state);
  };

  const onLeave = (): void => {
    if (state.down) return;
    state.inside = false;
    state.deltaX = 0;
    state.deltaY = 0;
  };

  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);

  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    }
  };
}
