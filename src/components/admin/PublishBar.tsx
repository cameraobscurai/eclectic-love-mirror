import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { getPublishStatus, publishCatalogOverlay } from "@/lib/photos-admin.functions";
import { invalidateCollectionCatalog } from "@/lib/phase3-catalog";
import {
  clearPublishPending,
  isPublishPending,
  subscribePublishPending,
} from "@/lib/publish-pending";

/**
 * Global "Publish" control, mounted in the admin header on every /admin page.
 *
 * Why it lives in the chrome and not on one page: every edit surface (new
 * product, inventory drawer, photo reorder) writes to the database, but the
 * public site reads a published snapshot. Before this existed, the publish
 * step lived only on /admin/photos, so edits made anywhere else silently
 * never reached eclectichive.com.
 */
export function PublishBar() {
  const publishFn = useServerFn(publishCatalogOverlay);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(isPublishPending());
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => subscribePublishPending(setPending), []);

  // Server truth: how many rows changed since the last published snapshot.
  // The in-memory flag above only survives the current page; this survives a
  // reload, a different browser, and edits made by someone else.
  const refresh = useCallback(async () => {
    try {
      const s = await getPublishStatus();
      setCount(s.pending);
      if (s.pending > 0) setPending(true);
    } catch {
      /* status is advisory — never block the button on it */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const t = setInterval(() => void refresh(), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(t);
    };
  }, [refresh]);

  const onClick = useCallback(async () => {
    setBusy(true);
    const id = toast.loading("PUBLISHING TO LIVE SITE…");
    try {
      const res = await publishFn();
      invalidateCollectionCatalog();
      clearPublishPending();
      setCount(0);
      toast.success(`PUBLISHED · ${res.count} PRODUCTS LIVE · THE SITE NOW MATCHES THE ADMIN`, {
        id,
      });
    } catch (e) {
      toast.error(`PUBLISH FAILED — ${(e as Error).message}`, { id });
    } finally {
      setBusy(false);
    }
  }, [publishFn]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={
        pending
          ? `${count && count > 0 ? `${count} saved change${count === 1 ? "" : "s"}` : "Saved edits"} are not on the live site yet — click to publish`
          : "The live site matches the admin. Click to re-publish anyway."
      }
      className={`relative inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] disabled:opacity-50 disabled:cursor-not-allowed ${
        pending
          ? "border-charcoal bg-charcoal text-cream animate-pulse"
          : "border-charcoal bg-charcoal text-cream hover:bg-charcoal/90"
      }`}
    >
      <UploadCloud className="h-3 w-3" aria-hidden />
      {busy
        ? "Publishing…"
        : pending
          ? count && count > 0
            ? `Publish ${count} change${count === 1 ? "" : "s"}`
            : "Publish changes"
          : "Publish"}
      {pending && !busy && (
        <span aria-hidden className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#c0552f]" />
      )}
    </button>
  );
}
