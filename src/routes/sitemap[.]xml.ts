import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getCollectionCatalog } from "@/lib/phase3-catalog";

const BASE_URL = "https://eclectichive.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/atelier", changefreq: "monthly", priority: "0.8" },
  { path: "/collection", changefreq: "weekly", priority: "0.9" },
  { path: "/gallery", changefreq: "monthly", priority: "0.8" },
  { path: "/contact", changefreq: "yearly", priority: "0.6" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Pull one entry per public-ready product so every canonical
        // /collection/<slug> URL is discoverable by crawlers.
        let productEntries: SitemapEntry[] = [];
        try {
          const catalog = await getCollectionCatalog();
          productEntries = catalog.products
            .filter((p) => p.slug)
            .map((p) => ({
              path: `/collection/${p.slug}`,
              changefreq: "monthly" as const,
              priority: "0.7",
            }));
        } catch {
          // Catalog load failures shouldn't 500 the sitemap.
          productEntries = [];
        }

        const entries = [...STATIC_ENTRIES, ...productEntries];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
