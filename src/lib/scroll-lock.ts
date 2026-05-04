/**
 * Ref-counted body scroll lock.
 *
 * Replaces ad-hoc `document.body.style.overflow = "hidden"` calls scattered
 * across modal/drawer/sheet components. The previous pattern raced when two
 * locks overlapped (e.g. open Quick View → open nav menu → close nav menu)
 * because the second close would unconditionally remove the lock while the
 * first owner still expected it to be held.
 *
 * Usage:
 *
 *   useEffect(() => {
 *     if (!open) return;
 *     const release = acquireScrollLock();
 *     return release;
 *   }, [open]);
 *
 * Contract:
 * - First `acquireScrollLock()` snapshots the current `body.style.overflow`
 *   value (which may be empty, "auto", "scroll", etc.) and sets it to "hidden".
 * - Subsequent acquires only increment a counter — no DOM writes.
 * - Each call returns an idempotent release function. Releasing decrements
 *   the counter; the original `overflow` value is only restored when the
 *   counter hits zero.
 * - Calling a release function more than once is a no-op (guarded by a
 *   captured `released` flag), so React StrictMode double-invokes and
 *   double-cleanups are safe.
 *
 * SSR-safe: no-ops when `document` is undefined.
 */

let lockCount = 0;
let originalOverflow: string | null = null;

export function acquireScrollLock(): () => void {
  if (typeof document === "undefined") {
    return () => {
      /* SSR no-op */
    };
  }

  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount -= 1;
    if (lockCount <= 0) {
      lockCount = 0;
      // Restore original value (preserve "" so the inline style is dropped
      // entirely rather than left as `overflow: auto` when it didn't exist
      // before).
      if (originalOverflow) {
        document.body.style.overflow = originalOverflow;
      } else {
        document.body.style.removeProperty("overflow");
      }
      originalOverflow = null;
    }
  };
}

/**
 * Test-only helper. Resets the lock to its initial state. Do not use in
 * production code.
 */
export function __resetScrollLockForTests(): void {
  lockCount = 0;
  originalOverflow = null;
  if (typeof document !== "undefined") {
    document.body.style.removeProperty("overflow");
  }
}
