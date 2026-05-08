import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

// Google-only sign-in gate for the /admin* tree. Owner account access only —
// after signing in, your account still needs the `admin` role granted via
// migration before /admin will load.
export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/admin",
  }),
  head: () => ({
    meta: [
      { title: "Sign in · Eclectic Hive" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in AND admin, bounce straight to redirect target.
  // If signed in but NOT admin, sign out and surface the message.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: data.user.id,
        _role: "admin",
      });
      if (cancelled) return;
      if (isAdmin) {
        navigate({ to: redirectTo as "/admin" });
      } else {
        await supabase.auth.signOut();
        setError(
          "This Google account is not authorized for admin access. Contact the site owner.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, redirectTo]);

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/login",
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      // Tokens received — verify admin role.
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sign-in succeeded but no session.");
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error(
          "This Google account is not authorized for admin access. Contact the site owner.",
        );
      }
      navigate({ to: redirectTo as "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--paper)", color: "#1a1a1a" }}
    >
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="block uppercase mb-10 text-center"
          style={{
            fontFamily: "var(--font-sans)",
            letterSpacing: "0.18em",
            fontSize: "11px",
            color: "#1a1a1a",
            textDecoration: "none",
          }}
        >
          ECLECTIC HIVE
        </Link>

        <h1
          className="uppercase text-center mb-8"
          style={{
            fontFamily: "var(--font-display, 'Cormorant Garamond', serif)",
            fontSize: "28px",
            fontWeight: 400,
            letterSpacing: "0.02em",
          }}
        >
          ADMIN SIGN IN
        </h1>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full uppercase py-3 disabled:opacity-50 flex items-center justify-center gap-3"
          style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
            background: "#1a1a1a",
            color: "#ffffff",
            border: "none",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34.9 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41 35.4 44 30.1 44 24c0-1.3-.1-2.3-.4-3.5z"/>
          </svg>
          {busy ? "…" : "CONTINUE WITH GOOGLE"}
        </button>

        {error ? (
          <p
            className="uppercase mt-6 text-center"
            style={{ color: "#a83232", fontSize: "11px", letterSpacing: "0.08em", lineHeight: 1.6 }}
          >
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
