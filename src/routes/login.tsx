import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

// Sign-in / sign-up gate for the /admin* tree. Email + password only — owner
// account, no public users. After auth, redirect target comes from
// ?redirect=/admin/... (set by requireAdminOrRedirect when bouncing). New
// signups need their `admin` role granted via migration before /admin will
// load — until then they'll be bounced back here on each attempt.
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // If already signed in AND admin, bounce straight to redirect target.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: data.user.id,
        _role: "admin",
      });
      if (isAdmin && !cancelled) {
        navigate({ to: redirectTo as "/admin" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, redirectTo]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Verify admin role before redirecting.
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error("Sign-in succeeded but no session.");
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: userData.user.id,
          _role: "admin",
        });
        if (!isAdmin) {
          await supabase.auth.signOut();
          throw new Error(
            "This account is not authorized for admin access. Contact the site owner.",
          );
        }
        navigate({ to: redirectTo as "/admin" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });
        if (error) throw error;
        setInfo(
          "Account created. Check your email to confirm, then share your email with the site owner to be granted admin access.",
        );
      }
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
          {mode === "signin" ? "ADMIN SIGN IN" : "CREATE ACCOUNT"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block uppercase mb-2"
              style={{ fontSize: "10px", letterSpacing: "0.14em" }}
            >
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-charcoal/30 bg-white focus:outline-none focus:border-charcoal"
              style={{ fontSize: "14px" }}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block uppercase mb-2"
              style={{ fontSize: "10px", letterSpacing: "0.14em" }}
            >
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-charcoal/30 bg-white focus:outline-none focus:border-charcoal"
              style={{ fontSize: "14px" }}
            />
          </div>

          {error ? (
            <p
              className="uppercase"
              style={{ color: "#a83232", fontSize: "11px", letterSpacing: "0.08em" }}
            >
              {error}
            </p>
          ) : null}
          {info ? (
            <p style={{ fontSize: "12px", lineHeight: 1.5 }}>{info}</p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full uppercase py-3 bg-charcoal text-white disabled:opacity-50"
            style={{
              fontSize: "11px",
              letterSpacing: "0.18em",
              background: "#1a1a1a",
              color: "#ffffff",
            }}
          >
            {busy ? "…" : mode === "signin" ? "SIGN IN" : "SIGN UP"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setError(null);
            setInfo(null);
          }}
          className="block w-full mt-6 uppercase text-center"
          style={{
            fontSize: "10px",
            letterSpacing: "0.14em",
            color: "#1a1a1a",
            opacity: 0.7,
            background: "transparent",
            border: "none",
          }}
        >
          {mode === "signin" ? "NEED AN ACCOUNT? SIGN UP" : "HAVE AN ACCOUNT? SIGN IN"}
        </button>
      </div>
    </main>
  );
}
