import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { requireAdminOrRedirect } from "@/lib/admin-guard";
import {
  createInventoryItem,
  updateInventoryItemMeta,
  uploadItemImage,
  updateItemImages,
} from "@/lib/inventory-images.functions";

// ---------------------------------------------------------------------------
// /admin/new-product — single-page manual product entry.
//
// Owner fills metadata + drops photos in one view, hits "Publish" or "Save
// draft" at the bottom. The DB row is created on first save (any button)
// using createInventoryItem, then images upload directly to it. Subsequent
// saves patch metadata via updateInventoryItemMeta.
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

type DraftRow = { id: string; rmsId: string };

function NewProductPage() {
  const router = useRouter();
  const create = useServerFn(createInventoryItem);
  const updateMeta = useServerFn(updateInventoryItemMeta);
  const uploadFn = useServerFn(uploadItemImage);
  const updateImagesFn = useServerFn(updateItemImages);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].slug);
  const [quantity, setQuantity] = useState("");
  const [dimensions, setDimensions] = useState("");

  // Local image staging: URLs (already uploaded once row exists) in order.
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<DraftRow | null>(null);

  const [busy, setBusy] = useState<null | "draft" | "publish">(null);
  const [err, setErr] = useState<string | null>(null);

  const titleTrim = title.trim();
  const qNum = quantity.trim() ? Number(quantity) : null;
  const quantityValue =
    qNum !== null && Number.isFinite(qNum) ? qNum : null;
  const dimensionsValue = dimensions.trim() || null;

  // Ensure a draft row exists. First call creates; subsequent calls patch
  // metadata onto the existing row.
  const ensureRow = async (
    publicReady: boolean,
  ): Promise<DraftRow> => {
    if (!titleTrim) throw new Error("Title is required");
    if (draft) {
      await updateMeta({
        data: {
          id: draft.id,
          title: titleTrim,
          category: category as "seating",
          quantity: quantityValue,
          dimensionsRaw: dimensionsValue,
          publicReady,
        },
      });
      return draft;
    }
    const res = await create({
      data: {
        title: titleTrim,
        category: category as "seating",
        quantity: quantityValue,
        quantityLabel: null,
        dimensionsRaw: dimensionsValue,
        publicReady,
      },
    });
    const next = { id: res.id, rmsId: res.rmsId ?? "" };
    setDraft(next);
    return next;
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!titleTrim) {
      setErr("Add a title first, then upload photos.");
      return;
    }
    setErr(null);
    setUploading(true);
    try {
      // Make sure the row exists before uploads (rmsId is the storage folder).
      const row = await ensureRow(false);
      const arr = Array.from(files);
      const appended: string[] = [];
      for (const file of arr) {
        if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) continue;
        if (file.size > 10 * 1024 * 1024) {
          setErr(`${file.name} exceeds 10MB`);
          continue;
        }
        const buf = new Uint8Array(await file.arrayBuffer());
        let bin = "";
        const chunk = 0x8000;
        for (let i = 0; i < buf.length; i += chunk) {
          bin += String.fromCharCode(...buf.subarray(i, i + chunk));
        }
        const base64 = btoa(bin);
        const res = await uploadFn({
          data: {
            id: row.id,
            rmsId: row.rmsId,
            filename: file.name,
            contentType: file.type as
              | "image/jpeg"
              | "image/png"
              | "image/webp"
              | "image/avif",
            base64,
          },
        });
        appended.push(res.url);
      }
      if (appended.length) {
        const nextImages = [...images, ...appended];
        setImages(nextImages);
        await updateImagesFn({
          data: { id: row.id, images: nextImages, expectedLength: images.length },
        });
      }
    } catch (e) {
      setErr((e as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (url: string) => {
    if (!draft) {
      setImages(images.filter((u) => u !== url));
      return;
    }
    const next = images.filter((u) => u !== url);
    const before = images.length;
    setImages(next);
    try {
      await updateImagesFn({
        data: { id: draft.id, images: next, expectedLength: before },
      });
    } catch (e) {
      setErr((e as Error).message);
      setImages(images);
    }
  };

  const handleSave = async (publicReady: boolean) => {
    if (busy) return;
    if (!titleTrim) {
      setErr("Title is required.");
      return;
    }
    setErr(null);
    setBusy(publicReady ? "publish" : "draft");
    try {
      await ensureRow(publicReady);
      router.navigate({ to: "/admin/photos", search: { filter: undefined, product: undefined, page: undefined } });
    } catch (e) {
      setErr((e as Error).message || "Save failed");
      setBusy(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl text-charcoal">New product</h1>
      <p className="mt-2 text-[12px] text-charcoal/65">
        Fill in the details, drop photos, then publish.
      </p>

      <div className="mt-8 space-y-6">
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

        {/* Photos */}
        <div>
          <p className="block text-[10px] uppercase tracking-[0.22em] text-charcoal/55 mb-2">
            Photos
          </p>

          {images.length === 0 ? (
            <UploadDrop
              disabled={!titleTrim || uploading}
              uploading={uploading}
              onFiles={handleFiles}
              hint={
                titleTrim
                  ? "Drop images here or click to browse · JPG/PNG/WEBP/AVIF · max 10MB each"
                  : "Add a title above to enable photo uploads"
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((url, i) => (
                  <div
                    key={url}
                    className="relative aspect-square border border-charcoal/15 group"
                  >
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    {i === 0 && (
                      <span className="absolute top-1.5 left-1.5 bg-charcoal text-cream text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void removeImage(url)}
                      className="absolute top-1.5 right-1.5 bg-white/90 border border-charcoal/20 text-[10px] uppercase tracking-[0.16em] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 hover:bg-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <UploadDrop
                  compact
                  disabled={uploading}
                  uploading={uploading}
                  onFiles={handleFiles}
                  hint="Add more photos"
                />
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-charcoal/45">
                First image is the cover · Reorder later from Collection
              </p>
            </>
          )}
        </div>

        {err && (
          <p className="text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2">
            {err}
          </p>
        )}

        <div className="pt-4 border-t border-charcoal/10 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!titleTrim || !!busy}
            onClick={() => void handleSave(true)}
            className="inline-flex items-center gap-2 bg-charcoal text-cream px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] disabled:opacity-40"
          >
            {busy === "publish" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy === "publish" ? "Publishing…" : "Publish to live catalog"}
          </button>
          <button
            type="button"
            disabled={!titleTrim || !!busy}
            onClick={() => void handleSave(false)}
            className="inline-flex items-center gap-2 border border-charcoal/30 px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] hover:bg-charcoal/5 disabled:opacity-40"
          >
            {busy === "draft" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save as draft
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => router.navigate({ to: "/admin/photos", search: { filter: undefined, product: undefined, page: undefined } })}
            className="ml-auto text-[11px] uppercase tracking-[0.18em] text-charcoal/55 hover:text-charcoal disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
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

function UploadDrop({
  onFiles,
  disabled,
  uploading,
  hint,
  compact,
}: {
  onFiles: (files: FileList | File[]) => void;
  disabled: boolean;
  uploading: boolean;
  hint: string;
  compact?: boolean;
}) {
  const [drag, setDrag] = useState(false);
  return (
    <label
      className={`flex items-center justify-center text-center cursor-pointer border border-dashed transition-colors ${
        disabled
          ? "border-charcoal/15 text-charcoal/35 cursor-not-allowed"
          : drag
            ? "border-charcoal bg-charcoal/5"
            : "border-charcoal/30 hover:bg-charcoal/[0.02]"
      } ${compact ? "py-4 px-4" : "py-12 px-6"}`}
      onDragOver={(e) => {
        if (disabled) return;
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDrag(true);
        }
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        if (disabled) return;
        if (e.dataTransfer.files.length) {
          e.preventDefault();
          setDrag(false);
          onFiles(e.dataTransfer.files);
        }
      }}
    >
      <span className="text-[11px] uppercase tracking-[0.2em] inline-flex items-center gap-2">
        {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {uploading ? "Uploading…" : hint}
      </span>
      <input
        type="file"
        multiple
        disabled={disabled}
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            onFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />
    </label>
  );
}
