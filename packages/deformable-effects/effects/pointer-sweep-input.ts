import { Vec3 } from "../core/math/vec3";

export interface PointerSweepInputBounds {
  halfWidth: number;
  halfHeight: number;
  pointerPlane: number;
}

export interface PointerSweepInputOptions {
  canvas: HTMLCanvasElement;
  eventTarget?: HTMLElement | Window | null;
  getBounds: () => PointerSweepInputBounds | null;
  onSweep: (from: Vec3, to: Vec3) => void;
  onReset?: () => void;
}

export function bindPointerSweepInput(options: PointerSweepInputOptions): () => void {
  const target = options.eventTarget ?? options.canvas.parentElement ?? globalThis.window;
  if (!target) return () => {};

  let previous: Vec3 | null = null;
  const reset = () => {
    previous = null;
    options.onReset?.();
  };
  const handleMove = (event: Event) => {
    const pointer = event as PointerEvent;
    const bounds = options.getBounds();
    const rect = options.canvas.getBoundingClientRect();
    if (!bounds || rect.width <= 0 || rect.height <= 0) return;
    const inside =
      pointer.clientX >= rect.left &&
      pointer.clientX <= rect.right &&
      pointer.clientY >= rect.top &&
      pointer.clientY <= rect.bottom;
    if (!inside) {
      if (previous) reset();
      return;
    }

    const current = new Vec3(
      ((pointer.clientX - rect.left) / rect.width) * bounds.halfWidth * 2 - bounds.halfWidth,
      ((pointer.clientY - rect.top) / rect.height) * bounds.halfHeight * 2 - bounds.halfHeight,
      bounds.pointerPlane
    );
    if (previous) options.onSweep(previous, current);
    previous = current;
  };

  target.addEventListener("pointermove", handleMove, { passive: true });
  target.addEventListener("pointerleave", reset, { passive: true });
  target.addEventListener("pointercancel", reset, { passive: true });

  return () => {
    target.removeEventListener("pointermove", handleMove);
    target.removeEventListener("pointerleave", reset);
    target.removeEventListener("pointercancel", reset);
  };
}
