/**
 * BOH — server-only helpers. Filename ends in `.server.ts` so the bundler
 * refuses any client-side import: this is the strongest fix for the
 * transitive `client.server` import-graph rule. `boh.functions.ts` reaches
 * these helpers via `await import("./boh.server")` inside each handler,
 * keeping module-scope `supabaseAdmin` out of the client bundle.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getProductBrowseGroup } from "@/lib/collection-browse-groups";
import { GROUP_TO_PARENT, PARENT_ORDER } from "@/lib/collection-parents";
import { getCollectionCatalogBase } from "@/lib/phase3-catalog";
import { PAGES, T } from "./boh.config";

// ————————————————————————————————————————————— audit
export async function audit(actorId: string, action: string, metadata: Record<string, unknown>) {
  await supabaseAdmin.from("admin_audit_log").insert({
    actor_id: actorId,
    entity: "boh",
    entity_id: "boh", // synthetic — BOH admin actions aren't scoped to a specific row
    action,
    metadata: metadata as never,
  });
}

// ————————————————————————————————————————————— ribbon
export interface BohRibbon {
  totalItems: number;
  imagedPct: number;
  openInquiries: number;
  lastPublishedAt: string | null;
}

let ribbonCache: { at: number; data: BohRibbon } | null = null;
const RIBBON_TTL = 30_000;

/**
 * Ribbon reads the DB truth surface (full inventory incl. non-public items,
 * live inquiries). Badges read the baked catalog (what the public site
 * shows). If the imaged %% and badge counts ever look inconsistent, that
 * split is why — deliberate, not a bug.
 */
export async function getRibbonData(): Promise<BohRibbon> {
  if (ribbonCache && Date.now() - ribbonCache.at < RIBBON_TTL) return ribbonCache.data;

  const [items, imaged, inquiries, latest] = await Promise.all([
    supabaseAdmin.from("inventory_items").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("inventory_items")
      .select("id", { count: "exact", head: true })
      .neq("images", "{}" as never),
    supabaseAdmin
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .in("status", ["new", "quoted"] as never),
    supabaseAdmin
      .from("inventory_items")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const total = items.count ?? 0;
  const data: BohRibbon = {
    totalItems: total,
    imagedPct: total ? Math.round(((imaged.count ?? 0) / total) * 1000) / 10 : 0,
    openInquiries: inquiries.count ?? 0,
    lastPublishedAt: latest.data?.updated_at ?? null,
  };
  ribbonCache = { at: Date.now(), data };
  return data;
}

// ————————————————————————————————————————————— attention badges
/**
 * Reads the BAKED CATALOG, not raw inventory_items rows. getProductBrowseGroup
 * expects CollectionProduct shape (categorySlug, liveCategory, …).
 */
export async function getBadgesData(): Promise<Record<string, { label: string } | null>> {
  const catalog = await getCollectionCatalogBase();
  const missing = new Map<string, number>();
  for (const product of catalog.products) {
    if ((product.imageCount ?? 0) > 0) continue;
    const group = getProductBrowseGroup(product);
    const parent = group ? GROUP_TO_PARENT[group as keyof typeof GROUP_TO_PARENT] : null;
    if (parent) missing.set(parent, (missing.get(parent) ?? 0) + 1);
  }
  const out: Record<string, { label: string } | null> = {};
  for (const slug of PARENT_ORDER) {
    const n = missing.get(slug) ?? 0;
    out[slug] = n > 0 ? { label: `${n} MISSING` } : null;
  }
  return out;
}

// ————————————————————————————————————————————— snapshots
export interface SnapshotRow {
  route_slug: string;
  status: "empty" | "pending" | "fresh" | "failed";
  updated_at: string | null;
  url: string | null;
}

export async function getSnapshotsData(): Promise<SnapshotRow[]> {
  const { data } = await supabaseAdmin.from("boh_tile_snapshots").select("*");
  const rows = new Map((data ?? []).map((r) => [r.route_slug, r]));

  // Batch: one storage round-trip for all signable paths instead of one per page.
  const signable: { slug: string; path: string; row: (typeof rows) extends Map<string, infer R> ? R : never }[] = [];
  for (const p of PAGES) {
    const row = rows.get(p.slug);
    if (row && row.storage_path && row.status !== "empty") {
      signable.push({ slug: p.slug, path: row.storage_path, row });
    }
  }
  const signedMap = new Map<string, string>();
  if (signable.length > 0) {
    const { data: signed } = await supabaseAdmin.storage
      .from("boh-tiles")
      .createSignedUrls(signable.map((s) => s.path), 3600);
    (signed ?? []).forEach((s, i) => {
      if (s?.signedUrl) signedMap.set(signable[i].path, s.signedUrl);
    });
  }

  return PAGES.map((p) => {
    const row = rows.get(p.slug);
    if (!row || !row.storage_path || row.status === "empty") {
      return { route_slug: p.slug, status: "empty" as const, updated_at: null, url: null };
    }
    return {
      route_slug: p.slug,
      status: row.status as SnapshotRow["status"],
      updated_at: row.updated_at,
      url: signedMap.get(row.storage_path) ?? null,
    };
  });
}

// ————————————————————————————————————————————— refresh (locked, rate-capped)
const SITE_ORIGIN = process.env.PUBLIC_SITE_ORIGIN ?? "https://eclectichive.com";
const REFRESH_MIN_INTERVAL_MS = 5 * 60_000;

async function scrapeRoute(route: string): Promise<Buffer> {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: SITE_ORIGIN + route,
      formats: [
        { type: "screenshot", fullPage: false, viewport: { width: T.frameW, height: T.frameH } },
      ],
      actions: [{ type: "wait", milliseconds: 2500 }],
    }),
  });
  if (!res.ok) throw new Error(`FIRECRAWL_${res.status}`);
  const json = await res.json();
  const shot: string | undefined = json?.data?.screenshot;
  if (!shot) throw new Error("FIRECRAWL_EMPTY");
  if (shot.startsWith("http")) {
    const img = await fetch(shot);
    if (!img.ok) throw new Error("FIRECRAWL_FETCH");
    return Buffer.from(await img.arrayBuffer());
  }
  return Buffer.from(shot.replace(/^data:image\/\w+;base64,/, ""), "base64");
}

async function captureOne(slug: string, route: string) {
  await supabaseAdmin
    .from("boh_tile_snapshots")
    .upsert({ route_slug: slug, status: "pending" }, { onConflict: "route_slug" });
  try {
    const img = await scrapeRoute(route);
    const path = `${slug}.jpg`;
    const { error } = await supabaseAdmin.storage
      .from("boh-tiles")
      .upload(path, img, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;
    await supabaseAdmin
      .from("boh_tile_snapshots")
      .update({ status: "fresh", storage_path: path, updated_at: new Date().toISOString() })
      .eq("route_slug", slug);
  } catch {
    await supabaseAdmin.from("boh_tile_snapshots").update({ status: "failed" }).eq("route_slug", slug);
  }
}

export type RefreshResult =
  | { status: "already_running" }
  | { status: "rate_limited"; retryInMs: number }
  | { status: "done" };

export async function refreshAllData(
  actorId: string,
  actorEmail: string | undefined,
): Promise<RefreshResult> {
  const { data: run } = await supabaseAdmin
    .from("boh_refresh_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = Date.now();
  if (run) {
    const started = new Date(run.started_at).getTime();
    if (!run.finished_at && now - started < 120_000) {
      return { status: "already_running" };
    }
    if (now - started < REFRESH_MIN_INTERVAL_MS) {
      return { status: "rate_limited", retryInMs: REFRESH_MIN_INTERVAL_MS - (now - started) };
    }
  }

  await audit(actorId, "refreshBohSnapshots", { pages: PAGES.length });
  const { data: newRun, error: insertErr } = await supabaseAdmin
    .from("boh_refresh_runs")
    .insert({ actor: actorEmail ?? actorId })
    .select()
    .single();
  if (insertErr || !newRun) throw insertErr ?? new Error("REFRESH_RUN_INSERT_FAILED");

  for (const p of PAGES) {
    if (p.slug === "home") continue; // home uses the poster, never scraped
    await captureOne(p.slug, p.route);
  }

  await supabaseAdmin
    .from("boh_refresh_runs")
    .update({ finished_at: new Date().toISOString(), status: "done" })
    .eq("id", newRun.id);

  return { status: "done" };
}

export async function refreshOneData(actorId: string, slug: string): Promise<{ status: "done" }> {
  const page = PAGES.find((p) => p.slug === slug && p.slug !== "home");
  if (!page) throw new Error("BAD_SLUG");
  await audit(actorId, "refreshOneSnapshot", { slug });
  await captureOne(page.slug, page.route);
  return { status: "done" };
}

// ————————————————————————————————————————————— ⌘K product search
export async function searchProductsData(q: string) {
  const query = (q ?? "").trim();
  if (query.length < 2) return [];
  const { data: rows } = await supabaseAdmin
    .from("inventory_items")
    .select("rms_id, title, category")
    .ilike("title", `%${query}%`)
    .limit(8);
  return (rows ?? []).map((r) => ({
    id: r.rms_id as string,
    name: r.title as string,
    group: (r.category as string) ?? "",
  }));
}
