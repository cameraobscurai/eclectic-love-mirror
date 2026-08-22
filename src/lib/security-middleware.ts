// Global request middleware: CSRF origin checks + security headers.
//
// Why here and not `public/_headers`: Cloudflare `_headers` only applies to
// static assets. Every HTML document and every server-function response on
// this site comes out of the Worker, so `_headers` never touched them. This
// middleware runs on ALL server requests (SSR, server routes, server fns),
// which is the only place those headers can actually land.

import { createMiddleware } from "@tanstack/react-start";

/** Paths whose HTML must never be cached or indexed. */
const PRIVATE_PATH = /^\/(admin|stylebrief)(\/|$)/;

/** Public webhook/cron surface: external callers legitimately have no Origin. */
const PUBLIC_API_PATH = /^\/api\/public(\/|$)/;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * A custom `start.ts` replaces TanStack's built-in server-function CSRF
 * protection, so we re-implement it: state-changing requests must carry an
 * Origin (or Referer) on this host. `/api/public/*` is exempt — those handlers
 * authenticate callers by signature, not by browser origin.
 */
function isCrossSiteWrite(request: Request, pathname: string): boolean {
  if (SAFE_METHODS.has(request.method)) return false;
  if (PUBLIC_API_PATH.test(pathname)) return false;

  const host = request.headers.get("host");
  if (!host) return false;

  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  // No Origin and no Referer on a same-origin fetch is possible for
  // non-browser clients; those already need a bearer token to do anything.
  if (!origin) return false;

  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export const securityMiddleware = createMiddleware().server(
  async ({ next, request, pathname }) => {
    if (isCrossSiteWrite(request, pathname)) {
      return new Response("Cross-site request blocked", { status: 403 });
    }

    const result = await next();
    const headers = result.response.headers;

    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    );

    // Report-Only first: this site loads GA, Supabase storage, Google Fonts and
    // inline hydration scripts. Enforcing blind would break the page; collect
    // violations, then flip to enforcing once the report is clean.
    if (!headers.has("Content-Security-Policy-Report-Only")) {
      headers.set(
        "Content-Security-Policy-Report-Only",
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          "media-src 'self' blob: https:",
          "connect-src 'self' https: wss:",
          "frame-ancestors 'self'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      );
    }

    // Admin screens and share links: never cached by a proxy, never indexed.
    // A share token in a URL that a CDN caches is the same leak as putting it
    // in analytics.
    if (PRIVATE_PATH.test(pathname)) {
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    }

    return result;
  },
);
