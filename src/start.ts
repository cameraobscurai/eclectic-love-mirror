import { createStart } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Global function middleware: attaches the Supabase bearer token to every
// serverFn RPC so `requireSupabaseAuth` / `requireAdmin` can validate the
// caller. Without this, admin serverFns throw 401 and the client surfaces
// "Error: [object Response]".
export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
}));
