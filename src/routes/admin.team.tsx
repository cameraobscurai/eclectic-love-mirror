import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminOrRedirect } from "@/lib/admin-guard";
import { listTeam, grantRole, revokeRole, inviteStaff } from "@/lib/team-admin.functions";

export const Route = createFileRoute("/admin/team")({
  ssr: false,
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "Team · Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <AdminShell><TeamInner /></AdminShell>,
});

type Member = {
  id: string; email: string; created_at: string;
  last_sign_in_at: string | null; roles: ("admin"|"staff"|"user")[];
};

function TeamInner() {
  const list = useServerFn(listTeam);
  const grant = useServerFn(grantRole);
  const revoke = useServerFn(revokeRole);
  const invite = useServerFn(inviteStaff);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    list().then((r) => setMembers(r as Member[])).finally(() => setLoading(false));
  };

  useEffect(refresh, [list]);

  const doInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      const r = await invite({ data: { email: inviteEmail } });
      setMsg(`Invite sent to ${r.email}`);
      setInviteEmail("");
      refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const toggle = async (userId: string, role: "staff"|"admin", has: boolean) => {
    setErr(null);
    try {
      if (has) await revoke({ data: { userId, role } });
      else await grant({ data: { userId, role } });
      refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-cream text-charcoal">
      <div className="px-6 lg:px-12 pt-8 pb-24 max-w-[1100px] mx-auto">
        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">Admin · Access</p>
          <h1 className="mt-2 font-display text-4xl uppercase tracking-[0.02em]">Team</h1>
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-charcoal/55">
            Staff can edit products, photos, orders. Admins can also manage the team.
          </p>
        </header>

        <section className="mb-10 border border-charcoal/10 p-5">
          <h2 className="text-[10px] uppercase tracking-[0.26em] text-charcoal/50 mb-3">Invite staff</h2>
          <form onSubmit={doInvite} className="flex gap-3 items-center">
            <input
              type="email" required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@eclectichive.com"
              className="flex-1 bg-transparent border-b border-charcoal/20 px-1 py-1 text-[13px] outline-none focus:border-charcoal"
            />
            <button className="border border-charcoal bg-charcoal text-cream px-4 py-1.5 text-[11px] uppercase tracking-[0.18em]">
              Send invite
            </button>
          </form>
          {msg && <p className="mt-3 text-[11px] text-green-700">{msg}</p>}
        </section>

        {err && <div className="mb-4 p-3 border border-red-300 bg-red-50 text-[12px] text-red-800">{err}</div>}

        <div className="border border-charcoal/10">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-charcoal/55 border-b border-charcoal/10">
              <tr>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Roles</th>
                <th className="text-left px-3 py-2">Last sign-in</th>
                <th className="text-right px-3 py-2 w-64">Access</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="px-3 py-10 text-center text-charcoal/40">Loading…</td></tr>}
              {!loading && members.map((m) => {
                const isAdmin = m.roles.includes("admin");
                const isStaff = m.roles.includes("staff");
                return (
                  <tr key={m.id} className="border-b border-charcoal/5">
                    <td className="px-3 py-2 font-display text-[14px]">{m.email}</td>
                    <td className="px-3 py-2">
                      {isAdmin && <span className="inline-block mr-1 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] bg-charcoal text-cream">Admin</span>}
                      {isStaff && <span className="inline-block mr-1 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] border border-charcoal/40">Staff</span>}
                      {!isAdmin && !isStaff && <span className="text-charcoal/40">—</span>}
                    </td>
                    <td className="px-3 py-2 text-charcoal/60 text-[11px] tabular-nums">
                      {m.last_sign_in_at ? new Date(m.last_sign_in_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => toggle(m.id, "staff", isStaff)}
                        disabled={isAdmin}
                        className="text-[10px] uppercase tracking-[0.16em] border border-charcoal/25 px-2 py-1 mr-2 hover:bg-charcoal/5 disabled:opacity-30"
                      >{isStaff ? "Revoke staff" : "Grant staff"}</button>
                      <button
                        onClick={() => toggle(m.id, "admin", isAdmin)}
                        className="text-[10px] uppercase tracking-[0.16em] border border-charcoal/25 px-2 py-1 hover:bg-charcoal/5"
                      >{isAdmin ? "Revoke admin" : "Grant admin"}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
