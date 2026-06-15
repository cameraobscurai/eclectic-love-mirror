// /admin/gallery — Gallery reorder admin.
//
// Lists every published gallery. Click one to drag-reorder its plates. The
// public /gallery page applies these overrides at runtime.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { requireAdminOrRedirect } from "@/lib/admin-guard";
import { supabase } from "@/integrations/supabase/client";
import { galleryProjects } from "@/content/gallery-projects";
import { gallerySlug } from "@/lib/gallery-orders";
import { GalleryOrderEditor } from "@/components/admin/GalleryOrderEditor";

export const Route = createFileRoute("/admin/gallery")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "Gallery · Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminGalleryPage,
});

type OrderRow = { gallery_slug: string; order_keys: string[] | null };

function AdminGalleryPage() {
  const [orders, setOrders] = useState<Map<string, string[]>>(new Map());
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const visibleProjects = useMemo(
    () => galleryProjects.filter((p) => !p.pending),
    [],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("gallery_orders")
        .select("gallery_slug, order_keys");
      if (!alive) return;
      if (!error && data) {
        const m = new Map<string, string[]>();
        for (const row of data as OrderRow[]) {
          if (row.order_keys && row.order_keys.length > 0) {
            m.set(row.gallery_slug, row.order_keys);
          }
        }
        setOrders(m);
      }
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const openProject = openSlug
    ? visibleProjects.find((p) => gallerySlug(p) === openSlug) ?? null
    : null;

  if (openProject) {
    const slug = gallerySlug(openProject);
    return (
      <div className="min-h-[calc(100vh-3rem)] bg-cream text-charcoal">
        <div className="px-6 lg:px-12 pt-8 pb-24 max-w-[1500px] mx-auto">
          <button
            type="button"
            onClick={() => setOpenSlug(null)}
            className="mb-6 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-charcoal/55 hover:text-charcoal"
          >
            <ChevronLeft className="h-3 w-3" /> All galleries
          </button>
          <GalleryOrderEditor
            gallerySlug={slug}
            galleryName={openProject.name}
            images={openProject.detailImages}
            initialOrderKeys={orders.get(slug) ?? null}
            onSaved={(keys) => {
              setOrders((m) => new Map(m).set(slug, keys));
            }}
            onReset={() => {
              setOrders((m) => {
                const n = new Map(m);
                n.delete(slug);
                return n;
              });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-cream text-charcoal">
      <div className="px-6 lg:px-12 pt-10 pb-24 max-w-[1500px] mx-auto">
        <header className="border-b pb-8 mb-10" style={{ borderColor: "var(--archive-rule)" }}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
            Admin · Gallery
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[0.95] uppercase tracking-[0.02em]">
            Reorder
          </h1>
          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-charcoal/55">
            Drag plates to set the order each gallery loads on the public site
          </p>
        </header>

        {!loaded ? (
          <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/45">
            Loading…
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProjects.map((p) => {
              const slug = gallerySlug(p);
              const hasOverride = orders.has(slug);
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setOpenSlug(slug)}
                  className="group text-left bg-white border border-charcoal/10 hover:border-charcoal/40 transition-colors"
                >
                  <div className="aspect-[4/3] bg-neutral-100 overflow-hidden">
                    <img
                      src={p.heroImage.src}
                      alt={p.heroImage.alt}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/50 truncate">
                        {p.planner}
                      </p>
                      <p className="mt-1 font-display text-lg uppercase tracking-[0.03em] truncate">
                        {p.name}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-charcoal/45">
                        {p.detailImages.length} plates
                      </p>
                    </div>
                    {hasOverride && (
                      <span className="text-[9px] uppercase tracking-[0.22em] bg-charcoal text-cream px-1.5 py-0.5 shrink-0">
                        Custom
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
