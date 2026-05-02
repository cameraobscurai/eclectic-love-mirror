import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";

import appCss from "../styles.css?url";

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
        name: "description",
        content: "Seamless Site Mirror replicates a website's appearance and functionality using Supabase for data storage.",
      },
      {
        property: "og:description",
        content: "Seamless Site Mirror replicates a website's appearance and functionality using Supabase for data storage.",
      },
      {
        name: "twitter:description",
        content: "Seamless Site Mirror replicates a website's appearance and functionality using Supabase for data storage.",
      },
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
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-charcoal">
      <head>
        <HeadContent />
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
  const reduced = useReducedMotion();

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-charcoal focus:text-cream focus:outline-none"
      >
        Skip to main content
      </a>
      <Navigation />
      {/* Page transition — opacity-only crossfade. We deliberately avoid
          blur filters, y-translate, and mode="wait" here:
          • Blur forces full-layer rasterization of the entire route tree,
            which is catastrophic on /collection (876 product tiles with
            their own layout animations) and visibly janks transitions.
          • mode="wait" holds the new route until the old one fully exits,
            causing a footer jump and a visible "stuck" frame between routes.
          • y-translate fights scroll restoration on long pages.
          A short opacity fade reads as editorial polish without taxing the
          compositor or interfering with child animations. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={pathname}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      <div className={isHome ? "lg:hidden" : undefined}>
        <Footer />
      </div>
    </>
  );
}
