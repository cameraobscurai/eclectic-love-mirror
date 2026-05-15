# Server-side 301 redirects for legacy slugs

Replace the 7 client-side `<Navigate>` redirect files with TanStack Start **server route handlers** that return a real HTTP `301 Moved Permanently` + `Location` header. This is what Google needs to consolidate the old URLs into the canonical ones.

## Why it's safe

- Ripgrep confirms **zero internal `<Link to=...>` references** to any of these slugs. They exist only as inbound URLs from Google / GBP.
- No layout impact — these files don't render any UI today (just `<Navigate>`), and they won't render any UI after.
- Sitemap, root layout, header/footer untouched.

## Slug → destination map (unchanged)

| Legacy slug       | 301 to        |
| ----------------- | ------------- |
| `/colorado-1`     | `/collection` |
| `/inventory`      | `/collection` |
| `/event-gallery`  | `/gallery`    |
| `/about`          | `/`           |
| `/the-hive`       | `/`           |
| `/the-hive3`      | `/`           |
| `/careers`        | `/`           |

## Files to rewrite

Each of these becomes a server-only route (no `component`, no `Navigate`):

- `src/routes/colorado-1.tsx`
- `src/routes/inventory.tsx`
- `src/routes/event-gallery.tsx`
- `src/routes/about.tsx`
- `src/routes/the-hive.tsx`
- `src/routes/the-hive3.tsx`
- `src/routes/careers.tsx`

## Pattern (technical)

```ts
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/colorado-1")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, {
          status: 301,
          headers: { Location: "/collection" },
        }),
    },
  },
});
```

The server handler runs before SSR, so the browser never gets HTML or JS — just a 301 + `Location` header. Crawlers treat this as canonical signal transfer.

## Verification after build

1. `curl -I https://eclectichive.com/colorado-1` → expect `HTTP/2 301` + `location: /collection`
2. Spot-check 2 more (`/about`, `/event-gallery`)
3. Once confirmed live, request reindex of the 7 URLs in Google Search Console (Inspect → Request Indexing)

## Out of scope

- The GBP listing menu links (`Colorado inventory`, `Careers`, etc.) — still need to be fixed in business.google.com once you have access. 301s help SEO consolidation but the user-visible labels in Maps come from GBP, not from your site.
