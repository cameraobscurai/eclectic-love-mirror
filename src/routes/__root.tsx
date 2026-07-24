import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { DevEditOverlay } from "../components/DevEditOverlay";
import { SmoothScroll } from "../components/SmoothScroll";
import { Toaster } from "../components/ui/sonner";
import { InquiryTray } from "../components/collection/InquiryTray";
import { installServerFnAuth } from "../lib/server-fn-auth";

// Install the Supabase → server-fn Authorization bridge as early as possible
// on the client, before any route's loader / useEffect can call a guarded fn.
installServerFnAuth();

const GA_MEASUREMENT_ID = "G-6TSJ4D92PH";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

import appCss from "../styles.css?url";
import saolRegular from "../assets/fonts/SaolDisplay-Regular.woff2?url";
import saolSemibold from "../assets/fonts/SaolDisplay-Semibold.woff2?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal text-cream px-4">
      <div className="max-w-md text-center">
        <h1 className="font-brand text-7xl">404</h1>
        <h2 className="mt-4 text-xl font-brand tracking-[0.2em] uppercase">PAGE NOT FOUND</h2>
        <p className="mt-2 text-sm uppercase tracking-[0.15em] text-cream/60">
          THE PAGE YOU&apos;RE LOOKING FOR DOESN&apos;T EXIST OR HAS BEEN MOVED.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center border border-cream/30 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-cream hover:bg-cream hover:text-charcoal transition-colors"
          >
            GO HOME
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "author", content: "Eclectic Hive" },
      { name: "theme-color", content: "#1a1a1a" },
      { property: "og:site_name", content: "ECLECTIC HIVE" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/BmgCc4OLNyNSZ471TxWoDK8we002/social-images/social-1778320784967-Screenshot_2026-05-09_at_3.59.24_AM.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/BmgCc4OLNyNSZ471TxWoDK8we002/social-images/social-1778320784967-Screenshot_2026-05-09_at_3.59.24_AM.webp" },
      { name: "google-site-verification", content: "uiC6Uylte-uDMLi1vmcTQZ4b3s3Om3rnI4v-vTDl-uk" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap",
      },
      // Preload Saol so it's fetched before first paint and we never
      // flash a fallback serif. `as: "font"` + `crossOrigin: "anonymous"`
      // are required for the browser to actually use the preload.
      {
        rel: "preload",
        href: saolRegular,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: saolSemibold,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      // Inline SVG favicon (charcoal "H" mark) — avoids /favicon.ico 404s
      // without adding a binary asset to the repo.
      {
        rel: "icon",
        type: "image/svg+xml",
        href:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%231a1a1a'/%3E%3Ctext x='16' y='22' font-family='Georgia,serif' font-size='20' fill='%23f5f2ed' text-anchor='middle'%3EH%3C/text%3E%3C/svg%3E",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

// Chromium-only Speculation Rules. Tells the browser to prerender the
// most likely next route on hover/touchstart with moderate eagerness.
// Browsers without support silently ignore the script tag.
// Heavy/auth/admin paths are not listed; everything else is conservative.
// Chromium speculation rules. `conservative` (was `moderate`) — only
// prerender on actual pointerdown/touchstart, not on hover. Combined with
// TanStack's `defaultPreload: "intent"`, hover already warms the chunk +
// loader; we don't need a second full-page prerender racing on the same
// hover, which previously caused /collection (~900 tiles) to spin up on
// cursor pass and starve the active route. Legacy redirect routes are
// also excluded so we never prerender a page whose only job is to bounce.
const SPECULATION_RULES = JSON.stringify({
  prerender: [
    {
      where: {
        and: [
          { href_matches: "/*" },
          { not: { href_matches: "/admin/*" } },
          { not: { href_matches: "/api/*" } },
          { not: { href_matches: "/faq" } },
          { not: { href_matches: "/process" } },
          { not: { selector_matches: "[data-no-prefetch]" } },
        ],
      },
      eagerness: "conservative",
    },
  ],
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-charcoal">
      <head>
        <HeadContent />
        <script
          type="speculationrules"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: SPECULATION_RULES }}
        />
      </head>
      <body className="antialiased">
        {children}
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });`,
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { pathname, search, hash } = useLocation();
  const isHome = pathname === "/";
  // One QueryClient per browser session. Lazy-init so SSR doesn't share state across requests.
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));

  // Register the tile-cache service worker exactly once on the client.
  // The wrapper refuses registration in dev, iframes, Lovable preview, and
  // when ?sw=off is set — see src/lib/sw-register.ts.
  useEffect(() => {
    import("../lib/sw-register").then((m) => m.registerAppServiceWorker());
  }, []);


  // Send a GA4 page_view on every TanStack route change.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    const path = pathname + (search ? `?${new URLSearchParams(search as Record<string, string>).toString()}` : "") + (hash ?? "");
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, search, hash]);

  // Native scroll-to-top on FORWARD route change only. TanStack's
  // scrollRestoration handles back/forward — we must not override it or
  // returning from a PDP snaps to the top of /collection instead of the
  // tile the user opened. history.state.__TSR_index increments on push
  // and stays flat on pop; a ref remembers the last index we saw.
  const lastIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hash) return;
    const idx =
      (window.history.state as { __TSR_index?: number } | null)?.__TSR_index ??
      null;
    const isForward =
      lastIndexRef.current === null || idx === null || idx > lastIndexRef.current;
    lastIndexRef.current = idx;
    if (isForward) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [pathname, hash]);

  // Routes that should render as a single self-contained fold — no global
  // footer, the page owns its own bottom edge. Atelier & Gallery keep the
  // footer (long editorial scroll, footer is the natural terminus).
  // T18+T22: footer now renders on /contact and /collection too.
  // Only /faq and /privacy keep the self-contained-fold treatment.
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isSketch = pathname === "/sketch";
  const hideFooter =
    isAdmin ||
    isSketch ||
    pathname === "/faq" ||
    pathname === "/privacy" ||
    pathname === "/process";

  return (
    <QueryClientProvider client={queryClient}>
      {/* Lenis smooth-scroll disabled on /sketch — the sketch canvas owns its
          own wheel handler + inertia loop, and body overflow is hidden so
          Lenis can't scroll anything anyway. Removing it drops a 3rd RAF
          loop that was competing with the wheel-lerp and Framer schedulers. */}
      {!isSketch && !isAdmin && <SmoothScroll />}

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-charcoal focus:text-cream focus:outline-none"
      >
        Skip to main content
      </a>
      {!isAdmin && !isSketch && <Navigation />}
      <div id="devedit-canvas">
        <Outlet />
        {!hideFooter && <Footer />}
      </div>

      {!isAdmin && !isSketch && pathname !== "/contact" && <InquiryTray />}
      <DevEditOverlay />
      <Toaster />
    </QueryClientProvider>
  );
}


