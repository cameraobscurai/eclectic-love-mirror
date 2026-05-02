import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation } from "@tanstack/react-router";
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
          The page you're looking for doesn't exist or has been moved.
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
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],
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
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-charcoal focus:text-cream focus:outline-none"
      >
        Skip to main content
      </a>
      <Navigation />
      <Outlet />
      <Footer />
    </>
  );
}

