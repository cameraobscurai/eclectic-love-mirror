/**
 * Guarded service-worker registration.
 *
 * Sole purpose of this SW: runtime CacheFirst store for Supabase image-render
 * URLs (the /sketch tile grid). Registration is *refused* — and any matching
 * existing registration unregistered — in every context where a service worker
 * would cause more harm than good:
 *
 *   - dev builds (Vite HMR + SW = stale chunks + white screens)
 *   - iframes (Lovable preview embeds the app in an iframe)
 *   - Lovable preview hostnames (id-preview--*, preview--*, *.lovableproject.com,
 *     *.lovableproject-dev.com, *.beta.lovable.dev)
 *   - the ?sw=off kill-switch (support / debugging escape hatch)
 *
 * The one active registration ships from published production only.
 */

const SW_PATH = "/sw.js";

function shouldRefuse(): boolean {
  if (typeof window === "undefined") return true;
  if (!("serviceWorker" in navigator)) return true;
  if (!import.meta.env.PROD) return true;

  try {
    if (window.self !== window.top) return true;
  } catch {
    // Cross-origin frame access throws — treat as iframe.
    return true;
  }

  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") return true;

  const host = url.hostname;
  if (host.startsWith("id-preview--")) return true;
  if (host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;

  return false;
}

async function unregisterMatching() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const scriptURL = r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? "";
          return scriptURL.endsWith(SW_PATH);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    // Swallow — nothing actionable.
  }
}

/**
 * Call once from the client. Idempotent; safe under StrictMode double-invoke.
 */
export function registerAppServiceWorker() {
  if (shouldRefuse()) {
    void unregisterMatching();
    return;
  }
  // Fire and forget. Errors here don't affect the app — SW is a pure cache.
  navigator.serviceWorker.register(SW_PATH, { scope: "/" }).catch(() => {});
}
