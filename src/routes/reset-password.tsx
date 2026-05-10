import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

// Public route — handles the password recovery link from Supabase.
// User lands here from the email; we wait for the recovery session to be set,
// then let them choose a new password.
export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password · Eclectic Hive" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the recovery token in the URL hash
    // is consumed and a recovery session is established.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Also check immediately in case the event already fired.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate({ to: "/login" }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setBusy(false);
    }
  }

  const labelStyle = { fontSize: "10px", letterSpacing: "0.22em", color: "rgba(26,26,26,0.55)" } as const;
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
    <main className="min-h-screen flex items-center justify-center px-6 py-16" style={{ background: "var(--paper)", color: "#1a1a1a" }}>
      <div className="w-full max-w-sm">
        <Link to="/" className="block uppercase mb-10 text-center" style={{ fontFamily: "var(--font-sans)", letterSpacing: "0.18em", fontSize: "11px", color: "#1a1a1a", textDecoration: "none" }}>
          ECLECTIC HIVE
        </Link>
        <h1 className="uppercase text-center mb-8" style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', serif)", fontSize: "28px", fontWeight: 400, letterSpacing: "0.02em" }}>
          NEW PASSWORD
        </h1>

        {!ready ? (
          <p className="uppercase text-center" style={{ fontSize: "11px", letterSpacing: "0.18em", color: "rgba(26,26,26,0.55)" }}>
            Waiting for recovery link…
          </p>
        ) : done ? (
          <p className="uppercase text-center" style={{ fontSize: "11px", letterSpacing: "0.18em" }}>
            Password updated. Redirecting…
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block uppercase mb-2" style={labelStyle}>NEW PASSWORD</label>
              <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="block uppercase mb-2" style={labelStyle}>CONFIRM</label>
              <input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} />
            </div>
            <button type="submit" disabled={busy} className="w-full uppercase py-3 disabled:opacity-50" style={{ fontSize: "11px", letterSpacing: "0.18em", background: "#1a1a1a", color: "#ffffff", border: "none", marginTop: 8 }}>
              {busy ? "…" : "UPDATE PASSWORD"}
            </button>
          </form>
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
