import { useEffect } from "react";

/**
 * Locks body scroll while the passed flag is true. Restores the previous
 * inline `overflow` value on unmount or when flag flips to false.
 *
 * Safe to nest — each active lock stacks; the last one to unmount restores.
 */
let lockCount = 0;
let previousOverflow: string | null = null;

export function useBodyScrollLock(active: boolean = true): void {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount++;
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow ?? "";
        previousOverflow = null;
      }
    };
  }, [active]);
}
