// Shared error-handling wrapper for admin mutations.
//
// Design goals from PR 1 verification report:
// - Always show a toast on failure (previously silent try/catch or unhandled reject).
// - Never claim success unless the server confirms.
// - Preserve caller's form state on failure (helper doesn't reset anything).
// - Send the real error to console.error so it's still debuggable server-side.
//
// Not a hook — call sites are already inside async `onSave`/`onClick` callbacks
// with their own local `useState` for loading. Adding TanStack Query mutation
// state here would force an intrusive rewrite of stable UI. This helper is the
// minimum surface area that fixes the actual bug (silent failure).
import { toast } from "sonner";

export type AdminMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: unknown };

interface Options {
  /** User-facing failure copy. Keep it plain — no error details. */
  errorMessage?: string;
  /** Tag for console.error so failures are greppable in logs. */
  surface: string;
}

export async function runAdminMutation<T>(
  fn: () => Promise<T>,
  { errorMessage = "Couldn't save your changes. Nothing was updated.", surface }: Options,
): Promise<AdminMutationResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    console.error(`[admin-mutation:${surface}]`, error);
    toast.error(errorMessage);
    return { ok: false, error };
  }
}
