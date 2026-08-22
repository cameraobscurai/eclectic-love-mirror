import { createStart } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { securityMiddleware } from "@/lib/security-middleware";

// Global request middleware: CSRF origin check + security headers + no-store
// on /admin and /stylebrief. A custom start.ts opts out of TanStack's built-in
// CSRF protection, so it is re-implemented in securityMiddleware.
//
// Global function middleware: attaches the Supabase bearer token to every
// serverFn RPC so `requireSupabaseAuth` / `requireAdmin` can validate the
// caller. Without this, admin serverFns throw 401 and the client surfaces
// "Error: [object Response]".
export const startInstance = createStart(() => ({
  requestMiddleware: [securityMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
