import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { DevEditOverlay } from "../components/DevEditOverlay";
import { DotCursor } from "../components/dot-cursor";
import { useViewTransitions } from "../hooks/useViewTransitions";

import appCss from "../styles.css?url";
import saolRegular from "../assets/fonts/SaolDisplay-Regular.woff2?url";
import saolSemibold from "../assets/fonts/SaolDisplay-Semibold.woff2?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal text-cream px-4">
      <div className="max-w-md text-center">
        <h1 className="font-brand text-7xl">404</h1>
        <h2 className="mt-4 text-xl font-brand tracking-[0.2em] uppercase">Page not found</h2>
        <p className="mt-2 text-sm text-cream/60">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center border border-cream/30 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-cream hover:bg-cream hover:text-charcoal transition-colors"
          >
            Go home
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
      { title: "ECLECTIC HIVE — Luxury Event Design & Production | Denver" },
      {
        name: "description",
        content:
          "Two parts luxe, one part regal, and a dash of edge. Full-service luxury event design, custom fabrication, and furniture rentals in Denver, Colorado.",
      },
      { name: "author", content: "Eclectic Hive" },
      { name: "theme-color", content: "#1a1a1a" },
      { property: "og:site_name", content: "ECLECTIC HIVE" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "ECLECTIC HIVE — Luxury Event Design & Production | Denver" },
      { name: "twitter:title", content: "ECLECTIC HIVE — Luxury Event Design & Production | Denver" },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bc4ec964-a952-41b0-99bc-81098aab7c87/id-preview-b0b6dfc0--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app-1777699372255.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bc4ec964-a952-41b0-99bc-81098aab7c87/id-preview-b0b6dfc0--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app-1777699372255.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
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
const SPECULATION_RULES = JSON.stringify({
  prerender: [
    {
      where: {
        and: [
          { href_matches: "/*" },
          { not: { href_matches: "/admin/*" } },
          { not: { href_matches: "/api/*" } },
          { not: { selector_matches: "[data-no-prefetch]" } },
        ],
      },
      eagerness: "moderate",
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
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  // Wire native View Transitions API for crossfade between routes,
  // and the brand dot cursor on fine-pointer devices. Both no-op when
  // unsupported or when reduced-motion is requested.
  useViewTransitions();
  // Routes that should render as a single self-contained fold — no global
  // footer, the page owns its own bottom edge. Atelier & Gallery keep the
  // footer (long editorial scroll, footer is the natural terminus).
  // T18+T22: footer now renders on /contact and /collection too.
  // Only /faq and /privacy keep the self-contained-fold treatment.
  const hideFooter =
    pathname === "/faq" ||
    pathname === "/privacy" ||
    pathname === "/process";

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-charcoal focus:text-cream focus:outline-none"
      >
        Skip to main content
      </a>
      <Navigation />
      {/* No route-level transition. Per spec: navigation is instant —
          chunks and data preload on intent/viewport so the swap is silent.
          AnimatePresence around <Outlet /> forces full subtree remount and
          is catastrophic on /collection (~900 tiles). */}
      {/* DevEdit canvas wrapper — gets a transform applied only when dev mode
          is active. In production rendering it is a passive div with no
          inline styles, so layout is byte-identical. */}
      <div id="devedit-canvas">
        <Outlet />
        {!hideFooter && (
          <div className={isHome ? "lg:hidden" : undefined}>
            <Footer />
          </div>
        )}
      </div>
      <DevEditOverlay />
    </>
  );
}
