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

  /**
   * Target that receives pointer events.
   *
   * Defaults to the coordinate element for backwards compatibility.
   * Use `window` when the canvas is render-only and should not block UI.
   */
  eventTarget?: Window | HTMLElement;
}

export interface PointerTracker {
  getState(): Readonly<PointerState>;
  destroy(): void;
}

type PointerEventName = "pointermove" | "pointerdown" | "pointerup" | "pointercancel";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function addPointerListener(
  target: Window | HTMLElement,
  type: PointerEventName,
  listener: (event: PointerEvent) => void
): void {
  if (target instanceof HTMLElement) {
    target.addEventListener(type, listener);
    return;
  }

  target.addEventListener(type, listener);
}

function removePointerListener(
  target: Window | HTMLElement,
  type: PointerEventName,
  listener: (event: PointerEvent) => void
): void {
  if (target instanceof HTMLElement) {
    target.removeEventListener(type, listener);
    return;
  }

  target.removeEventListener(type, listener);
}

export function createPointerTracker(
  element: HTMLCanvasElement,
  options: PointerTrackerOptions = {}
): PointerTracker {
  const eventTarget = options.eventTarget ?? element;

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

  const resetMotion = (): void => {
    state.deltaX = 0;
    state.deltaY = 0;
    state.velocityX = 0;
    state.velocityY = 0;
    previousTime = 0;
  };

  const updatePosition = (event: PointerEvent): void => {
    const bounds = element.getBoundingClientRect();

    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    const isInside = x >= 0 && y >= 0 && x <= bounds.width && y <= bounds.height;

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

    state.inside = isInside;
    state.pointerType = event.pointerType || "mouse";

    previousTime = event.timeStamp;
  };

  const maybePreventDefault = (event: PointerEvent): void => {
    if (options.preventDefault) {
      event.preventDefault();
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    maybePreventDefault(event);

    const wasInside = state.inside;

    updatePosition(event);

    if (!state.inside) {
      if (wasInside && !state.down) {
        resetMotion();
        options.onLeave?.(state, event);
      }

      return;
    }

    options.onMove?.(state, event);
  };

  const onPointerDown = (event: PointerEvent): void => {
    maybePreventDefault(event);

    updatePosition(event);

    if (!state.inside) {
      return;
    }

    state.down = true;

    if (eventTarget === element) {
      element.setPointerCapture?.(event.pointerId);
    }

    options.onDown?.(state, event);
  };

  const onPointerUp = (event: PointerEvent): void => {
    maybePreventDefault(event);

    const wasDown = state.down;

    updatePosition(event);

    state.down = false;

    if (eventTarget === element && element.hasPointerCapture?.(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }

    if (wasDown) {
      options.onUp?.(state, event);
    }

    if (!state.inside) {
      resetMotion();
      options.onLeave?.(state, event);
    }
  };

  const onPointerLeave = (event: PointerEvent): void => {
    if (state.down) {
      return;
    }

    state.inside = false;
    resetMotion();

    options.onLeave?.(state, event);
  };

  addPointerListener(eventTarget, "pointermove", onPointerMove);

  addPointerListener(eventTarget, "pointerdown", onPointerDown);

  addPointerListener(eventTarget, "pointerup", onPointerUp);

  addPointerListener(eventTarget, "pointercancel", onPointerUp);

  /**
   * Native pointerleave is only useful when the canvas itself
   * is the event source.
   *
   * When using window as the event target, leaving the canvas
   * is detected through bounds checking in onPointerMove.
   */
  if (eventTarget === element) {
    element.addEventListener("pointerleave", onPointerLeave);
  }

  return {
    getState: () => state,

    destroy: () => {
      if (destroyed) {
        return;
      }

      destroyed = true;

      removePointerListener(eventTarget, "pointermove", onPointerMove);

      removePointerListener(eventTarget, "pointerdown", onPointerDown);

      removePointerListener(eventTarget, "pointerup", onPointerUp);

      removePointerListener(eventTarget, "pointercancel", onPointerUp);

      if (eventTarget === element) {
        element.removeEventListener("pointerleave", onPointerLeave);
      }
    }
  };
}
