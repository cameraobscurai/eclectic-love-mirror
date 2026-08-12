// R7 blast-radius audit for the family-cover precedence change.
//
// Changing which photo wins a family tile's cover slot re-derives the cover
// for EVERY family tile, not just the one that was reported. This script
// diffs old precedence vs new across the whole catalog using the same inputs
// the live site uses (baked catalog + published overlay snapshot) and writes
// a receipt listing every tile whose cover changes.
//
// Read-only. Writes nothing but the receipt.
//
//   bun run scripts/audit/family-cover-blast-radius.ts

import { writeFileSync } from "node:fs";
import catalog from "../../src/data/inventory/current_catalog.json" with { type: "json" };
import {
  mergeFamilyImages,
  coverFirst,
  imageKey,
  type FamilyImage,
} from "../../src/lib/family-cover";

const SUPABASE_URL = "https://wdyfavzfquegrxklcpmq.supabase.co";
const BUCKET = `${SUPABASE_URL}/storage/v1/object/public/squarespace-mirror`;

type OverlayRow = { images?: string[] | null; title?: string | null };

async function fetchOverlay(): Promise<Record<string, OverlayRow>> {
  const man = await fetch(`${BUCKET}/catalog/manifest.json?t=${Date.now()}`, {
    cache: "no-cache",
  });
  if (!man.ok) throw new Error(`manifest fetch failed: ${man.status}`);
  const { overlayKey } = (await man.json()) as { overlayKey?: string };
  if (!overlayKey) throw new Error("manifest has no overlayKey");
  const res = await fetch(`${BUCKET}/${overlayKey}`);
  if (!res.ok) throw new Error(`overlay fetch failed: ${res.status}`);
  const payload = (await res.json()) as { overlay: Record<string, OverlayRow> };
  console.log(`overlay: ${overlayKey}`);
  return payload.overlay ?? {};
}

const fileOf = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || url);
  } catch {
    return url;
  }
};

const main = async () => {
  const overlay = await fetchOverlay();
  const products = (catalog as { products: Array<Record<string, unknown>> }).products;

  const rows: Array<{
    id: string;
    title: string;
    before: string;
    after: string;
  }> = [];
  let familyCount = 0;
  let liveFamilyCount = 0;

  for (const p of products) {
    const members = (p.variants ?? []) as Array<{ id: string; imageUrl?: string | null }>;
    if (members.length === 0) continue;
    familyCount++;

    const memberIds = [p.id as string, ...members.map((v) => v.id)];
    const memberImages: string[] = [];
    let anyLive = false;
    for (const id of memberIds) {
      const row = overlay[id];
      if (!row || !Array.isArray(row.images) || row.images.length === 0) continue;
      anyLive = true;
      memberImages.push(...row.images);
    }
    if (!anyLive) continue;
    liveFamilyCount++;

    const leadImages = (overlay[p.id as string]?.images ?? []) as string[];
    const input = {
      leadImages,
      bakedImages: (p.images ?? []) as FamilyImage[],
      memberImages,
      variantCoverUrls: members.map((v) => v.imageUrl ?? "").filter(Boolean),
    };

    const before = coverFirst(mergeFamilyImages(input, { leadCoverWins: false }))[0];
    const after = coverFirst(mergeFamilyImages(input, { leadCoverWins: true }))[0];
    if (!before || !after) continue;
    if (imageKey(before.url) === imageKey(after.url)) continue;

    rows.push({
      id: p.id as string,
      title: (p.title as string) ?? "",
      before: fileOf(before.url),
      after: fileOf(after.url),
    });
  }

  const stamp = new Date().toISOString();
  const lines = [
    "# Blast radius — family-cover precedence change",
    "",
    `Generated: ${stamp}`,
    "",
    `- Family tiles in catalog: ${familyCount}`,
    `- Family tiles with live overlay images: ${liveFamilyCount}`,
    `- **Tiles whose cover changes: ${rows.length}**`,
    "",
    rows.length === 0
      ? "No cover changes."
      : [
          "| RMS | Title | Cover before | Cover after |",
          "| --- | --- | --- | --- |",
          ...rows.map((r) => `| ${r.id} | ${r.title} | ${r.before} | ${r.after} |`),
        ].join("\n"),
    "",
  ].join("\n");

  const out = "docs/receipts/family-cover-blast-radius.md";
  writeFileSync(out, lines);
  console.log(lines);
  console.log(`\nwrote ${out}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
