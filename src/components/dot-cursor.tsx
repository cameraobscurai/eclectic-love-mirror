import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// DotCursor
//
// 8px charcoal dot that follows the pointer with a subtle spring lag, scales
// to a 36px ring on interactive elements (a, button, [role="button"], inputs).
// Honours prefers-reduced-motion and (pointer: coarse) — invisible on touch.
//
// Mix-blend-mode: difference means the dot reads on any background — black
// over white, white over black — without ever needing a light/dark variant.
// ---------------------------------------------------------------------------

export function DotCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dot = dotRef.current;
    if (!dot) return;

    document.documentElement.classList.add("has-dot-cursor");

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      const t = e.target as HTMLElement | null;
      const interactive = !!t?.closest?.(
        'a, button, [role="button"], input, select, textarea, [data-cursor="hover"]',
      );
      dot.dataset.state = interactive ? "hover" : "idle";
    };
    const onLeave = () => {
      dot.dataset.state = "hidden";
    };
    const onEnter = () => {
      dot.dataset.state = "idle";
    };
    const tick = () => {
      // Subtle lag (~0.22 follow factor) makes the dot feel weighted.
      currentX += (targetX - currentX) * 0.22;
      currentY += (targetY - currentY) * 0.22;
      dot.style.transform = `translate(${currentX}px, ${currentY}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
      document.documentElement.classList.remove("has-dot-cursor");
    };
  }, []);

  return <div ref={dotRef} className="dot-cursor" data-state="idle" aria-hidden />;
}
