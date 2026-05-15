import { useEffect, useRef, type ReactNode } from "react";

/**
 * LightboxParallax
 * ----------------
 * Wraps the lightbox hero plate. The frame stays fixed; the image
 * inside drifts ±MAX_PX along pointer position (desktop) or briefly
 * along swipe direction (mobile), then settles back to center.
 *
 * Implementation notes:
 *  - GPU transform only (translate3d), no layout.
 *  - Inner wrapper is overscaled by SCALE so drift never exposes
 *    an edge of the underlying image.
 *  - Disables itself when `prefers-reduced-motion: reduce`.
 *  - rAF-throttled so pointermove never fires faster than the frame.
 *  - `disabled` flag pauses motion during plate transitions to prevent
 *    the in-flight image from being thrown sideways mid-decode.
 */

const MAX_PX = 0; // Disabled — pointer drift was making viewers motion-sick.
const SCALE = 1.04; // 4% overscale hides the drift at the frame edge.
const SETTLE_MS = 700; // ease-back to center after pointer leaves.
const SWIPE_DECAY_MS = 800; // mobile drift fades back to rest.

interface Props {
  /** Stable key per plate. Resets internal motion state. */
  plateKey: string;
  /** When true (e.g. plate is changing), motion freezes at center. */
  disabled?: boolean;
  children: ReactNode;
}

export function LightboxParallax({ plateKey, disabled, children }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const reducedRef = useRef(false);

  // prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reducedRef.current = mql.matches;
      if (mql.matches) {
        targetRef.current = { x: 0, y: 0 };
      }
    };
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Reset target on plate change so each plate starts centered.
  useEffect(() => {
    targetRef.current = { x: 0, y: 0 };
  }, [plateKey]);

  // Render loop — eases current toward target.
  useEffect(() => {
    const tick = () => {
      const cur = currentRef.current;
      const tgt = targetRef.current;
      // Critical-damped lerp: ~12% per frame ≈ 700ms settle at 60fps.
      cur.x += (tgt.x - cur.x) * 0.12;
      cur.y += (tgt.y - cur.y) * 0.12;
      const inner = innerRef.current;
      if (inner) {
        inner.style.transform = `translate3d(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px, 0) scale(${SCALE})`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Pointer drift (desktop). Touch is handled separately below.
  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;

    const onMove = (e: PointerEvent) => {
      if (disabled || reducedRef.current) return;
      if (e.pointerType !== "mouse") return;
      const rect = node.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      // Invert so the image moves WITH the gaze, not opposite to it —
      // creates the "looking around" feel rather than tilt-shift.
      targetRef.current = {
        x: -nx * MAX_PX * 2,
        y: -ny * MAX_PX * 2,
      };
    };
    const onLeave = () => {
      targetRef.current = { x: 0, y: 0 };
    };

    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, [disabled]);

  // Swipe drift (mobile). On touchmove, push target along the swipe;
  // touchend lets the settle animation pull it home.
  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;
    let startX = 0;
    let startY = 0;
    let active = false;
    let decayTimer: number | null = null;

    const onStart = (e: TouchEvent) => {
      if (disabled || reducedRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      active = true;
      if (decayTimer !== null) {
        window.clearTimeout(decayTimer);
        decayTimer = null;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      // Same sign convention as pointer: image follows the gesture.
      targetRef.current = {
        x: clamp(dx * 0.08, -MAX_PX, MAX_PX),
        y: clamp(dy * 0.08, -MAX_PX, MAX_PX),
      };
    };
    const onEnd = () => {
      active = false;
      decayTimer = window.setTimeout(() => {
        targetRef.current = { x: 0, y: 0 };
      }, SWIPE_DECAY_MS);
    };

    node.addEventListener("touchstart", onStart, { passive: true });
    node.addEventListener("touchmove", onMove, { passive: true });
    node.addEventListener("touchend", onEnd);
    node.addEventListener("touchcancel", onEnd);
    return () => {
      if (decayTimer !== null) window.clearTimeout(decayTimer);
      node.removeEventListener("touchstart", onStart);
      node.removeEventListener("touchmove", onMove);
      node.removeEventListener("touchend", onEnd);
      node.removeEventListener("touchcancel", onEnd);
    };
  }, [disabled]);

  // When disabled flips on, smoothly target center.
  useEffect(() => {
    if (disabled) targetRef.current = { x: 0, y: 0 };
  }, [disabled]);

  return (
    <div
      ref={wrapperRef}
      data-vt-dest="gallery-hero"
      className="absolute inset-0 overflow-hidden pointer-events-auto"
      style={{ contain: "layout paint" }}
    >
      <div
        ref={innerRef}
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `scale(${SCALE})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return n < min ? min : n > max ? max : n;
}

// Suppress unused warning for SETTLE_MS — it documents the intended
// settle time matched by the lerp factor in the rAF loop above.
void SETTLE_MS;
