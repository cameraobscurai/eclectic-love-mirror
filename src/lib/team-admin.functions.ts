// Admin-only server functions to manage user roles (grant/revoke staff).
// Uses supabaseAdmin because listing auth.users requires service role.

import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

type Role = "admin" | "staff" | "user";

export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (usersErr) throw new Response(usersErr.message, { status: 500 });

    const { data: rolesRows, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rolesErr) throw new Response(rolesErr.message, { status: 500 });

    const byUser = new Map<string, Role[]>();
    for (const r of rolesRows ?? []) {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role as Role);
      byUser.set(r.user_id, arr);
    }

    return usersData.users
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        roles: byUser.get(u.id) ?? [],
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { userId: string; role: "staff" | "admin" }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error && !error.message.includes("duplicate")) {
      throw new Response(error.message, { status: 500 });
    }
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { userId: string; role: "staff" | "admin" }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Response("Invalid email", { status: 400 });
    }

    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
    if (error) throw new Response(error.message, { status: 500 });
    if (!invited.user) throw new Response("No user returned", { status: 500 });

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: invited.user.id, role: "staff" });
    if (roleErr && !roleErr.message.includes("duplicate")) {
      throw new Response(roleErr.message, { status: 500 });
    }
    return { ok: true, userId: invited.user.id, email };
  });
