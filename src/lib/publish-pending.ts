/**
 * Tracks whether admin edits are saved to the database but not yet pushed to
 * the public site.
 *
 * The public collection reads a published snapshot, so a save is not the same
 * thing as "live". Without a visible signal, staff reorder photos, see
 * "Saved", and assume the site changed. This little store lets every edit
 * surface flag pending work and lets the header Publish button light up.
 */

let pending = false;
const listeners = new Set<(p: boolean) => void>();

function emit() {
  for (const l of listeners) l(pending);
}

/** Call after any admin write that the public site should eventually show. */
export function markPublishPending(): void {
  if (pending) return;
  pending = true;
  emit();
}

/** Call after a successful publish. */
export function clearPublishPending(): void {
  if (!pending) return;
  pending = false;
  emit();
}

export function isPublishPending(): boolean {
  return pending;
}

export function subscribePublishPending(fn: (p: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
