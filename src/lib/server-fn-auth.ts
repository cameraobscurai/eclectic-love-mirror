// Attaches the current Supabase access token as a Bearer Authorization header
// to all browser fetches that target TanStack Start server functions
// (`/_serverFn/*`). Without this, server functions guarded by
// `requireSupabaseAuth` 401 because the browser fetcher does not include
// auth credentials by default.
//
// Installed once, on the client, from src/routes/__root.tsx.

import { supabase } from "@/integrations/supabase/client";

let installed = false;

export function installServerFnAuth() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url && url.includes("/_serverFn/")) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        if (!headers.has("authorization")) {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) {
            headers.set("authorization", `Bearer ${token}`);
            return originalFetch(input, { ...init, headers });
          }
        }
      }
    } catch {
      // fall through — never break the original request
    }
    return originalFetch(input, init);
  };
}
