import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Trash2, Upload, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminOrRedirect } from "@/lib/admin-guard";
import { publicStorageUrl } from "@/lib/storage-image";

// ---------------------------------------------------------------------------
// /admin/incoming — Giant intake bucket for designer photo drops.
// Bulk drag-drop into one bucket; categorize/sort later.
// ---------------------------------------------------------------------------

const BUCKET = "incoming-photos";

export const Route = createFileRoute("/admin/incoming")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "Incoming photos · Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: IncomingPage,
});

interface FileRow {
  name: string;
  path: string;
  url: string;
  size: number;
  updated_at?: string;
}

function IncomingPage() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 1000, sortBy: { column: "updated_at", order: "desc" } });
    if (error) {
      setError(error.message);
      setFiles([]);
    } else {
      setFiles(
        (data ?? [])
          .filter((f) => f.name && !f.name.startsWith("."))
          .map((f) => ({
            name: f.name,
            path: f.name,
            url: publicStorageUrl(BUCKET, f.name),
            size: (f as any).metadata?.size ?? 0,
            updated_at: (f as any).updated_at,
          })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upload = useCallback(
    async (fileList: FileList | File[]) => {
      const arr = Array.from(fileList);
      if (!arr.length) return;
      setBusy(true);
      setError(null);
      setProgress({ done: 0, total: arr.length });
      let done = 0;
      const failures: string[] = [];
      // upload in parallel batches of 4
      const batchSize = 4;
      for (let i = 0; i < arr.length; i += batchSize) {
        const batch = arr.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (file) => {
            // de-collide names by prefixing timestamp on conflict
            const safeName = file.name.replace(/[^\w.\-+ ]/g, "_");
            const stamp = Date.now().toString(36);
            const path = `${stamp}-${safeName}`;
            const { error } = await supabase.storage
              .from(BUCKET)
              .upload(path, file, {
                contentType: file.type || "application/octet-stream",
                upsert: false,
              });
            if (error) failures.push(`${file.name}: ${error.message}`);
            done += 1;
            setProgress({ done, total: arr.length });
          }),
        );
      }
      setBusy(false);
      setProgress(null);
      if (failures.length) setError(failures.join(" · "));
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (path: string) => {
      if (!confirm(`Delete ${path}?`)) return;
      const { error } = await supabase.storage.from(BUCKET).remove([path]);
      if (error) setError(error.message);
      await refresh();
    },
    [refresh],
  );

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-cream text-charcoal">
      <div className="px-6 lg:px-12 pt-10 pb-24 max-w-[1500px] mx-auto">
        <header className="border-b pb-8 mb-8" style={{ borderColor: "var(--archive-rule)" }}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
            ADMIN · INTAKE
          </p>
          <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-[0.95] uppercase tracking-[0.02em]">
            Incoming photos
          </h1>
          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-charcoal/55">
            One bucket for new designer drops · sort & assign later
          </p>
        </header>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              upload(e.target.files);
              e.target.value = "";
            }
          }}
        />

        <div
          onClick={() => !busy && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            if (!busy && e.dataTransfer.files.length) upload(e.dataTransfer.files);
          }}
          className={`border border-dashed rounded-sm min-h-[200px] flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors p-10 ${
            busy ? "opacity-60 cursor-not-allowed" : ""
          } ${
            over
              ? "border-charcoal/60 bg-charcoal/5"
              : "border-charcoal/25 hover:border-charcoal/50 hover:bg-charcoal/[0.03]"
          }`}
        >
          {busy ? (
            <Loader2 className="h-7 w-7 text-charcoal/55 animate-spin" />
          ) : (
            <ImagePlus className="h-7 w-7 text-charcoal/55" />
          )}
          <p className="text-[11px] uppercase tracking-[0.24em] text-charcoal/70">
            {busy
              ? `Uploading ${progress?.done ?? 0} / ${progress?.total ?? 0}…`
              : "Drop photos here or click to select"}
          </p>
          <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/40">
            Any size · any name · any category
          </p>
        </div>

        {error && (
          <p className="mt-4 text-[11px] text-red-700 break-all">{error}</p>
        )}

        <div className="mt-10 flex items-baseline justify-between">
          <h2 className="font-display text-xl uppercase tracking-[0.04em]">
            In bucket
          </h2>
          <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/50 tabular-nums">
            {loading ? "Loading…" : `${files.length} files`}
          </p>
        </div>

        {!loading && files.length === 0 ? (
          <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-charcoal/45">
            Nothing here yet.
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {files.map((f) => (
              <li
                key={f.path}
                className="group relative border border-charcoal/10 bg-white"
              >
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square overflow-hidden"
                >
                  <img
                    src={f.url}
                    alt={f.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </a>
                <div className="px-2 py-1.5 flex items-center justify-between gap-2">
                  <p
                    className="text-[10px] tabular-nums text-charcoal/65 truncate"
                    title={f.name}
                  >
                    {f.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(f.path)}
                    className="text-charcoal/40 hover:text-red-700 shrink-0"
                    aria-label={`Delete ${f.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className="mt-16 pt-8 border-t text-[10px] uppercase tracking-[0.22em] text-charcoal/40" style={{ borderColor: "var(--archive-rule)" }}>
          Files land in the <code className="text-charcoal/60">{BUCKET}</code> bucket · sort into per-product folders later
        </footer>
      </div>
    </div>
  );
}

export default IncomingPage;
