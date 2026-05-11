import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

// Sign-in gate for the /admin* tree. Supports Google OAuth + email/password.
// After signing in, the account still needs the `admin` role granted via
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

type Mode = "signin" | "signup" | "forgot";

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function checkOwnAdminRole(userId: string) {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .limit(1);
    if (error) throw error;
    return (data ?? []).length > 0;
  }

  // After auth: verify admin role; otherwise sign out and surface message.
  async function verifyAdminAndRoute() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Sign-in succeeded but no session.");
    const isAdmin = await checkOwnAdminRole(userData.user.id);
    if (!isAdmin) {
      await supabase.auth.signOut();
      throw new Error(
        "This account is not authorized for admin access. Contact the site owner.",
      );
    }
    navigate({ to: redirectTo as "/admin" });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;
      const isAdmin = await checkOwnAdminRole(data.user.id);
      if (cancelled) return;
      if (isAdmin) navigate({ to: redirectTo as "/admin" });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, redirectTo]);

  async function handleGoogle() {
    setError(null); setInfo(null); setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/login",
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      await verifyAdminAndRoute();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null); setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await verifyAdminAndRoute();
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) throw error;
        setInfo(
          "Account created. Check your email to confirm, then sign in. The site owner must grant admin access before /admin will load.",
        );
        setMode("signin");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("Password reset email sent. Check your inbox.");
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  const labelStyle = {
    fontSize: "10px",
    letterSpacing: "0.22em",
    color: "rgba(26,26,26,0.55)",
  } as const;
  const inputStyle = {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(26,26,26,0.25)",
    padding: "8px 0",
    fontSize: "14px",
    outline: "none",
    color: "#1a1a1a",
  } as const;

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-16"
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
          {mode === "signup" ? "CREATE ACCOUNT" : mode === "forgot" ? "RESET PASSWORD" : "ADMIN SIGN IN"}
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

        <div
          className="flex items-center gap-3 my-6 uppercase"
          style={{ fontSize: "10px", letterSpacing: "0.22em", color: "rgba(26,26,26,0.4)" }}
        >
          <span style={{ flex: 1, height: 1, background: "rgba(26,26,26,0.15)" }} />
          OR
          <span style={{ flex: 1, height: 1, background: "rgba(26,26,26,0.15)" }} />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-5">
          <div>
            <label className="block uppercase mb-2" style={labelStyle}>EMAIL</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label className="block uppercase mb-2" style={labelStyle}>PASSWORD</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full uppercase py-3 disabled:opacity-50"
            style={{
              fontSize: "11px",
              letterSpacing: "0.18em",
              background: "#1a1a1a",
              color: "#ffffff",
              border: "none",
              marginTop: 8,
            }}
          >
            {busy
              ? "…"
              : mode === "signup"
                ? "CREATE ACCOUNT"
                : mode === "forgot"
                  ? "SEND RESET LINK"
                  : "SIGN IN"}
          </button>
        </form>

        <div
          className="mt-6 flex items-center justify-between uppercase"
          style={{ fontSize: "10px", letterSpacing: "0.18em" }}
        >
          {mode === "signin" ? (
            <>
              <button type="button" onClick={() => { setError(null); setInfo(null); setMode("forgot"); }} style={{ color: "rgba(26,26,26,0.55)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                FORGOT PASSWORD?
              </button>
              <button type="button" onClick={() => { setError(null); setInfo(null); setMode("signup"); }} style={{ color: "#1a1a1a", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                CREATE ACCOUNT
              </button>
            </>
          ) : (
            <button type="button" onClick={() => { setError(null); setInfo(null); setMode("signin"); }} style={{ color: "rgba(26,26,26,0.7)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              ← BACK TO SIGN IN
            </button>
          )}
        </div>

        {info && (
          <p className="uppercase mt-6 text-center" style={{ color: "#1a1a1a", fontSize: "11px", letterSpacing: "0.08em", lineHeight: 1.6 }}>
            {info}
          </p>
        )}
        {error && (
          <p className="uppercase mt-6 text-center" style={{ color: "#a83232", fontSize: "11px", letterSpacing: "0.08em", lineHeight: 1.6 }}>
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
