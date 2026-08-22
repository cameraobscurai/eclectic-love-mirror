import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import { ProductEditDrawer } from "@/components/admin/ProductEditDrawer";
import { ImageOrderEditor } from "@/components/admin/ImageOrderEditor";
import {
  getProduct,
  updateProduct,
  listProductAudit,
  getMyRole,
  deleteProduct,
} from "@/lib/products-admin.functions";
import { listTaxonomyTree, assignTaxonomy } from "@/lib/taxonomy-admin.functions";

/** Reference tree — the 10 collections / 33 categories, cached hard. */
export function useTaxonomyTree() {
  const treeFn = useServerFn(listTaxonomyTree);
  return useQuery({
    queryKey: ["admin", "taxonomy-tree"],
    queryFn: () => treeFn(),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });
}

// ---------------------------------------------------------------------------
// ONE editor, two homes. /admin/products (the list) and /admin/photos (the
// COLLECTION grid) both mount this — clicking a photo must give you the same
// name / quantity / dimensions / taxonomy / photos surface as the list does,
// without a page hop.
// ---------------------------------------------------------------------------
// The photo editor (ImageOrderEditor) is launched from the drawer's onOpenPhotos.
// ---------------------------------------------------------------------------

type ProductRow = Record<string, unknown> & {
  id: string; title: string; slug?: string | null; rms_id?: string | null;
  images?: string[] | null; card_background_url?: string | null;
};

export function InventoryEditDrawer({
  id, onClose, onSaved, seed, focus,
}: {
  id: string;
  onClose: () => void;
  onSaved: () => void;
  /** What the grid already knows about this row. Renders instantly; the
   *  fetch below replaces it the moment full detail lands. */
  seed?: ProductRow | null;
  focus?: "photos";
}) {
  const get = useServerFn(getProduct);
  const upd = useServerFn(updateProduct);
  const auditFn = useServerFn(listProductAudit);
  const roleFn = useServerFn(getMyRole);
  const del = useServerFn(deleteProduct);
  const assign = useServerFn(assignTaxonomy);
  const { data: tree } = useTaxonomyTree();

  const [row, setRow] = useState<ProductRow | null>(seed ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [audit, setAudit] = useState<any[]>([]);
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [photoEditor, setPhotoEditor] = useState(false);

  const refetch = () => {
    setLoadError(null);
    get({ data: { id } })
      .then((r) => setRow(r as ProductRow))
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Could not load this product."));
    auditFn({ data: { entityId: id, limit: 20 } }).then((r) => setAudit(r as unknown[])).catch(() => {});
  };

  useEffect(() => {
    setRow(seed ?? null); setAudit([]);
    refetch();
    roleFn().then((r) => setRole(r.role === "admin" ? "admin" : "staff")).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);


  if (!row) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
        <button onClick={onClose} aria-label="Close" className="flex-1 bg-charcoal/40" />
        <aside className="w-full max-w-[720px] bg-cream border-l border-charcoal/15 p-10 text-[11px] uppercase tracking-[0.22em] text-charcoal/40">
          {loadError ? (
            <div className="space-y-4 text-charcoal">
              <p className="text-destructive normal-case tracking-normal">{loadError}</p>
              <div className="flex gap-3">
                <button onClick={refetch} className="border border-charcoal/30 px-3 py-1">Retry</button>
                <button onClick={onClose} className="border border-charcoal/20 px-3 py-1">Close</button>
              </div>
            </div>
          ) : (
            "Loading…"
          )}
        </aside>
      </div>
    );
  }


  const liveUrl = typeof row.slug === "string" && row.slug
    ? `https://eclectichive.com/collection/${row.slug}`
    : undefined;

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ProductEditDrawer
        product={row as any}
        focus={focus}
        taxonomy={tree ?? { collections: [], categories: [] }}
        role={role}
        recentChanges={audit as never}
        categoryPriceStats={{}}
        liveUrl={liveUrl}
        sketch={null}
        onClose={onClose}
        onOpenPhotos={() => setPhotoEditor(true)}
        onDelete={async () => {
          try {
            await del({ data: { id } });
          } catch (e) {
            // Server fns reject with a raw Response; unwrapped it surfaces as
            // "Error: [object Response]" and a blank screen.
            const msg =
              e instanceof Response ? await e.text() : (e as Error)?.message || "Delete failed.";
            alert(msg);
            return;
          }
          onSaved();
          onClose();
        }}

        onPhotosSaved={(next: { images: string[]; card_background_url: string | null }) => {
          // Keep the drawer's preview + readiness checklist in step with the
          // photo editor instead of waiting for a close/reopen.
          setRow((prev) => (prev ? { ...prev, images: next.images, card_background_url: next.card_background_url } : prev));
          onSaved();
        }}

        onSave={async (patch: Record<string, unknown>) => {
          // Taxonomy is NOT a plain column write. The pair is revalidated
          // against the reference tables and stamps taxonomy_review — that's
          // assignTaxonomy's job, so split it out of the ordinary patch.
          const { collection_slug, category_slug, ...rest } = patch as Record<string, string | undefined>;
          if (collection_slug && category_slug) {
            await assign({ data: { ids: [id], collection_slug, category_slug } });
          }
          if (Object.keys(rest).length > 0) {
            await upd({ data: { id, patch: rest } });
          }
          const fresh = await get({ data: { id } });
          setRow(fresh as ProductRow);
          onSaved();
          auditFn({ data: { entityId: id, limit: 20 } }).then((r) => setAudit(r as unknown[])).catch(() => {});
        }}

      />
      {photoEditor && (
        <ImageOrderEditor
          item={{
            id: row.id,
            rms_id: (row.rms_id as string | null) ?? null,
            title: (row.title as string) ?? "",
            images: Array.isArray(row.images) ? (row.images as string[]) : [],
            card_background_url: (row.card_background_url as string | null) ?? null,
            category_slug: (row.category_slug as string | null) ?? null,
            dimensions: (row.dimensions_raw as string | null) ?? null,
            cover_focal_x: (row.cover_focal_x as number | null) ?? null,
            cover_focal_y: (row.cover_focal_y as number | null) ?? null,
            cover_framed_url: (row.cover_framed_url as string | null) ?? null,
            updated_at: (row.updated_at as string | null) ?? null,
          }}
          onClose={() => setPhotoEditor(false)}
          onSaved={(next) => {
            setRow((prev) => (prev ? { ...prev, images: next.images, card_background_url: next.card_background_url } : prev));
            onSaved();
          }}
        />
      )}
    </>
  );
}
