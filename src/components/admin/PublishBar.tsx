import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { publishCatalogOverlay } from "@/lib/photos-admin.functions";
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

  useEffect(() => subscribePublishPending(setPending), []);

  const onClick = useCallback(async () => {
    setBusy(true);
    const id = toast.loading("PUBLISHING TO LIVE SITE…");
    try {
      const res = await publishFn();
      invalidateCollectionCatalog();
      clearPublishPending();
      toast.success(`PUBLISHED · ${res.count} PRODUCTS LIVE`, { id });
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
          ? "You have saved edits that are not on the live site yet"
          : "Push all saved edits to the live site"
      }
      className={`relative inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] disabled:opacity-50 disabled:cursor-not-allowed ${
        pending
          ? "border-charcoal bg-charcoal text-cream animate-pulse"
          : "border-charcoal bg-charcoal text-cream hover:bg-charcoal/90"
      }`}
    >
      <UploadCloud className="h-3 w-3" aria-hidden />
      {busy ? "Publishing…" : pending ? "Publish changes" : "Publish"}
      {pending && !busy && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#c0552f]"
        />
      )}
    </button>
  );
}
