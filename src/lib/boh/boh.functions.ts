/**
 * BOH server functions — thin wrappers.
 *
 * Auth: `requireAdmin` (user_roles + has_role). Context per admin-middleware:
 * { supabase, userId, claims }.
 *
 * ALL admin/service-role code lives in `./boh.server` — filename-blocked
 * from client bundles. Each handler reaches it via `await import()` so the
 * module never lands in the client graph even transitively.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import type { BohRibbon, RefreshResult, SnapshotRow } from "./boh.server";

export type { BohRibbon, RefreshResult, SnapshotRow };

// ————————————————————————————————————————————— ribbon
export const getBohRibbon = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<BohRibbon> => {
    const { getRibbonData } = await import("./boh.server");
    return getRibbonData();
  });

// ————————————————————————————————————————————— attention badges
export const getBohAttentionBadges = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<Record<string, { label: string } | null>> => {
    const { getBadgesData } = await import("./boh.server");
    return getBadgesData();
  });

// ————————————————————————————————————————————— snapshots
export const getBohSnapshots = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<SnapshotRow[]> => {
    const { getSnapshotsData } = await import("./boh.server");
    return getSnapshotsData();
  });

// ————————————————————————————————————————————— refresh sweep
export const refreshBohSnapshots = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<RefreshResult> => {
    const { refreshAllData } = await import("./boh.server");
    const actorId = context.userId as string;
    const actorEmail =
      (context.claims as { email?: string } | undefined)?.email;
    return refreshAllData(actorId, actorEmail);
  });

// ————————————————————————————————————————————— refresh one
export const refreshOneSnapshot = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data, context }) => {
    const { refreshOneData } = await import("./boh.server");
    return refreshOneData(context.userId as string, data.slug);
  });

// ————————————————————————————————————————————— ⌘K product search
export const searchBohProducts = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((data: { q: string }) => data)
  .handler(async ({ data }) => {
    const { searchProductsData } = await import("./boh.server");
    return searchProductsData(data.q);
  });
