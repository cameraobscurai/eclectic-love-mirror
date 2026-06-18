import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { requireAdminOrRedirect } from "@/lib/admin-guard";
import { createInventoryItem } from "@/lib/inventory-images.functions";
import { ImageOrderEditor } from "@/components/admin/ImageOrderEditor";

// ---------------------------------------------------------------------------
// /admin/new-product — manual product creation.
//
// Stage 1: metadata form → createInventoryItem → returns new row UUID.
// Stage 2: ImageOrderEditor mounted inline against the new UUID.
// Stage 3: "Done" → /admin/photos.
//
// Manual products get rms_id = 'MANUAL-<short-uuid>' server-side so the RMS
// re-import script (scripts/import.mjs) does not retire them. See
// createInventoryItem in src/lib/inventory-images.functions.ts.
// ---------------------------------------------------------------------------

const CATEGORIES: { slug: string; label: string }[] = [
  { slug: "seating", label: "Seating" },
  { slug: "tables", label: "Tables" },
  { slug: "bars", label: "Cocktail & Bar" },
  { slug: "tableware", label: "Tableware" },
  { slug: "serveware", label: "Serveware" },
  { slug: "pillows-throws", label: "Pillows & Throws" },
  { slug: "rugs", label: "Rugs" },
  { slug: "lighting", label: "Lighting" },
  { slug: "candlelight", label: "Candlelight" },
  { slug: "chandeliers", label: "Chandeliers" },
  { slug: "large-decor", label: "Large Decor" },
  { slug: "styling", label: "Styling" },
  { slug: "storage", label: "Storage" },
  { slug: "furs-pelts", label: "Furs & Pelts" },
];

export const Route = createFileRoute("/admin/new-product")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [{ title: "New product · Admin" }],
  }),
  component: NewProductPage,
});

type Created = {
  id: string;
  rmsId: string;
  title: string;
  category: string;
};

function NewProductPage() {
  const router = useRouter();
  const create = useServerFn(createInventoryItem);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].slug);
  const [quantity, setQuantity] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [publicReady, setPublicReady] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErr(null);
    setSubmitting(true);
    try {
      const qNum = quantity.trim() ? Number(quantity) : null;
      const res = await create({
        data: {
          title: title.trim(),
          category: category as Parameters<typeof create>[0]["data"]["category"],
          quantity: qNum !== null && Number.isFinite(qNum) ? qNum : null,
          quantityLabel: null,
          dimensionsRaw: dimensions.trim() || null,
          publicReady,
        },
      });
      setCreated({ id: res.id, rmsId: res.rmsId, title: res.title, category });
    } catch (e2) {
      setErr((e2 as Error).message || "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  const finish = () => {
    router.navigate({ to: "/admin/photos" });
  };

  if (created) {
    return (
      <>
        <div className="px-6 py-5 border-b border-charcoal/10">
          <p className="text-[10px] uppercase tracking-[0.24em] text-charcoal/55">
            Step 2 of 2 · Add photos
          </p>
          <h1 className="mt-1 font-display text-2xl text-charcoal">
            {created.title}
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-charcoal/55">
            {created.category} · {created.rmsId}
            {publicReady ? " · Live after next catalog bake" : " · Draft"}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={finish}
              className="border border-charcoal/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] hover:bg-charcoal/5"
            >
              Done — go to Collection
            </button>
            <button
              type="button"
              onClick={() => {
                setCreated(null);
                setTitle("");
                setQuantity("");
                setDimensions("");
              }}
              className="border border-charcoal/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] hover:bg-charcoal/5"
            >
              + Add another product
            </button>
          </div>
        </div>
        <ImageOrderEditor
          item={{
            id: created.id,
            rms_id: created.rmsId,
            title: created.title,
            images: [],
            card_background_url: null,
          }}
          onClose={finish}
          onSaved={() => {}}
        />
      </>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <p className="text-[10px] uppercase tracking-[0.24em] text-charcoal/55">
        Step 1 of 2 · Product details
      </p>
      <h1 className="mt-1 font-display text-2xl text-charcoal">New product</h1>
      <p className="mt-2 text-[12px] text-charcoal/65 max-w-prose">
        For pieces not in the RMS export. Manual products survive inventory
        re-imports and appear in the live catalog on the next bake.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <Field label="Title">
          <input
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-charcoal/25 px-3 py-2 text-sm focus:outline-none focus:border-charcoal"
            placeholder="e.g. Travertine Side Table"
          />
        </Field>

        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-charcoal/25 px-3 py-2 text-sm bg-white focus:outline-none focus:border-charcoal"
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity (optional)">
            <input
              type="number"
              min={0}
              max={9999}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border border-charcoal/25 px-3 py-2 text-sm focus:outline-none focus:border-charcoal"
              placeholder="—"
            />
          </Field>
          <Field label="Dimensions (optional)">
            <input
              maxLength={500}
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              className="w-full border border-charcoal/25 px-3 py-2 text-sm focus:outline-none focus:border-charcoal"
              placeholder='e.g. 24"W x 18"D x 22"H'
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-charcoal/80">
          <input
            type="checkbox"
            checked={publicReady}
            onChange={(e) => setPublicReady(e.target.checked)}
            className="h-4 w-4"
          />
          Publish to live catalog
        </label>

        {err && (
          <p className="text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2">
            {err}
          </p>
        )}

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="inline-flex items-center gap-2 bg-charcoal text-cream px-4 py-2 text-[11px] uppercase tracking-[0.22em] disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? "Creating…" : "Create & add photos →"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.22em] text-charcoal/55 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
